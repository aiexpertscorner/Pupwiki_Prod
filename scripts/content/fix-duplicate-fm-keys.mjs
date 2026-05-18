#!/usr/bin/env node
/**
 * scripts/content/fix-duplicate-fm-keys.mjs
 *
 * Scans all blog .md files for duplicate YAML frontmatter keys and repairs them.
 * Keeps the LAST occurrence of each duplicate key (most recently appended value wins).
 * Only rewrites files that actually have duplicates.
 *
 * Usage:
 *   node scripts/content/fix-duplicate-fm-keys.mjs          # dry run — reports only
 *   node scripts/content/fix-duplicate-fm-keys.mjs --apply  # write fixes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const APPLY = process.argv.includes('--apply');

function parseFm(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return { raw: text.slice(4, end), after: text.slice(end + 4) };
}

function deduplicateFm(raw) {
  const lines = raw.split(/\r?\n/);
  const seen = new Map();
  lines.forEach((line, i) => {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (m) seen.set(m[1], i);
  });
  const keepIndices = new Set(seen.values());
  const deduped = lines.filter((_, i) => {
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!m) return true;
    return keepIndices.has(i);
  });
  return deduped.join('\n');
}

function hasDuplicates(raw) {
  const keys = [...raw.matchAll(/^([A-Za-z][A-Za-z0-9_]*):/gm)].map((m) => m[1]);
  return new Set(keys).size !== keys.length;
}

const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
let fixed = 0;
let clean = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFm(text);
  if (!parsed) { clean++; continue; }

  if (!hasDuplicates(parsed.raw)) { clean++; continue; }

  const dupes = (() => {
    const keys = [...parsed.raw.matchAll(/^([A-Za-z][A-Za-z0-9_]*):/gm)].map((m) => m[1]);
    return [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  })();

  const fixed_raw = deduplicateFm(parsed.raw);
  const newContent = `---\n${fixed_raw}\n---${parsed.after}`;

  console.log(`${APPLY ? 'FIXED' : 'FOUND'} ${file} — duplicate keys: ${dupes.join(', ')}`);
  if (APPLY) fs.writeFileSync(filePath, newContent, 'utf8');
  fixed++;
}

console.log(`\nScan complete: ${fixed} file(s) with duplicate keys${APPLY ? ' (fixed)' : ' (dry run — use --apply to fix)'}, ${clean} clean.`);
if (!APPLY && fixed > 0) process.exit(1);
