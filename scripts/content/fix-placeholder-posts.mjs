#!/usr/bin/env node
/**
 * scripts/content/fix-placeholder-posts.mjs
 *
 * Finds guide posts with unfilled template placeholders (*[...]*) and sets
 * indexInGuides: false so they don't appear in search results or hub pages.
 *
 * Usage:
 *   node scripts/content/fix-placeholder-posts.mjs          # dry run
 *   node scripts/content/fix-placeholder-posts.mjs --apply  # write changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GUIDES_DIR = path.join(ROOT, 'src', 'content', 'guides');
const APPLY = process.argv.includes('--apply');

const files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md'));
let fixed = 0, alreadyHidden = 0, clean = 0;

for (const file of files) {
  const filePath = path.join(GUIDES_DIR, file);
  const text = fs.readFileSync(filePath, 'utf8');

  if (!/\*\[/.test(text)) { clean++; continue; }

  // Parse frontmatter
  if (!text.startsWith('---')) { clean++; continue; }
  const fmEnd = text.indexOf('\n---', 3);
  if (fmEnd === -1) { clean++; continue; }

  const fm = text.slice(4, fmEnd);
  const after = text.slice(fmEnd + 4);

  // Already hidden — nothing to do
  if (/^indexInGuides:\s*false$/m.test(fm)) { alreadyHidden++; continue; }

  // Set indexInGuides: false
  let newFm;
  if (/^indexInGuides:/m.test(fm)) {
    newFm = fm.replace(/^indexInGuides:\s*.+$/m, 'indexInGuides: false');
  } else {
    // Append after pubDate line or at end of frontmatter
    newFm = fm.trimEnd() + '\nindexInGuides: false';
  }

  const newContent = `---\n${newFm}\n---${after}`;
  console.log(`${APPLY ? 'FIXED' : 'WOULD FIX'} ${file}`);
  if (APPLY) fs.writeFileSync(filePath, newContent, 'utf8');
  fixed++;
}

console.log(`\nDone: ${fixed} hidden${APPLY ? '' : ' (dry run)'}, ${alreadyHidden} already hidden, ${clean} clean.`);
if (!APPLY && fixed > 0) process.exit(1);
