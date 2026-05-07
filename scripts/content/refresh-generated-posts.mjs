import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildPseoCopy, getPseoFamilyFromFilename } from '../lib/pseo-copy-engine.mjs';
import {
  normalizeMonetizationIntent,
  normalizeReviewMethod,
  sanitizePublicDogCopy,
} from '../lib/public-content-contract.mjs';

const ROOT = process.cwd();
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const BREEDS_PATH = resolve(ROOT, 'src/data/master-breeds.json');
const CLUSTERS_PATH = resolve(ROOT, 'src/lib/content/contentClusterConfig.ts');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply');
const FAMILY_FILTER = getListArg('families');
const SLUG_FILTER = getListArg('slugs');
const LIMIT = Number(getArg('limit') || 0);
const REPORT_CHANGES = process.argv.includes('--report');

const breeds = existsSync(BREEDS_PATH) ? JSON.parse(readFileSync(BREEDS_PATH, 'utf8')) : [];
const breedBySlug = new Map(breeds.map((breed) => [breed.slug, breed]));

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
}

function getListArg(name) {
  const raw = getArg(name);
  return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean));
}

const FAMILY_TO_CLUSTER = {
  food: 'dog-food',
  toys: 'toys',
  beds: 'beds',
  grooming: 'grooming',
  supplements: 'supplements',
  health: 'health',
  training: 'training',
  puppy: 'puppy',
  'senior-dogs': 'senior-dogs',
  insurance: 'insurance',
};

function hash(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list, seed) {
  return list[hash(seed) % list.length];
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;
  return { raw: text.slice(start, end), body: text.slice(end + 4).replace(/^\r?\n/, '') };
}

