/**
 * src/lib/breeds/breedSeo.ts
 *
 * SEO title and description builders for breed hub and detail pages.
 * Copy follows the PupWiki spec: hedged, informational, no superlative claims.
 */

import type { NormalizedBreed } from './normalizeBreed';

export interface BreedDetailSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
}

export interface BreedHubSeo {
  title: string;
  description: string;
}

const SITE = 'https://pupwiki.com';

export function buildBreedHubSeo(): BreedHubSeo {
  return {
    title: 'Dog Breed Directory: Find, Compare and Plan by Breed | PupWiki',
    description:
      'Browse dog breed and mixed-breed guides by size, energy, shedding, trainability, care needs and ownership planning. Compare breeds, estimate costs and find your fit with PupWiki.',
  };
}

export function buildBreedDetailSeo(breed: NormalizedBreed): BreedDetailSeo {
  // Never use breed.raw.seo.title — data field contains banned terms ("best products" etc.)
  const title = `${breed.name} Dog Breed Guide — Traits, Care, Costs and Owner Fit | PupWiki`;

  const description = `Learn about the ${breed.name}: size, energy, grooming, trainability, health context, ownership costs and owner fit. Compare breeds and estimate costs with PupWiki.`;

  return {
    title,
    description,
    canonicalUrl: `${SITE}/breeds/${breed.slug}`,
    ogImage: breed.primaryImage || '',
  };
}
