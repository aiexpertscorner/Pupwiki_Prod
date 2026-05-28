/**
 * Removes generated markdown files from src/content/guides/ before fresh regeneration.
 * Only deletes files that have `generated: true` in their frontmatter.
 * Safe to run in CI — never touches manually-written editorial content.
 *
 * Flags:
 *   --dry-run   List files to be deleted without deleting
 *   --ci        Delete without interactive prompt
 *   --verbose   Print each deleted file path
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const GUIDES_DIR = resolve(ROOT, 'src/content/guides');

const DRY_RUN = process.argv.includes('--dry-run');
const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

function isGenerated(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    // Only scan the frontmatter block (first 60 lines is more than enough)
    const lines = content.split('\n').slice(0, 60).join('\n');
    return /^generated:\s*true\s*$/m.test(lines);
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(GUIDES_DIR)) {
    console.log('[clean-generated] No guides directory found — nothing to clean.');
    process.exit(0);
  }

  const files = readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md'));
  const toDelete = files.filter((f) => isGenerated(join(GUIDES_DIR, f)));

  console.log(`[clean-generated] Found ${files.length} total posts, ${toDelete.length} are generated.`);

  if (toDelete.length === 0) {
    console.log('[clean-generated] Nothing to remove.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('[clean-generated] DRY RUN — files that would be deleted:');
    toDelete.forEach((f) => console.log(`  ${f}`));
    console.log(`[clean-generated] ${toDelete.length} files would be removed.`);
    process.exit(0);
  }

  if (!CI) {
    // Non-CI, non-dry-run: require explicit flag confirmation
    console.error(
      '[clean-generated] Pass --ci to delete in non-interactive mode, or --dry-run to preview.'
    );
    process.exit(1);
  }

  let deleted = 0;
  let errors = 0;

  for (const f of toDelete) {
    const fullPath = join(GUIDES_DIR, f);
    try {
      rmSync(fullPath);
      deleted++;
      if (VERBOSE) console.log(`  deleted: ${f}`);
    } catch (err) {
      console.warn(`[clean-generated] Warning: could not delete ${f} — ${err.message}`);
      errors++;
    }
  }

  console.log(`[clean-generated] Done. Deleted ${deleted} generated posts. (${errors} errors)`);
  // Always exit 0 — cleanup failure should not block the deploy
  process.exit(0);
}

main();
