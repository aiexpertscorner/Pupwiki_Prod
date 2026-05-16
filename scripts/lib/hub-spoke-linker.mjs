/**
 * scripts/lib/hub-spoke-linker.mjs
 *
 * Builds breed-specific, content-status-aware internal link lists for pSEO pages.
 * Replaces static internalLinkTargets (same 10 URLs for every breed) with links
 * that only point to pages that actually exist for that breed.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const contentStatus = require('../../src/data/content-status.json');

const CATEGORY_HUBS = {
  food:        '/categories/dog-food',
  toys:        '/categories/toys',
  beds:        '/categories/beds',
  grooming:    '/categories/grooming',
  supplements: '/categories/supplements',
  health:      '/categories/health',
  training:    '/categories/training',
  insurance:   '/categories/insurance',
};

const CLUSTER_CROSS_LINKS = {
  food: ['supplement_post', 'health_post', 'cost_calculator'],
  toys: ['training_post', 'health_post'],
  beds: ['health_post', 'cost_calculator'],
  grooming: ['health_post'],
  supplements: ['health_post', 'cost_calculator', 'food_post'],
  health: ['cost_calculator', 'supplement_post', 'food_post'],
  training: ['toy_post'],
};

/**
 * Build contextual internal links for a breed + content cluster.
 *
 * @param {string} breedSlug - e.g. "labrador-retriever"
 * @param {string} cluster - pSEO family key e.g. "food", "beds", "grooming"
 * @param {object} [opts]
 * @param {number} [opts.maxLinks=8] - cap on returned links
 * @returns {string[]} absolute path strings
 */
export function buildBreedContextLinks(breedSlug, cluster, opts = {}) {
  const { maxLinks = 8 } = opts;
  const s = contentStatus[breedSlug] || {};
  const links = new Set();

  // Always link to breed hub if it exists
  if (s.hub) links.add(`/breeds/${breedSlug}`);

  // Always link to names page if it exists
  if (s.names_page) links.add(`/dog-names/${breedSlug}`);

  // Always link to cost calculator if it exists
  if (s.cost_calculator) links.add(`/cost-calculator/${breedSlug}`);

  // Cross-links based on cluster context
  const crossLinkKeys = CLUSTER_CROSS_LINKS[cluster] || [];
  for (const key of crossLinkKeys) {
    if (!s[key]) continue;
    if (key === 'food_post')        links.add(`/blog/best-food-for-${breedSlug}`);
    if (key === 'supplement_post')  links.add(`/blog/best-supplements-for-${breedSlug}`);
    if (key === 'health_post')      links.add(`/blog/${breedSlug}-health-problems`);
    if (key === 'training_post')    links.add(`/blog/training-a-${breedSlug}`);
    if (key === 'toy_post')         links.add(`/blog/best-toys-for-${breedSlug}`);
    if (key === 'cost_calculator')  links.add(`/cost-calculator/${breedSlug}`);
  }

  // Always add the cluster category hub
  const hub = CATEGORY_HUBS[cluster];
  if (hub) links.add(hub);

  // Standard fallback links
  links.add('/categories/pupwiki-partners');
  links.add('/disclosure');

  return [...links].slice(0, maxLinks);
}

/**
 * Return a map of all breeds that have content for a given cluster,
 * useful for bulk link building.
 *
 * @param {string} cluster
 * @returns {string[]} breed slugs
 */
export function getBreedsWithClusterContent(cluster) {
  const keyMap = {
    food:        'food_post',
    toys:        'toy_post',
    beds:        'bed_post',
    grooming:    'grooming_post',
    supplements: 'supplement_post',
    health:      'health_post',
    training:    'training_post',
  };
  const key = keyMap[cluster];
  if (!key) return Object.keys(contentStatus);
  return Object.entries(contentStatus)
    .filter(([, s]) => s[key])
    .map(([slug]) => slug);
}

// ── CLI usage: node scripts/lib/hub-spoke-linker.mjs [breedSlug] [cluster] ──
if (process.argv[1].endsWith('hub-spoke-linker.mjs')) {
  const slug = process.argv[2] || 'labrador-retriever';
  const cluster = process.argv[3] || 'food';
  const links = buildBreedContextLinks(slug, cluster);
  console.log(`Links for ${slug} (${cluster}):`);
  links.forEach(l => console.log(' ', l));
  console.log(`\nBreeds with ${cluster} content: ${getBreedsWithClusterContent(cluster).length}`);
}
