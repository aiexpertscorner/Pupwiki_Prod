// src/lib/tools/toolUrlState.ts
// Safe query param parsing/encoding and localStorage helpers.
// Uses URLSearchParams (available in Node and browser).
// localStorage helpers are browser-only — wrapped in try/catch.

import type { DogDecisionProfile } from './toolTypes';

export function parseBreedSlugsFromSearch(search: string): string[] {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  return String(params.get('breeds') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4);
}

export function encodeBreedSlugsToSearch(slugs: string[]): string {
  if (slugs.length === 0) return '';
  const params = new URLSearchParams();
  params.set('breeds', slugs.slice(0, 4).join(','));
  return params.toString();
}

const PROFILE_PARAM_MAP: Array<{
  key: keyof DogDecisionProfile;
  param: string;
}> = [
  { key: 'homeType', param: 'home' },
  { key: 'activityPreference', param: 'activity' },
  { key: 'experienceLevel', param: 'exp' },
  { key: 'budgetMode', param: 'budget' },
  { key: 'preferredSize', param: 'size' },
  { key: 'householdKids', param: 'kids' },
  { key: 'otherPets', param: 'pets' },
  { key: 'groomingTolerance', param: 'groom' },
  { key: 'sheddingTolerance', param: 'shed' },
  { key: 'stateCode', param: 'state' },
];

export function parseProfileFromSearch(search: string): Partial<DogDecisionProfile> {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const result: Partial<DogDecisionProfile> = {};
  for (const { key, param } of PROFILE_PARAM_MAP) {
    const val = params.get(param);
    if (val) (result as Record<string, unknown>)[key] = val;
  }
  const ex = params.get('ex');
  if (ex) {
    const parsed = parseInt(ex, 10);
    if (!isNaN(parsed)) result.dailyExerciseMinutes = parsed;
  }
  return result;
}

export function encodeProfileToSearch(profile: Partial<DogDecisionProfile>): string {
  const params = new URLSearchParams();
  for (const { key, param } of PROFILE_PARAM_MAP) {
    const val = profile[key];
    if (val !== undefined && val !== null) params.set(param, String(val));
  }
  if (profile.dailyExerciseMinutes !== undefined) {
    params.set('ex', String(profile.dailyExerciseMinutes));
  }
  return params.toString();
}

export function safeGetParam(search: string, key: string): string | null {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  return params.get(key);
}

export function safeSetStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail — storage may be unavailable or full.
  }
}

export function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
