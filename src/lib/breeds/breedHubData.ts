/**
 * src/lib/breeds/breedHubData.ts
 *
 * Assembles all data needed by the /breeds hub page in a single typed call.
 * Replaces scattered imports and computations in src/pages/breeds/index.astro.
 */

import { getAllNormalizedBreeds } from './breedDataAdapter';
import {
  createBreedFilterOptions,
  filterBreedRecords,
  getCollectionLinks,
  QUICK_BREED_FILTERS,
  type BreedFilterOptions,
  type QuickBreedFilter,
} from './filterBreeds';
import { serializeBreedForClient, type NormalizedBreed } from './normalizeBreed';
import { buildBreedHubSeo, type BreedHubSeo } from './breedSeo';
import { buildBreedHubSchema, type BreedHubSchema } from './breedSchema';

export interface BreedHubCounts {
  total: number;
  purebred: number;
  mixed: number;
  withCostCalc: number;
  withFoodGuide: number;
  withHealthGuide: number;
}

export interface BreedHubModel {
  allBreeds: NormalizedBreed[];
  recommendedBreeds: NormalizedBreed[];
  popularBreeds: NormalizedBreed[];
  filterOptions: BreedFilterOptions;
  quickFilters: QuickBreedFilter[];
  collectionLinks: ReturnType<typeof getCollectionLinks>;
  seo: BreedHubSeo;
  schema: BreedHubSchema;
  counts: BreedHubCounts;
  clientBreedsJson: string;
}

let _cached: BreedHubModel | null = null;

export function buildBreedHubModel(siteUrl = 'https://pupwiki.com'): BreedHubModel {
  if (_cached) return _cached;

  const allBreeds = getAllNormalizedBreeds();
  const recommendedBreeds = filterBreedRecords(allBreeds, { sort: 'recommended' });
  const popularBreeds = filterBreedRecords(allBreeds, { sort: 'popular' }).slice(0, 12);
  const filterOptions = createBreedFilterOptions(allBreeds);
  const collectionLinks = getCollectionLinks();

  const counts: BreedHubCounts = {
    total: allBreeds.length,
    purebred: allBreeds.filter((b) => b.type === 'purebred').length,
    mixed: allBreeds.filter((b) => b.type === 'mixed').length,
    withCostCalc: allBreeds.filter((b) => b.guideAvailability.cost).length,
    withFoodGuide: allBreeds.filter((b) => b.guideAvailability.food).length,
    withHealthGuide: allBreeds.filter((b) => b.guideAvailability.health).length,
  };

  const seo = buildBreedHubSeo();
  const schema = buildBreedHubSchema(recommendedBreeds, siteUrl);
  const clientBreedsJson = JSON.stringify(allBreeds.map(serializeBreedForClient));

  _cached = {
    allBreeds,
    recommendedBreeds,
    popularBreeds,
    filterOptions,
    quickFilters: QUICK_BREED_FILTERS,
    collectionLinks,
    seo,
    schema,
    counts,
    clientBreedsJson,
  };

  return _cached;
}
