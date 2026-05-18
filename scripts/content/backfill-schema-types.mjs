#!/usr/bin/env node
/**
 * scripts/content/backfill-schema-types.mjs
 *
 * Sets schemaType frontmatter field on blog posts that don't have it,
 * based on postType.
 *
 * Rules:
 *   product-roundup | comparison → ItemList
 *   how-to                        → HowTo
 *   general | (anything else)     → Article
 *
 * Usage:
 *   node scripts/content/backfill-schema-types.mjs          # dry run
 *   node scripts/content/backfill-schema-types.mjs --apply  # write changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const APPLY = process.argv.includes('--apply');

// Valid schemaType values per config.ts: Article | FAQPage | HowTo | Review
const POST_TYPE_MAP = {
  'product-roundup': 'Article',
  comparison: 'Article',
  'how-to': 'HowTo',
};
const DEFAULT_SCHEMA = 'Article';

const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
let updated = 0, skipped = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const text = fs.readFileSync(filePath, 'utf8');

  if (!text.startsWith('---')) { skipped++; continue; }
  const fmEnd = text.indexOf('\n---', 3);
  if (fmEnd === -1) { skipped++; continue; }

  const fm = text.slice(4, fmEnd);
  const after = text.slice(fmEnd + 4);

  // Already has schemaType
  if (/^schemaType:/m.test(fm)) { skipped++; continue; }

  const ptMatch = fm.match(/^postType:\s*(.+)$/m);
  const postType = ptMatch ? ptMatch[1].trim().replace(/['"]/g, '') : '';
  const schemaType = POST_TYPE_MAP[postType] || DEFAULT_SCHEMA;

  // Insert schemaType after postType line, or at end of fm
  let newFm;
  if (ptMatch) {
    newFm = fm.replace(/^(postType:\s*.+)$/m, `$1\nschemaType: ${schemaType}`);
  } else {
    newFm = fm.trimEnd() + `\nschemaType: ${schemaType}`;
  }

  const newContent = `---\n${newFm}\n---${after}`;
  console.log(`${APPLY ? 'SET' : 'WOULD SET'} ${file} → schemaType: ${schemaType}`);
  if (APPLY) fs.writeFileSync(filePath, newContent, 'utf8');
  updated++;
}

console.log(`\nDone: ${updated} updated${APPLY ? '' : ' (dry run)'}, ${skipped} skipped (already set or no FM).`);