function setYaml(raw, updates) {
  const lines = raw.split(/\r?\n/);
  const used = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!match) return line;
    const key = match[1];
    if (!(key in updates)) return line;
    used.add(key);
    return `${key}: ${updates[key]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!used.has(key)) output.push(`${key}: ${value}`);
  }
  return output.join('\n');
}

function getYamlScalar(raw, key) {
  const match = raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

function quote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function yamlList(values) {
  return `[${Array.from(new Set(values.filter(Boolean).map(String))).map(quote).join(', ')}]`;
}

function loadClusterMeta() {
  if (!existsSync(CLUSTERS_PATH)) return {};
  const text = readFileSync(CLUSTERS_PATH, 'utf8');
  const meta = {};
  const slugMatches = [...text.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((m) => m[1]).filter((slug) => slug !== 'slug');
  for (const slug of slugMatches) {
    const start = text.indexOf(`${slug}: {`) >= 0 ? text.indexOf(`${slug}: {`) : text.indexOf(`'${slug}': {`);
    const slice = start >= 0 ? text.slice(start, start + 2400) : '';
    const awin = [...slice.matchAll(/awinTopicTags:\s*\[([^\]]*)\]/g)][0]?.[1] || '';
    const amazon = [...slice.matchAll(/amazonTopicTags:\s*\[([^\]]*)\]/g)][0]?.[1] || '';
    const searches = [...slice.matchAll(/query:\s*'([^']+)'/g)].map((m) => m[1]);
    meta[slug] = {
      partnerTopicTags: [...awin.matchAll(/'([^']+)'/g)].map((m) => m[1]),
      amazonTopicTags: [...amazon.matchAll(/'([^']+)'/g)].map((m) => m[1]),
      amazonSearches: searches,
    };
  }
  return meta;
}

const clusterMeta = loadClusterMeta();

function softenBestTitle(text, familyKey, breed) {
  const name = breed?.name || 'Your Dog';
  const replacements = {
    food: `${name} Food Guide`,
    toys: `${name} Toy Guide`,
    beds: `${name} Bed Guide`,
    grooming: `${name} Grooming Guide`,
    supplements: `${name} Supplement Guide`,
  };
  let next = String(text || '')
    .replace(/^Best Dog Food for [^:]+:?\s*/i, `${replacements.food}: `)
    .replace(/^Best Food for [^:]+:?\s*/i, `${replacements.food}: `)
    .replace(/^Best [^:]+ Food for /i, `${replacements.food}: food options for `)
    .replace(/^Best Toys for [^:]+:?\s*/i, `${replacements.toys}: `)
    .replace(/^Best Beds for [^:]+:?\s*/i, `${replacements.beds}: `)
    .replace(/^Best Orthopedic Beds for /i, `${replacements.beds}: orthopedic options for `)
    .replace(/^Best Dog Beds for /i, `${replacements.beds}: dog beds for `)
    .replace(/^Best Washable Beds for /i, `${replacements.beds}: washable options for `)
    .replace(/^Best Grooming Tools for /i, `${replacements.grooming}: tools for `)
    .replace(/^Best Brushes and Shampoo for /i, `${replacements.grooming}: brushes and shampoo for `)
    .replace(/^Best Grooming Picks for /i, `${replacements.grooming}: grooming picks for `)
    .replace(/^Best Supplements for [^:]+:?\s*/i, `${replacements.supplements}: `)
    .replace(/^Best Joint Supplements for /i, `${replacements.supplements}: joint questions for `)
    .replace(/^Best Skin and Gut Supplements for /i, `${replacements.supplements}: skin and gut options for `)
    .replace(/^Best Senior Supplements for /i, `${replacements.supplements}: senior supplement questions for `);
  return next.replace(/:\s*:/g, ':').replace(/\s{2,}/g, ' ').trim();
}

function sanitizePublicCopy(text) {
  return sanitizePublicDogCopy(text);
}

function sectionHeadingFor(copy, breed) {
  const optionsByFamily = {
    food: [`How to choose food for a ${breed.name}`, `${breed.name} feeding fit checklist`, `What matters most for ${breed.name} nutrition`],
    toys: [`How to choose toys for a ${breed.name}`, `${breed.name} enrichment checklist`, `What matters most in ${breed.name} play`],
    beds: [`How to choose a bed for a ${breed.name}`, `${breed.name} sleep and comfort checklist`, `What matters most in ${breed.name} bed fit`],
    grooming: [`How to choose grooming tools for a ${breed.name}`, `${breed.name} coat-care checklist`, `What matters most in ${breed.name} grooming`],
    supplements: [`Supplement questions for ${breed.name} owners`, `${breed.name} supplement safety checklist`, `What to review before buying supplements for a ${breed.name}`],
    health: [`Health planning for ${breed.name} owners`, `${breed.name} vet-care checklist`, `What to watch and discuss with your vet`],
    training: [`How to train a ${breed.name} with daily structure`, `${breed.name} training checklist`, `What matters most in ${breed.name} training`],
  };
  return pick(optionsByFamily[copy.familyKey] || [`How to compare options for a ${breed.name}`], `${breed.slug}:${copy.familyKey}:section-heading`);
}

function readerSection(copy, breed) {
  const size = breed.size_category || 'their size';
  const energy = breed.energy_level || 'daily';
  const coat = breed.coat_type || 'coat';
  const facets = copy.facets || {};
  const heading = sectionHeadingFor(copy, breed);
  const context = [facets.bodyContext, facets.homeFit, facets.handlingNote].filter(Boolean).join(' ');
  const bulletsByFamily = {
    food: [
      `Match calories and portions to a ${size} dog with ${energy} energy rather than choosing by marketing claims alone.`,
      `Compare life-stage labels, protein source, digestibility notes, and whether the formula suits your dog's current body condition.`,
      `If you are planning for a future ${breed.name}, use food costs and feeding needs as part of your ownership budget.`,
      `For allergies, pancreatitis, kidney disease, prescription diets, or unexplained symptoms, involve your veterinarian before changing food.`,
    ],
    toys: [`Choose toys that fit jaw size, play style, and chewing intensity.`, `Rotate puzzle toys, fetch toys, and calm chewing options so enrichment does not become repetitive.`, `If you are still choosing a breed, use toy and enrichment needs to understand daily time commitment.`, `Supervise new toys first and remove damaged pieces.`],
    beds: [`Measure your dog from nose to tail base and add room for stretching, curling, and changing positions.`, `Prioritize washable covers, stable support, and non-slip placement for daily home use.`, `Future owners should treat a sleep setup as part of the first-month budget, not an afterthought.`, `For stiffness or mobility changes, discuss comfort and pain with your veterinarian.`],
    grooming: [`Match brushes and combs to the ${coat} coat instead of buying a generic kit.`, `Build a short routine around brushing, nail checks, ear checks, and bath timing.`, `If you are comparing breeds, include grooming time and service costs in the decision.`, `Ask a groomer or veterinarian about irritated skin, sores, persistent itching, or sudden coat changes.`],
    supplements: [`Treat supplements as optional support, not a replacement for diagnosis, diet, medication, or veterinary care.`, `Compare active ingredients, dose instructions, quality cues, and life-stage fit.`, `Future owners should focus first on diet, vet care, insurance timing, and daily routine before adding supplements.`, `Ask your veterinarian about interactions if your dog takes medication or has a known condition.`],
    health: [`Use breed-risk information as a planning tool, not as a diagnosis.`, `Track changes in appetite, movement, breathing, skin, stool, weight, and behavior.`, `If you are considering this breed, ask breeders, rescues, shelters, and vets about screening, insurance timing, and realistic care costs.`, `Ask about preventive care and which symptoms should be treated as urgent.`],
    training: [`Keep sessions short, repeatable, and reward-based.`, `Practice recall, leash skills, calm greetings, and settle work before harder distractions.`, `If you are choosing a first dog, compare training needs against your time, confidence, and support network.`, `For fear, reactivity, guarding, or aggression, work with a qualified positive-reinforcement professional.`],
  };
  const bullets = bulletsByFamily[copy.familyKey] || [`Compare options against size, age, routine, and health context.`, `Check current details before buying.`, `Prioritize safe, practical choices over generic claims.`];
  const intro = `${breed.name} guides are most useful when they start with the real dog or the real adoption decision: age, size, energy, coat, health context, daily routine and budget. ${context} Use this page as a comparison framework, then confirm current details on the product or service page before making a decision.`;
  return [`## ${heading}`, '', intro.replace(/\s+/g, ' ').trim(), '', ...bullets.map((item) => `- ${item}`), ''].join('\n');
}
function hasReaderSection(body, copy, breed) {
  const headings = {
    food: [`How to choose food for a ${breed.name}`, `${breed.name} feeding fit checklist`, `What matters most for ${breed.name} nutrition`],
    toys: [`How to choose toys for a ${breed.name}`, `${breed.name} enrichment checklist`, `What matters most in ${breed.name} play`],
    beds: [`How to choose a bed for a ${breed.name}`, `${breed.name} sleep and comfort checklist`, `What matters most in ${breed.name} bed fit`],
    grooming: [`How to choose grooming tools for a ${breed.name}`, `${breed.name} coat-care checklist`, `What matters most in ${breed.name} grooming`],
    supplements: [`Supplement questions for ${breed.name} owners`, `${breed.name} supplement safety checklist`, `What to review before buying supplements for a ${breed.name}`],
    health: [`Health planning for ${breed.name} owners`, `${breed.name} vet-care checklist`, `What to watch and discuss with your vet`],
    training: [`How to train a ${breed.name} with daily structure`, `${breed.name} training checklist`, `What matters most in ${breed.name} training`],
  }[copy.familyKey] || [`How to compare options for a ${breed.name}`];
  return headings.some((heading) => body.includes(`## ${heading}`));
}

