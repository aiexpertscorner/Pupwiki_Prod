/**
 * Removes entries from breed-link-map.json where the referenced blog/guides
 * file does not actually exist in src/content/guides/. Without this, the
 * getCategoryBreedGuides() fallback to /breeds/[slug] never activates because
 * the entry is defined (just pointing to a 404).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const MAP_PATH = 'src/data/breed-link-map.json';
const CLUSTER_TYPES = [
  'training_post',
  'health_post',
  'supplement_post',
  'grooming_post',
  'bed_post',
  'toy_post',
  'food_post',
];

const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
let removed = 0;
let checked = 0;

for (const [breedSlug, links] of Object.entries(map)) {
  for (const type of CLUSTER_TYPES) {
    const href = links[type];
    if (!href) continue;
    checked++;

    // Resolve the slug from /blog/... or /guides/... paths
    const slug = href.replace(/^\/(blog|guides)\//, '').replace(/\/$/, '');

    if (!existsSync(`src/content/guides/${slug}.md`)) {
      delete links[type];
      removed++;
      if (process.env.VERBOSE) console.log(`  removed ${type} from ${breedSlug}: ${href}`);
    }
  }
}

writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
console.log(`Checked ${checked} entries, removed ${removed} broken cluster links from ${MAP_PATH}`);
