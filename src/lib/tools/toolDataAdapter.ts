// src/lib/tools/toolDataAdapter.ts
// Centralized data loader for tool pages.
// This is the only file that imports raw JSON datasets directly.
// Returns compact ToolBreed[], never raw JSON blobs.

import masterBreeds from '../../data/master-breeds.json';
import masterCrossbreeds from '../../data/master-crossbreeds.json';
import breedLinkMap from '../../data/breed-link-map.json';
import contentStatus from '../../data/content-status.json';
import actuarialRates from '../../data/actuarial-breed-rates.json';
import actuarialAgeFactors from '../../data/actuarial-age-factors.json';
import statesIndex from '../../data/us-states-insurance-index.json';
import healthProfilesRaw from '../../data/breed-health-profiles.json';

import { normalizeBreedList } from '../breeds/normalizeBreed';
import { toToolBreeds } from './breedToolModel';
import type { ToolBreed, CostEngineData, HealthProfile } from './toolTypes';

let _cachedBreeds: ToolBreed[] | null = null;

export function getToolBreeds(): ToolBreed[] {
  if (_cachedBreeds) return _cachedBreeds;

  const options = {
    breedLinkMap: breedLinkMap as Record<string, Record<string, string | boolean | null | undefined>>,
    contentStatus: contentStatus as Record<string, Record<string, boolean | string | null | undefined>>,
  };

  const purebreds = normalizeBreedList(
    masterBreeds as unknown as Record<string, unknown>[],
    options
  );
  const crossbreeds = normalizeBreedList(
    masterCrossbreeds as unknown as Record<string, unknown>[],
    options
  );

  _cachedBreeds = toToolBreeds([...purebreds, ...crossbreeds]);
  return _cachedBreeds;
}

export function getToolCostData(): CostEngineData {
  return {
    actuarialRates,
    ageFactors: actuarialAgeFactors,
    statesIndex,
  };
}

export function getToolHealthProfiles(): Record<string, HealthProfile> {
  const raw = healthProfilesRaw as unknown as {
    profiles?: { breed_slug: string; common_issues: unknown[]; care_tips: string }[];
  };
  const profiles: Record<string, HealthProfile> = {};
  if (Array.isArray(raw.profiles)) {
    for (const p of raw.profiles) {
      if (p.breed_slug) {
        profiles[p.breed_slug] = p as HealthProfile;
      }
    }
  }
  return profiles;
}

export function getToolPageData(): {
  breeds: ToolBreed[];
  costData: CostEngineData;
  healthProfiles: Record<string, HealthProfile>;
} {
  return {
    breeds: getToolBreeds(),
    costData: getToolCostData(),
    healthProfiles: getToolHealthProfiles(),
  };
}
