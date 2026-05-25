/**
 * src/lib/breeds/breedSchema.ts
 *
 * JSON-LD schema builders for breed pages.
 * FAQPage schema ONLY includes items that are visibly rendered on the page.
 */

import type { NormalizedBreed } from './normalizeBreed';

const SITE = 'https://pupwiki.com';

export interface BreedDetailSchema {
  articleLd: string;
  breadcrumbLd: string;
  faqLd: string | null;
}

export interface BreedHubSchema {
  collectionLd: string;
  breadcrumbLd: string;
  itemListLd: string;
}

export function buildBreedDetailSchema(
  breed: NormalizedBreed,
  /** Only the FAQ items that are visibly rendered on the page */
  visibleFaqItems: { q: string; a: string }[],
  siteUrl: string = SITE,
): BreedDetailSchema {
  const pageUrl = `${siteUrl}/breeds/${breed.slug}`;

  const articleLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${breed.name} Dog Breed Guide — Traits, Care, Costs and Owner Fit`,
    description: breed.description || `Complete ${breed.name} guide for prospective owners.`,
    image: breed.primaryImage || undefined,
    author: { '@type': 'Organization', name: 'PupWiki' },
    publisher: { '@type': 'Organization', name: 'PupWiki', url: siteUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  });

  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Breeds', item: `${siteUrl}/breeds` },
      { '@type': 'ListItem', position: 3, name: breed.name, item: pageUrl },
    ],
  });

  const faqLd =
    visibleFaqItems.length > 0
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: visibleFaqItems.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        })
      : null;

  return { articleLd, breadcrumbLd, faqLd };
}

export function buildBreedHubSchema(
  breeds: NormalizedBreed[],
  siteUrl: string = SITE,
): BreedHubSchema {
  const hubUrl = `${siteUrl}/breeds`;
  const featured = breeds.slice(0, 20);

  const collectionLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Dog Breed Directory',
    description: 'Browse and compare dog breeds by traits, size, energy and care needs.',
    url: hubUrl,
    hasPart: featured.map((b, i) => ({
      '@type': 'Article',
      position: i + 1,
      name: `${b.name} Breed Guide`,
      url: `${siteUrl}/breeds/${b.slug}`,
    })),
  });

  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Breeds', item: hubUrl },
    ],
  });

  const itemListLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Dog Breed Directory — ${breeds.length} Breeds`,
    description: 'PupWiki dog breed finder with filters for size, energy, shedding, coat, trainability, lifespan and owner resources.',
    numberOfItems: breeds.length,
    itemListElement: featured.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      url: `${siteUrl}/breeds/${b.slug}`,
    })),
  });

  return { collectionLd, breadcrumbLd, itemListLd };
}