function dedupeMarkdownSections(body) {
  const parts = String(body || '').split(/(?=\n?## )/);
  const seen = new Set();
  const output = [];
  for (const part of parts) {
    const normalized = part.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('## ') && seen.has(normalized)) continue;
    if (normalized.startsWith('## ')) seen.add(normalized);
    output.push(part);
  }
  return output.join('');
}

function dedupeProductSections(body) {
  // Deduplicates ### N. Product Name — Category entries across the entire body.
  // Keeps the first occurrence; removes subsequent ones with the same normalized name.
  const majorSections = String(body || '').split(/(?=\n## |\n# )/);
  return majorSections.map((section) => {
    const subParts = section.split(/(?=\n### \d+\.)/);
    const seenNames = new Set();
    return subParts.filter((sub) => {
      const m = sub.match(/\n### \d+\.\s+(.+?)(?:\s+—|\s+–|\s*\n)/);
      if (!m) return true;
      const normalized = m[1].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenNames.has(normalized)) return false;
      seenNames.add(normalized);
      return true;
    }).join('');
  }).join('');
}

function removeInternalSections(body) {
  let next = body;
  const patterns = [/## How this page was refreshed[\s\S]*?(?=\n## |\n# |$)/gi, /## Rich content plan[\s\S]*?(?=\n## |\n# |$)/gi, /## Placement rules[\s\S]*?(?=\n## |\n# |$)/gi, /## Commerce modules[\s\S]*?(?=\n## |\n# |$)/gi];
  for (const pattern of patterns) next = next.replace(pattern, '');
  next = next.replace(/^> \*\*Disclosure:\*\*.*(?:\r?\n)?/gm, '');
  next = next.replace(/This guide now separates editorial guidance from shopping modules[\s\S]*?(?=\n\n|$)/gi, '');
  return next;
}

function cleanBody(body, copy, breed) {
  let next = removeInternalSections(body);
  next = next.replace(/^\*\*\$?[\d,.]+(?:\.\d{2})? \| [^\n]+\*\*\r?\n\r?\n/gm, '');
  next = next.replace(/\| Price \|/g, '| Availability |');
  next = next.replace(/\| \$[\d,.]+(?:\.\d{2})? \|/g, '| Retailer page |');
  next = next.replace(/\[Check current price(?: on Amazon)?(?: ->| â†’)?\]/g, (label) => {
    const options = ['View current Amazon availability', 'Check Amazon.com details', 'Compare on Amazon.com', 'See current Amazon listing'];
    return `[${options[hash(`${breed.slug}:${copy.familyKey}:${label}`) % options.length]}]`;
  });
  next = next.replace(/## Quick Comparison: Best Dog Foods? for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Quick Comparison: Best Toys for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Quick Comparison: Best Beds for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Best Grooming Tools for .+/g, `## ${copy.headings.comparison}`);
  next = next.replace(/## Top Picks for .+/g, `## ${copy.headings.picks}`);
  next = next.replace(/## Why .+ Have Specific Nutrition Needs/g, `## ${copy.headings.why}`);
  next = next.replace(/## Why .+ Need Breed-Specific Toys/g, `## ${copy.headings.why}`);
  next = next.replace(/## Why .+ Need Specific Beds/g, `## ${copy.headings.why}`);
  next = next.replace(/A dog spends 12\S*14 hours a day sleeping\.[^\n]*\n?/gi, '');
  next = next.replace(/Starting with a quality orthopedic bed[^.]*prevents rather than reacts to joint issues\./gi, 'A supportive bed can be part of a comfort plan, especially for senior dogs or dogs that seem stiff after rest.');
  next = next.replace(/one of the highest-return health investments/gi, 'a practical long-use comfort purchase');
  next = next.replace(/Best lifestyle orthopedic bed[^.\n]*/gi, 'Comfort-focused supportive bed');
  next = next.replace(/Brand recognition drives gift purchases/gi, 'Recognizable brand with broad availability');
  next = next.replace(/Human mattress tech applied to dogs/gi, 'Supportive foam design made for dogs');
  next = next.replace(/directly reduces vet bills associated with joint deterioration/gi, 'may support daily comfort, but it is not a substitute for veterinary care');
  next = next.replace(/Prevention is significantly cheaper than treatment/gi, 'Preventive care is usually easier to plan than urgent care');
  next = next.replace(/Best DNA test overall[^.\n]*/gi, 'DNA test option with broad breed and health-marker coverage');
  next = next.replace(/Best OTC ear treatment[^.\n]*/gi, 'Ear-care product to discuss with your veterinarian when symptoms appear');
  next = next.replace(/### First Aid [^\n]+/gi, '### First-aid basics');
  if (!hasReaderSection(next, copy, breed)) {
    const guideSection = readerSection(copy, breed);
    const firstHeading = next.search(/\n## /);
    next = firstHeading > -1 ? `${next.slice(0, firstHeading)}\n\n${guideSection}\n${next.slice(firstHeading + 1)}` : `${guideSection}\n${next}`;
  }
  return dedupeMarkdownSections(dedupeProductSections(sanitizePublicCopy(next))).replace(/\n{2,}/g, '\n').trimStart();
}

function buildClusterTags(copy, breed) {
  const cluster = FAMILY_TO_CLUSTER[copy.familyKey] || copy.intent || copy.category.toLowerCase();
  const meta = clusterMeta[cluster] || {};
  return {
    cluster,
    tags: [copy.familyKey, cluster, copy.intent, copy.category, breed.slug, breed.name, breed.size_category, breed.energy_level, breed.training_level, breed.coat_type, ...(meta.partnerTopicTags || []), ...(meta.amazonTopicTags || [])],
    amazonQueries: meta.amazonSearches || [],
  };
}

let scanned = 0;
let changed = 0;
let written = 0;
const changeReport = [];

for (const filename of readdirSync(BLOG_DIR).filter((file) => file.endsWith('.md'))) {
  const match = getPseoFamilyFromFilename(filename);
  if (!match) continue;
  if (FAMILY_FILTER.size && !FAMILY_FILTER.has(match.familyKey)) continue;
  if (SLUG_FILTER.size && !SLUG_FILTER.has(match.breedSlug) && !SLUG_FILTER.has(filename.replace(/\.md$/, ''))) continue;
  if (LIMIT > 0 && scanned >= LIMIT) continue;
  const breed = breedBySlug.get(match.breedSlug);
  if (!breed) continue;
  scanned++;
  const path = join(BLOG_DIR, filename);
  const original = readFileSync(path, 'utf8');
  const parsed = parseFrontmatter(original);
  if (!parsed) continue;
  const rawCopy = buildPseoCopy(match.familyKey, breed);
  const copy = {
    ...rawCopy,
    seoTitle: sanitizePublicCopy(softenBestTitle(rawCopy.seoTitle, match.familyKey, breed)),
    displayTitle: sanitizePublicCopy(softenBestTitle(rawCopy.displayTitle, match.familyKey, breed)),
    description: sanitizePublicCopy(rawCopy.description),
    titlePattern: rawCopy.titlePattern,
  };
  const clusterData = buildClusterTags(copy, breed);
  const updatedYaml = setYaml(parsed.raw, {
    title: quote(copy.seoTitle),
    seoTitle: quote(copy.seoTitle),
    displayTitle: quote(copy.displayTitle),
    titlePattern: quote(copy.titlePattern),
    description: quote(copy.description),
    updatedDate: getYamlScalar(parsed.raw, 'updatedDate') || TODAY,
    category: quote(copy.category),
    postType: quote(copy.postType),
    contentTier: quote(copy.contentTier),
    cluster: quote(clusterData.cluster),
    productFamilies: yamlList([copy.familyKey, clusterData.cluster]),
    awinTopicTags: yamlList(clusterData.tags),
    amazonQueries: yamlList(clusterData.amazonQueries),
    internalLinkTargets: yamlList([`/breeds/${breed.slug}`, `/categories/${clusterData.cluster}`, '/cost-calculator', '/dog-names', '/categories/puppy', '/categories/senior-dogs', '/categories/insurance']),
    generated: 'true',
    indexInBlog: 'false',
    reviewMethod: quote(normalizeReviewMethod(copy.reviewMethod)),
    claimSensitivity: quote(copy.claimSensitivity),
    monetizationIntent: quote(normalizeMonetizationIntent(copy.monetizationIntent)),
    affiliateDisclosure: 'true',
    medicalDisclaimer: copy.medicalDisclaimer ? 'true' : 'false',
  });
  const body = cleanBody(parsed.body, copy, breed);
  const next = `---\n${updatedYaml}\n---\n\n${body}`;
  if (next !== original) {
    changed++;
    if (REPORT_CHANGES) changeReport.push({ file: filename, family: match.familyKey, breed: match.breedSlug });
    if (APPLY) {
      writeFileSync(path, next, 'utf8');
      written++;
    }
  }
}

console.log(JSON.stringify({
  apply: APPLY,
  scanned,
  changed,
  written,
  filters: {
    families: [...FAMILY_FILTER],
    slugs: [...SLUG_FILTER],
    limit: LIMIT || null,
  },
  changes: REPORT_CHANGES ? changeReport.slice(0, 250) : undefined,
}, null, 2));

