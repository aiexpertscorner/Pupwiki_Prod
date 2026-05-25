/**
 * src/lib/breeds/breedPageData.ts
 *
 * Assembles all data needed by the /breeds/[breed] detail page.
 * Server-only: uses node:fs for FAQ and enrichment data loading.
 * Implemented fully in Sprint 3. Types defined here for Sprint 1.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getAllNormalizedBreeds,
  getBreedBySlug,
  getHealthProfile,
  type BreedHealthProfile,
} from './breedDataAdapter';
import { getBreedDecisionSignals, type BreedDecisionSignals } from './breedSignals';
import {
  buildBreedQuickVerdict,
  buildBreedBestFor,
  buildBreedOwnerFitCards,
  type BreedVerdict,
  type BreedBestFor,
  type BreedOwnerFitCard,
} from './breedDecisionEngine';
import { buildBreedDetailSeo, type BreedDetailSeo } from './breedSeo';
import { buildBreedDetailSchema, type BreedDetailSchema } from './breedSchema';
import { getSimilarBreeds, type SimilarBreed } from './breedComparisonSuggestions';
import { buildBreedRelatedGuides, buildBreedClusterLinks, type BreedGuideLink, type BreedClusterLink } from './breedRelatedContent';
import { getBreedDataFlags, sanitizeLongevityYears, type BreedDataFlags } from './breedDataQuality';
import {
  buildBreedResourceItems,
  buildBreedPartnerClusterLinks,
  type BreedResourceItem,
  type BreedPartnerClusterLink,
} from './buildBreedResourceItems';
import { loadBreedFaq, selectBreedFaqItems } from '../faq/breedFaqLoader';
import type { NormalizedBreed } from './normalizeBreed';
import breedLinkMap from '../../data/breed-link-map.json';
import contentStatus from '../../data/content-status.json';

export interface BreedPageModel {
  breed: NormalizedBreed;
  signals: BreedDecisionSignals;
  verdict: BreedVerdict;
  bestFor: BreedBestFor;
  ownerFitCards: BreedOwnerFitCard[];
  seo: BreedDetailSeo;
  schema: BreedDetailSchema;
  dataFlags: BreedDataFlags;
  healthProfile: BreedHealthProfile | null;
  enrichmentData: any | null;
  faqItems: { q: string; a: string }[];
  similarBreeds: SimilarBreed[];
  relatedGuides: BreedGuideLink[];
  clusterLinks: BreedClusterLink[];
  resourceItems: BreedResourceItem[];
  partnerClusterLinks: BreedPartnerClusterLink[];
  links: Record<string, string | undefined | null>;
  safeLifespanYears: number | null;
}

export function buildBreedPageModel(
  slug: string,
  siteUrl = 'https://pupwiki.com',
): BreedPageModel | null {
  const breed = getBreedBySlug(slug);
  if (!breed) return null;

  const raw = breed.raw;
  const links = (breedLinkMap as any)[slug] || {};
  const status = (contentStatus as any)[slug] || {};

  const signals = getBreedDecisionSignals(breed);
  const verdict = buildBreedQuickVerdict(breed, signals);
  const bestFor = buildBreedBestFor(breed, signals);
  const ownerFitCards = buildBreedOwnerFitCards(breed, signals);
  const seo = buildBreedDetailSeo(breed);
  const dataFlags = getBreedDataFlags(raw);
  const safeLifespanYears = sanitizeLongevityYears(raw);

  const healthProfile = getHealthProfile(slug);

  // Enrichment data (optional, build-time only)
  let enrichmentData: any = null;
  try {
    const enrichmentPath = join(process.cwd(), 'src/data/enrichment/breeds', `${slug}.json`);
    if (existsSync(enrichmentPath)) {
      enrichmentData = JSON.parse(readFileSync(enrichmentPath, 'utf8'));
    }
  } catch {
    // Enrichment data is optional
  }

  // FAQ items (visible on page, used for schema)
  const faqData = loadBreedFaq(slug);
  const faqItems = selectBreedFaqItems(faqData, breed, healthProfile, signals);

  const schema = buildBreedDetailSchema(breed, faqItems, siteUrl);

  const allBreeds = getAllNormalizedBreeds();
  const similarBreeds = getSimilarBreeds(breed, allBreeds, 5);
  const relatedGuides = buildBreedRelatedGuides(breed);
  const clusterLinks = buildBreedClusterLinks(breed, links);
  const resourceItems = buildBreedResourceItems(raw, links, status);
  const partnerClusterLinks = buildBreedPartnerClusterLinks(raw);

  return {
    breed,
    signals,
    verdict,
    bestFor,
    ownerFitCards,
    seo,
    schema,
    dataFlags,
    healthProfile,
    enrichmentData,
    faqItems,
    similarBreeds,
    relatedGuides,
    clusterLinks,
    resourceItems,
    partnerClusterLinks,
    links,
    safeLifespanYears,
  };
}
