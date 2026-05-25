/**
 * src/lib/breeds/breedRelatedContent.ts
 *
 * Builds related guides and cluster links for breed detail pages.
 */

import type { NormalizedBreed } from './normalizeBreed';

export interface BreedGuideLink {
  href: string;
  label: string;
  desc: string;
  tag: string;
}

export interface BreedClusterLink {
  key: string;
  href: string;
  label: string;
}

const PARTNER_GUIDES: BreedGuideLink[] = [
  {
    href: '/guides/dog-food-nutrition-partners',
    label: 'Dog food, broth and nutrition partners',
    desc: 'Compare current PupWiki partner coverage for food, broth, fresh prep and nutrition resources.',
    tag: 'Partners',
  },
  {
    href: '/guides/dog-training-gear-safety-partners',
    label: 'Training, walking and safety partners',
    desc: 'Harnesses, recall, containment and activity gear mapped to owner intent.',
    tag: 'Training',
  },
  {
    href: '/guides/personalized-dog-gifts-lifestyle-partners',
    label: 'Personalized dog gifts and lifestyle resources',
    desc: 'Custom portraits, memorials, ID-style resources and breed-inspired gifts.',
    tag: 'Lifestyle',
  },
];

export function buildBreedRelatedGuides(breed: NormalizedBreed): BreedGuideLink[] {
  const guides: BreedGuideLink[] = [...PARTNER_GUIDES];

  if (breed.guideAvailability.health) {
    guides.unshift({
      href: breed.guideLinks.find((l) => l.key === 'health')?.href ?? `/categories/health`,
      label: `${breed.name} health guide`,
      desc: `General health context, common conditions, and care questions for ${breed.name} owners.`,
      tag: 'Health',
    });
  }

  if (breed.guideAvailability.food) {
    guides.unshift({
      href: breed.guideLinks.find((l) => l.key === 'food')?.href ?? `/categories/dog-food`,
      label: `${breed.name} food and nutrition guide`,
      desc: `Feeding recommendations, food questions and nutrition resources for ${breed.name}s.`,
      tag: 'Food',
    });
  }

  return guides.slice(0, 5);
}

export function buildBreedClusterLinks(
  breed: NormalizedBreed,
  links: Record<string, string | undefined | null> = {},
): BreedClusterLink[] {
  const base = `/breeds/${breed.slug}`;

  return [
    { key: 'food_post',       href: String(links.food_post       ?? `${base}/food`),       label: `${breed.name} food and nutrition guide` },
    { key: 'training_post',   href: String(links.training_post   ?? `${base}/training`),   label: `${breed.name} training guide` },
    { key: 'health_post',     href: String(links.health_post     ?? `${base}/health`),     label: `${breed.name} health concerns` },
    { key: 'grooming_post',   href: String(links.grooming_post   ?? `${base}/grooming`),   label: `${breed.name} grooming guide` },
    { key: 'bed_post',        href: String(links.bed_post        ?? `${base}/beds`),       label: `${breed.name} bed and sleep guide` },
    { key: 'toy_post',        href: String(links.toy_post        ?? `${base}/toys`),       label: `${breed.name} toys and enrichment` },
    { key: 'supplement_post', href: String(links.supplement_post ?? `${base}/supplements`),label: `${breed.name} supplement guide` },
    { key: 'names_page',      href: String(links.names_page      ?? `/dog-names/${breed.slug}`), label: `${breed.name} names` },
    { key: 'puppy_post',      href: String(links.puppy_post      ?? `${base}/puppy`),      label: `${breed.name} puppy guide` },
  ];
}
