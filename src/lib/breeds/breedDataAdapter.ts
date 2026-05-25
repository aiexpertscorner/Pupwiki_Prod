/**
 * src/lib/breeds/breedDataAdapter.ts
 *
 * Single source of truth for normalized breed data.
 * Only this file imports raw breed JSON — all other libs consume NormalizedBreed.
 */

import masterBreeds from '../../data/master-breeds.json';
import masterCrossbreeds from '../../data/master-crossbreeds.json';
import breedLinkMap from '../../data/breed-link-map.json';
import contentStatus from '../../data/content-status.json';
import healthProfilesRaw from '../../data/breed-health-profiles.json';
import { normalizeBreedList, type NormalizedBreed } from './normalizeBreed';

export interface BreedHealthProfile {
  breed_slug: string;
  common_issues: { name: string; severity: string; prevalence: string; early_warning?: string }[];
  care_tips: string;
}

const _rawAll: any[] = [
  ...(masterBreeds as any[]),
  ...(masterCrossbreeds as any[]),
];

let _normalized: NormalizedBreed[] | null = null;

function getAll(): NormalizedBreed[] {
  if (!_normalized) {
    _normalized = normalizeBreedList(_rawAll, {
      breedLinkMap: breedLinkMap as any,
      contentStatus: contentStatus as any,
    });
  }
  return _normalized;
}

export function getAllNormalizedBreeds(): NormalizedBreed[] {
  return getAll();
}

export function getBreedBySlug(slug: string): NormalizedBreed | null {
  return getAll().find((b) => b.slug === slug) ?? null;
}

export function getBreedRawBySlug(slug: string): any | null {
  return _rawAll.find((b: any) => b?.slug === slug) ?? null;
}

export function getAllBreedSlugs(): string[] {
  return getAll().map((b) => b.slug);
}

const _healthProfiles: BreedHealthProfile[] = Array.isArray(
  (healthProfilesRaw as any).profiles,
)
  ? (healthProfilesRaw as any).profiles
  : [];

export function getHealthProfile(slug: string): BreedHealthProfile | null {
  return _healthProfiles.find((p) => p.breed_slug === slug) ?? null;
}

export function getBreedStaticPaths(): { params: { breed: string } }[] {
  return _rawAll
    .filter((b: any) => !!b?.slug)
    .map((b: any) => ({ params: { breed: b.slug } }));
}
