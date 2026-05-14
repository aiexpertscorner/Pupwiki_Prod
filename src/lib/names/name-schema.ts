/**
 * src/lib/names/name-schema.ts
 * Structured data builders for PupWiki dog name pages.
 */

import { SITE_NAME, SITE_URL } from '../site-config';
import type { BreedNamePageData, DogNamesIndexData, NameFaqItem } from './name-types';

export function buildFaqJsonLd(items: NameFaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildDogNamesIndexJsonLd(data: DogNamesIndexData) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Dog Names by Breed',
      description: `Browse dog name ideas across ${data.stats.breedCount} breed guides and ${data.stats.nameCount}+ name entries.`,
      url: `${SITE_URL}/dog-names`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Featured dog breed name guides',
      itemListElement: data.featuredBreeds.slice(0, 12).map((breed, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${breed.name} names`,
        url: `${SITE_URL}/dog-names/${breed.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Dog Names' },
      ],
    },
  ];
}

export function buildBreedNamePageJsonLd(data: BreedNamePageData) {
  const breed = data.breed;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${breed.name} Names`,
      description: `Breed-aware dog name ideas for ${breed.name}s, including boy names, girl names, style themes, and naming tips.`,
      url: `${SITE_URL}/dog-names/${breed.slug}`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Top ${breed.name} names`,
      itemListElement: data.topNames.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
      })),
    },
    buildFaqJsonLd(data.faqs),
  ];
}
