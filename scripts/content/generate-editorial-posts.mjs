/**
 * generate-editorial-posts.mjs
 *
 * Processes src/data/editorial-content-pipeline.json:
 *   has_content: true  → imports pre-written MD from source dir, strips citations, adds frontmatter
 *   has_content: false → generates a structured scaffold with frontmatter + section outline
 *
 * Usage:
 *   node scripts/content/generate-editorial-posts.mjs            # dry-run (shows what would be written)
 *   node scripts/content/generate-editorial-posts.mjs --apply    # write to src/content/guides/
 *   node scripts/content/generate-editorial-posts.mjs --apply --only-existing
 *   node scripts/content/generate-editorial-posts.mjs --apply --only-scaffold
 *   node scripts/content/generate-editorial-posts.mjs --apply --force   # overwrite existing files
 *   node scripts/content/generate-editorial-posts.mjs --apply --limit=5
 *   node scripts/content/generate-editorial-posts.mjs --apply --slug=stop-dog-resource-guarding
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Default source directory for pre-written MD files — override with SOURCE_DIR env var
const SOURCE_DIR = process.env.SOURCE_DIR || path.join(REPO_ROOT, 'scripts', 'content', 'editorial-source');
const OUTPUT_DIR = path.join(REPO_ROOT, 'src', 'content', 'guides');
const PIPELINE_FILE = path.join(REPO_ROOT, 'src', 'data', 'editorial-content-pipeline.json');
const PUB_DATE = '2026-05-14';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const ONLY_EXISTING = args.includes('--only-existing');
const ONLY_SCAFFOLD = args.includes('--only-scaffold');
const LIMIT = (() => { const m = args.find(a => a.startsWith('--limit=')); return m ? parseInt(m.split('=')[1]) : Infinity; })();
const SLUG_FILTER = (() => { const m = args.find(a => a.startsWith('--slug=')); return m ? m.split('=')[1] : null; })();

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapPostType(contentType) {
  const t = (contentType || '').toLowerCase();
  if (/how-to|step-by-step|puppy.*guide|ultimate guide|training guide/.test(t)) return 'how-to';
  if (/buying guide|selection framework|gear guide/.test(t)) return 'product-roundup';
  if (/vet-informed|health guide|seasonal safety/.test(t)) return 'health';
  return 'general';
}

function mapSchemaType(contentType) {
  const t = (contentType || '').toLowerCase();
  if (/how-to|step-by-step|training guide|puppy.*guide|ultimate guide/.test(t)) return 'HowTo';
  return 'Article';
}

function mapMonetizationIntent(cluster, category) {
  const s = `${cluster} ${category}`.toLowerCase();
  if (/food|nutrition|diet|poop|stomach|picky|raw|toxic|allergies|transition/.test(s)) return 'food';
  if (/training|recall|leash|jumping|biting|crate|impulse|greeting|adult dog|rescue|neutrality/.test(s)) return 'training';
  if (/grooming/.test(s)) return 'grooming';
  if (/anxiety|aggression|fear|compulsive|body language|separation/.test(s)) return 'training';
  if (/health|vet/.test(s)) return 'vet-care';
  return 'none';
}

function mapClaimSensitivity(priority, complianceNote) {
  if (/YMYL/i.test(complianceNote)) return 'high';
  if (priority === 'Very High') return 'medium';
  return 'low';
}

function needsMedicalDisclaimer(complianceNote) {
  return /YMYL|toxin|emergency|poison control|sudden.*vet|vet.*sudden|medical/i.test(complianceNote);
}

function buildDescription(topic) {
  // Build a 140-160 char meta description from available fields
  const keyword = topic.primary_keyword;
  const eeat = topic.eeat_angle.replace(/[.,].*$/, ''); // take first clause only
  const raw = `${topic.post_title}. ${eeat}. Expert guidance for every dog owner.`;
  return raw.length > 160 ? raw.slice(0, 157) + '...' : raw;
}

// ─── Frontmatter serializer ───────────────────────────────────────────────────

function yamlStr(val) {
  if (typeof val !== 'string') return String(val);
  // Wrap in double quotes if the string contains YAML-special chars
  if (/[:#{}\[\],&*!|>'"%@`]/.test(val) || val.includes('\n') || val.startsWith(' ') || val.endsWith(' ')) {
    return `"${val.replace(/"/g, '\\"')}"`;
  }
  return val;
}

function serializeFrontmatter(obj) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of val) lines.push(`  - ${yamlStr(item)}`);
      }
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: ${yamlStr(String(val))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function buildFrontmatter(topic) {
  return {
    title: topic.post_title,
    description: buildDescription(topic),
    pubDate: PUB_DATE,
    author: 'The PupWiki Team',
    category: topic.category,
    tags: [topic.primary_keyword, ...topic.secondary_keywords.slice(0, 3)],
    postType: mapPostType(topic.content_type),
    schemaType: mapSchemaType(topic.content_type),
    contentTier: 'editorial',
    indexInGuides: true,
    generated: false,
    reviewMethod: 'editorial-research',
    claimSensitivity: mapClaimSensitivity(topic.priority, topic.compliance_note),
    monetizationIntent: mapMonetizationIntent(topic.cluster, topic.category),
    medicalDisclaimer: needsMedicalDisclaimer(topic.compliance_note),
    affiliateDisclosure: true,
    uniqueBlocks: [],
  };
}

// ─── Citation stripper ────────────────────────────────────────────────────────

function stripCitations(text) {
  // Remove AI citation markers like 【123456789†L10-L50】
  // Use 】 (U+3011) as the boundary character — greedy ASCII \] would swallow
  // all text between consecutive citations on the same line.
  return text.replace(/【[^】]*】/g, '').replace(/[ \t]{2,}/g, ' ');
}

function extractBodyFromMd(raw) {
  // Strip the H1 title line (first non-empty line starting with #)
  const lines = raw.split('\n');
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) { bodyStart = i + 1; break; }
  }
  // Skip any blank lines immediately after the H1
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  return lines.slice(bodyStart).join('\n').trimEnd();
}

// ─── Source file locator ──────────────────────────────────────────────────────

function findSourceFile(topic) {
  if (!fs.existsSync(SOURCE_DIR)) return null;
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.md'));
  // Match by zero-padded id prefix: "01-", "02-", etc.
  const prefix = String(topic.id).padStart(2, '0') + '-';
  const match = files.find(f => f.startsWith(prefix));
  return match ? path.join(SOURCE_DIR, match) : null;
}

// ─── Scaffold builder ─────────────────────────────────────────────────────────

function buildProductsTable(topic) {
  if (!topic.products || topic.products.length === 0) return '';
  const rows = topic.products.map(p => `| **${p}** | See Amazon search: \`${topic.amazon_search_queries[topic.products.indexOf(p)] || p}\` |`);
  return `## Recommended Products

| Product | Notes |
| --- | --- |
${rows.join('\n')}

> **Affiliate disclosure:** Links on this page may be affiliate links. PupWiki earns a commission at no extra cost to you.`;
}

function buildInternalLinksSection(topic) {
  if (!topic.internal_links || topic.internal_links.length === 0) return '';
  const links = topic.internal_links.map(l => `- [${l.split('/').pop().replace(/-/g, ' ')}](${l})`);
  return `## Further Reading\n\n${links.join('\n')}`;
}

function buildComplianceNote(topic) {
  if (!topic.compliance_note) return '';
  return `> **Note:** ${topic.compliance_note}`;
}

function buildScaffoldBody(topic) {
  const t = (topic.content_type || '').toLowerCase();
  const keyword = topic.primary_keyword;
  const eeat = topic.eeat_angle;

  // Intro paragraph
  const intro = `Understanding ${keyword} starts with knowing what drives the behaviour. ${eeat}. This guide covers the root causes, practical steps and products that help.`;

  const complianceBlock = buildComplianceNote(topic);
  const productsBlock = buildProductsTable(topic);
  const linksBlock = buildInternalLinksSection(topic);

  let sections = '';

  if (/how-to|step-by-step|training guide|puppy.*guide|ultimate guide/.test(t)) {
    sections = `
## Understanding the Problem

${complianceBlock}

*[Explain why this behaviour happens, what drives it and what to expect during the training process.]*

## What You'll Need

*[List tools, products and preparation steps before starting. Reference the recommended products below.]*

## Step-by-Step Guide

### Step 1: Foundation
*[Describe the first phase — typically management, observation or building a baseline.]*

### Step 2: Training Protocol
*[Core technique — positive reinforcement, desensitisation, counter-conditioning, etc.]*

### Step 3: Proofing and Generalisation
*[Apply the skill across different locations, distractions and people.]*

## Common Mistakes to Avoid

*[3-5 mistakes owners make, tied to the compliance_note for safety-related pitfalls.]*

${productsBlock}

## When to Get Professional Help

*[Clear escalation criteria: bite history, severity, sudden onset, failed home training.]*

${linksBlock}

## Key Takeaways

*[3-5 bullet point summary of the most important points.]*`;
  } else if (/buying guide|selection framework|gear guide/.test(t)) {
    sections = `
## What to Look For

*[Framework: ingredient/spec criteria, certifications, life stage, size/breed considerations.]*

${complianceBlock}

## Top Picks for ${topic.cluster}

*[Brief recommendation table. Use the product list below as a starting point.]*

${productsBlock}

## Budget vs Premium: Is It Worth Spending More?

*[Honest comparison of value tiers.]*

## Common Questions

*[3-5 FAQs using the secondary_keywords as a guide.]*

${linksBlock}`;
  } else if (/vet-informed|safety reference|safety guide|seasonal safety/.test(t)) {
    sections = `
## Why This Matters

${complianceBlock}

*[Explain the risk, severity range and how common this issue is.]*

## Signs to Watch For

*[Symptom list or warning signals, escalating from mild to serious.]*

## What You Can Do

*[Actionable steps in order of priority. Emergency steps first for YMYL topics.]*

${productsBlock}

## When to See a Vet

*[Clear criteria: rule-of-thumb timeline, red flags, emergency situations.]*

${linksBlock}

## Quick Reference

*[Summary box: 3-5 bullet points for scan-readers.]*`;
  } else {
    // Default: explainer / authority guide / general
    sections = `
## The Most Common Reasons

${complianceBlock}

*[Explain the root causes in priority order. Ground every claim in breed trait or behaviour science.]*

## How to Tell the Difference

*[Help owners distinguish between variations, e.g. normal vs problematic, playful vs aggressive, learned vs instinctive.]*

## What You Should Do

*[Practical response strategies matched to the most common scenarios.]*

${productsBlock}

${linksBlock}

## Key Takeaways

*[3-5 bullet point summary.]*`;
  }

  return `${intro}\n${sections}`;
}

// ─── Post builder ─────────────────────────────────────────────────────────────

function buildPost(topic, sourceContent) {
  const fm = serializeFrontmatter(buildFrontmatter(topic));

  let body;
  if (sourceContent !== null) {
    const raw = fs.readFileSync(sourceContent, 'utf8');
    const stripped = stripCitations(raw);
    body = extractBodyFromMd(stripped);
  } else {
    body = buildScaffoldBody(topic);
  }

  return `${fm}\n\n${body}\n`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
const topics = pipeline.topics;

let processed = 0;
let written = 0;
let skipped = 0;
const results = { imported: [], scaffolded: [], skipped: [] };

for (const topic of topics) {
  if (SLUG_FILTER && topic.slug !== SLUG_FILTER) continue;
  if (ONLY_EXISTING && !topic.has_content) continue;
  if (ONLY_SCAFFOLD && topic.has_content) continue;
  if (processed >= LIMIT) break;

  const outFile = path.join(OUTPUT_DIR, `${topic.slug}.md`);
  const exists = fs.existsSync(outFile);

  if (exists && !FORCE) {
    skipped++;
    results.skipped.push(topic.slug);
    continue;
  }

  const sourceFile = topic.has_content ? findSourceFile(topic) : null;
  const content = buildPost(topic, sourceFile);
  const type = sourceFile ? 'import' : 'scaffold';

  if (APPLY) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outFile, content, 'utf8');
    if (type === 'import') results.imported.push(topic.slug);
    else results.scaffolded.push(topic.slug);
    written++;
  } else {
    // Dry run: show what would be written
    const preview = content.split('\n').slice(0, 12).join('\n');
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${type.toUpperCase()}] ${topic.slug}`);
    console.log(preview);
    console.log('...');
    if (type === 'import') results.imported.push(topic.slug);
    else results.scaffolded.push(topic.slug);
  }

  processed++;
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Editorial post generator — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`${'─'.repeat(60)}`);
console.log(`  Imported (pre-written):  ${results.imported.length}`);
console.log(`  Scaffolded (new):        ${results.scaffolded.length}`);
console.log(`  Skipped (already exist): ${results.skipped.length}`);
console.log(`  Total processed:         ${processed}`);
if (!APPLY) {
  console.log(`\nRun with --apply to write files.`);
}
if (results.skipped.length > 0 && !FORCE) {
  console.log(`\nUse --force to overwrite ${results.skipped.length} existing file(s).`);
}
console.log(`${'═'.repeat(60)}\n`);
