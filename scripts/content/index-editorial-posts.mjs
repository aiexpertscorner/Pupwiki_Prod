/**
 * scripts/content/index-editorial-posts.mjs
 *
 * Flips `indexInGuides: false` → `indexInGuides: true` for editorial posts that
 * meet the visibility criteria. Run with --dry-run to preview without changes.
 *
 * Flags:
 *   --dry-run   Preview changes without writing files
 *   --revert    Flip the 27 known stub slugs back to indexInGuides: false
 *
 * Criteria for forward flip — ALL must be true:
 *   - `indexInGuides` is explicitly `false`
 *   - `generated` is not `true`
 *   - `claimSensitivity` is not `'high'`
 *   - `category` is not `'PupWiki Partners'`
 *   - slug does not match blocked patterns (names, cluster, partner pages)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const GUIDES_DIR = join(__dirname, '../../src/content/guides');
const DRY_RUN = process.argv.includes('--dry-run');
const REVERT = process.argv.includes('--revert');

// Slugs confirmed as stubs (template placeholder body, not real prose).
// best-gifts-for-dog-lovers-2026 is intentionally excluded — it is real content.
const STUB_SLUGS = new Set([
  '333-rule-rescue-dog',
  'dog-chasing-cars',
  'dog-digging-carpet',
  'dog-fence-fighting',
  'dog-park-aggression',
  'hiking-with-your-dog',
  'introduce-dog-to-cat',
  'introduce-puppy-to-older-dog',
  'keep-dog-entertained-home-alone',
  'potty-train-stubborn-puppy',
  'socialize-reactive-dog',
  'stop-destructive-chewing-dogs',
  'stop-dog-begging-at-table',
  'stop-dog-digging-yard',
  'stop-dog-jumping-on-people',
  'stop-dog-leash-pulling',
  'stop-dog-nipping-kids',
  'stop-dog-window-barking',
  'stop-puppy-biting',
  'switch-dog-food-brand',
  'teach-dog-leave-it',
  'teach-dog-recall',
  'teach-dog-to-ignore-dogs',
  'top-dry-dog-food-2026',
  'why-do-dogs-hump',
  'why-do-dogs-roll-in-smelly-things',
  'why-does-my-dog-follow-me-everywhere',
]);

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

const files = readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md'));
const flipped = [];
const skipped = [];

if (REVERT) {
  // --revert mode: flip indexInGuides: true → false for the 27 stub slugs
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Reverting ${STUB_SLUGS.size} stub posts (indexInGuides: true → false):\n`);

  for (const file of files) {
    const slug = basename(file, '.md');
    if (!STUB_SLUGS.has(slug)) continue;

    const filePath = join(GUIDES_DIR, file);
    const content = readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) { skipped.push({ slug, reason: 'no frontmatter' }); continue; }

    const indexInGuides = getScalarValue(fm, 'indexInGuides');
    if (indexInGuides !== 'true') {
      skipped.push({ slug, reason: `already indexInGuides:${indexInGuides}` });
      continue;
    }

    flipped.push(slug);
    if (!DRY_RUN) {
      const updated = content.replace(/^indexInGuides: true$/m, 'indexInGuides: false');
      writeFileSync(filePath, updated, 'utf8');
    }
  }

  flipped.forEach((s) => console.log(`  ✅  ${s}`));
  if (skipped.length > 0) {
    console.log(`\nSkipped (${skipped.length}):`);
    skipped.forEach(({ slug, reason }) => console.log(`  ⏭  ${slug}  (${reason})`));
  }
  console.log(`\n${DRY_RUN ? 'Dry run complete — no files changed.' : `Done. ${flipped.length} file(s) reverted.`}`);
  process.exit(0);
}

// Forward mode: flip indexInGuides: false → true for eligible posts
for (const file of files) {
  const slug = basename(file, '.md');
  const filePath = join(GUIDES_DIR, file);
  const content = readFileSync(filePath, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) continue;

  const indexInGuides = getScalarValue(fm, 'indexInGuides');
  if (indexInGuides !== 'false') continue;

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
    const updated = content.replace(/^indexInGuides: false$/m, 'indexInGuides: true');
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
