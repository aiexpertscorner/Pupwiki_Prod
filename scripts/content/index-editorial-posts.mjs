/**
 * scripts/content/index-editorial-posts.mjs
 *
 * Flips `indexInBlog: false` → `indexInBlog: true` for editorial posts that
 * meet the visibility criteria. Run with --dry-run to preview without changes.
 *
 * Criteria — ALL must be true to flip:
 *   - `indexInBlog` is explicitly `false`
 *   - `generated` is not `true`
 *   - `claimSensitivity` is not `'high'`
 *   - `category` is not `'PupWiki Partners'`
 *   - slug does not match blocked patterns (names, cluster, partner pages)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BLOG_DIR = join(__dirname, '../../src/content/blog');
const DRY_RUN = process.argv.includes('--dry-run');

const BLOCKED_SLUG_PREFIXES = [
  'names-for-',
  'best-dog-food-for-',
  'best-toy-for-',
  'best-bed-for-',
  'best-groom-for-',
  'best-suppl-',
  'partner-',
];

const BLOCKED_SLUG_SUFFIXES = [
  '-health-problems',
  '-puppy-essentials',
  '-partners',
];

function isBlockedSlug(slug) {
  return (
    BLOCKED_SLUG_PREFIXES.some((p) => slug.startsWith(p)) ||
    BLOCKED_SLUG_SUFFIXES.some((s) => slug.endsWith(s))
  );
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return match[1];
}

function getScalarValue(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
const flipped = [];
const skipped = [];

for (const file of files) {
  const slug = basename(file, '.md');
  const filePath = join(BLOG_DIR, file);
  const content = readFileSync(filePath, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) continue;

  const indexInBlog = getScalarValue(fm, 'indexInBlog');
  if (indexInBlog !== 'false') continue;

  const generated = getScalarValue(fm, 'generated');
  if (generated === 'true') {
    skipped.push({ slug, reason: 'generated:true' });
    continue;
  }

  const claimSensitivity = getScalarValue(fm, 'claimSensitivity');
  if (claimSensitivity === 'high') {
    skipped.push({ slug, reason: 'claimSensitivity:high' });
    continue;
  }

  const category = getScalarValue(fm, 'category');
  if (category === 'PupWiki Partners') {
    skipped.push({ slug, reason: 'category:PupWiki Partners' });
    continue;
  }

  if (isBlockedSlug(slug)) {
    skipped.push({ slug, reason: 'blocked slug pattern' });
    continue;
  }

  flipped.push(slug);

  if (!DRY_RUN) {
    const updated = content.replace(/^indexInBlog: false$/m, 'indexInBlog: true');
    writeFileSync(filePath, updated, 'utf8');
  }
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Posts to flip (${flipped.length}):`);
flipped.forEach((s) => console.log(`  ✅  ${s}`));

if (skipped.length > 0) {
  console.log(`\nSkipped (${skipped.length}):`);
  skipped.forEach(({ slug, reason }) => console.log(`  ⏭  ${slug}  (${reason})`));
}

console.log(`\n${DRY_RUN ? 'Dry run complete — no files changed.' : `Done. ${flipped.length} file(s) updated.`}`);
