#!/usr/bin/env node
/**
 * fix-guides-frontmatter.mjs
 *
 * One-time patcher to fix monetizationIntent and postType on breed product guides
 * and other affected content. Dry-run by default; pass --apply to write changes.
 *
 * Usage:
 *   node scripts/content/fix-guides-frontmatter.mjs          # dry-run
 *   node scripts/content/fix-guides-frontmatter.mjs --apply  # write files
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const GUIDES_DIR = resolve(ROOT, 'src/content/guides');
const APPLY = process.argv.includes('--apply');

const CATEGORY_INTENT = {
  'dog food': 'food',
  'food': 'food',
  'grooming': 'grooming',
  'health': 'vet-care',
  'training': 'training',
  'gear': 'training',
  'toys': 'training',
  'supplements': 'vet-care',
  'lifestyle': 'gift',
  'smart tech': 'none',
};

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;
  return {
    raw: text.slice(start, end),
    body: text.slice(end + 4).replace(/^\r?\n/, ''),
  };
}

function getYamlValue(raw, key) {
  const match = raw.match(new RegExp(`^${key}:\\s*["\']?([^"'\n]+)["\']?`, 'm'));
  return match ? match[1].trim() : null;
}

function setYamlValue(raw, key, value) {
  const quoted = `"${value}"`;
  const lineRx = new RegExp(`^(${key}:\\s*)(.+)$`, 'm');
  if (lineRx.test(raw)) {
    return raw.replace(lineRx, `$1${quoted}`);
  }
  // Append after the last line
  return raw.trimEnd() + `\n${key}: ${quoted}`;
}

function classifyFile(filename, raw) {
  const changes = {};

  const category = (getYamlValue(raw, 'category') || '').toLowerCase();
  const postType = getYamlValue(raw, 'postType') || '';
  const currentIntent = getYamlValue(raw, 'monetizationIntent') || '';
  const currentContentTier = getYamlValue(raw, 'contentTier') || '';

  const noRoute = getYamlValue(raw, 'noRoute') === 'true';
  if (noRoute) return {}; // skip non-routable guides (names guides etc.)
  const isNamesGuide = /^names-for-/.test(filename);
  if (isNamesGuide) return {};

  const isFoodBreedGuide = /^best-dog-food-for-/.test(filename);
  const isToyBreedGuide = /^best-toy-for-/.test(filename);
  const isProductRoundup = postType === 'product-roundup' || postType === 'comparison';

  // Fix postType for breed food/toy guides
  if ((isFoodBreedGuide || isToyBreedGuide) && postType !== 'product-roundup') {
    changes.postType = 'product-roundup';
  }

  // Fix monetizationIntent
  if (currentIntent === 'none' || currentIntent === '') {
    if (isFoodBreedGuide || category === 'dog food' || category === 'food') {
      changes.monetizationIntent = 'food';
    } else if (isToyBreedGuide || category === 'toys') {
      changes.monetizationIntent = 'training';
    } else if (category === 'grooming') {
      changes.monetizationIntent = 'grooming';
    } else if (category === 'training' || category === 'gear') {
      changes.monetizationIntent = 'training';
    } else if (category === 'lifestyle') {
      changes.monetizationIntent = 'gift';
    }
  }

  // Add contentTier: "money" for product roundup/comparison guides that lack it
  if ((isProductRoundup || isFoodBreedGuide || isToyBreedGuide) && !currentContentTier) {
    changes.contentTier = 'money';
  }

  return changes;
}

const files = readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));
let changedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filepath = resolve(GUIDES_DIR, file);
  const text = readFileSync(filepath, 'utf8');
  const parsed = parseFrontmatter(text);
  if (!parsed) { skippedCount++; continue; }

  const changes = classifyFile(file.replace(/\.md$/, ''), parsed.raw);
  if (Object.keys(changes).length === 0) { skippedCount++; continue; }

  let updatedRaw = parsed.raw;
  for (const [key, value] of Object.entries(changes)) {
    updatedRaw = setYamlValue(updatedRaw, key, value);
  }

  const updatedText = `---\n${updatedRaw}\n---\n${parsed.body}`;

  console.log(`${APPLY ? 'PATCHING' : 'DRY-RUN'} ${file}:`);
  for (const [k, v] of Object.entries(changes)) console.log(`  ${k}: "${v}"`);

  if (APPLY) {
    writeFileSync(filepath, updatedText, 'utf8');
  }
  changedCount++;
}

console.log(`\nDone. Files to patch: ${changedCount}, skipped: ${skippedCount}. ${APPLY ? 'Changes written.' : 'Dry-run only — pass --apply to write.'}`);
