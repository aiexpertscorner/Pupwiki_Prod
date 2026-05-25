/**
 * src/lib/breeds/breedDataQuality.ts
 *
 * Data validation and sanitization for breed records.
 * Use sanitizeLongevityYears() before displaying any lifespan value from ranking_data.
 */

export interface BreedDataFlags {
  hasValidLifespan: boolean;
  lifespanSafe: number | null;
  hasSuspiciousLongevity: boolean;
  hasValidWeight: boolean;
  hasValidHeight: boolean;
  dataConfidence: 'high' | 'medium' | 'low';
}

const LIFESPAN_MIN = 5;
const LIFESPAN_MAX = 25;

export function sanitizeLongevityYears(raw: any): number | null {
  const val = Number(raw?.ranking_data?.longevity_years ?? raw?.longevity_years ?? null);
  if (!Number.isFinite(val)) return null;
  if (val < LIFESPAN_MIN || val > LIFESPAN_MAX) return null;
  return val;
}

function safeBiologicalLifespan(raw: any): number | null {
  const life = raw?.life_expectancy;
  if (!life) return null;
  const min = Number(life.min);
  const max = Number(life.max);
  if (Number.isFinite(min) && Number.isFinite(max) && min >= LIFESPAN_MIN && max <= LIFESPAN_MAX && min <= max) {
    return Math.round((min + max) / 2);
  }
  return null;
}

export function getBreedDataFlags(raw: any): BreedDataFlags {
  const longevity = sanitizeLongevityYears(raw);
  const bioLifespan = safeBiologicalLifespan(raw);
  const lifespanSafe = bioLifespan ?? longevity;
  const hasValidLifespan = lifespanSafe !== null;

  const rawLongevity = Number(raw?.ranking_data?.longevity_years ?? null);
  const hasSuspiciousLongevity =
    Number.isFinite(rawLongevity) &&
    (rawLongevity < LIFESPAN_MIN || rawLongevity > LIFESPAN_MAX);

  const wt = raw?.weight || {};
  const htIn = raw?.height || {};
  const hasValidWeight =
    Number.isFinite(Number(wt.min_lbs)) &&
    Number.isFinite(Number(wt.max_lbs)) &&
    Number(wt.min_lbs) <= Number(wt.max_lbs) &&
    Number(wt.min_lbs) > 0;
  const hasValidHeight =
    Number.isFinite(Number(htIn.min_in)) &&
    Number.isFinite(Number(htIn.max_in)) &&
    Number(htIn.min_in) <= Number(htIn.max_in) &&
    Number(htIn.min_in) > 0;

  const hasImages = !!(raw?.image_url || (Array.isArray(raw?.image_urls) && raw.image_urls.length > 0));
  const hasRankingData = !!raw?.ranking_data;
  const hasTraits = !!raw?.traits;

  const score = [hasValidLifespan, hasValidWeight, hasValidHeight, hasImages, hasRankingData, hasTraits].filter(Boolean).length;
  const dataConfidence: 'high' | 'medium' | 'low' = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';

  return {
    hasValidLifespan,
    lifespanSafe,
    hasSuspiciousLongevity,
    hasValidWeight,
    hasValidHeight,
    dataConfidence,
  };
}

export interface BreedAuditResult {
  slug: string;
  name: string;
  issues: string[];
}

export function auditBreedRecord(raw: any): BreedAuditResult {
  const slug = raw?.slug ?? '(no-slug)';
  const name = raw?.name ?? '(no-name)';
  const issues: string[] = [];

  if (!slug || slug === '(no-slug)') issues.push('missing slug');
  if (!name || name === '(no-name)') issues.push('missing name');

  const rawLongevity = Number(raw?.ranking_data?.longevity_years ?? null);
  if (Number.isFinite(rawLongevity)) {
    if (rawLongevity < LIFESPAN_MIN) issues.push(`longevity_years too low: ${rawLongevity}`);
    if (rawLongevity > LIFESPAN_MAX) issues.push(`longevity_years too high: ${rawLongevity}`);
  }

  const life = raw?.life_expectancy || {};
  const lifeMin = Number(life.min);
  const lifeMax = Number(life.max);
  if (Number.isFinite(lifeMin) && Number.isFinite(lifeMax)) {
    if (lifeMin > lifeMax) issues.push(`life_expectancy min > max: ${lifeMin}–${lifeMax}`);
    if (lifeMin < LIFESPAN_MIN || lifeMax > LIFESPAN_MAX) issues.push(`life_expectancy out of range: ${lifeMin}–${lifeMax}`);
  }

  const wt = raw?.weight || {};
  if (Number.isFinite(Number(wt.min_lbs)) && Number.isFinite(Number(wt.max_lbs))) {
    if (Number(wt.min_lbs) > Number(wt.max_lbs)) issues.push(`weight min > max: ${wt.min_lbs}–${wt.max_lbs}`);
  }

  const ht = raw?.height || {};
  if (Number.isFinite(Number(ht.min_in)) && Number.isFinite(Number(ht.max_in))) {
    if (Number(ht.min_in) > Number(ht.max_in)) issues.push(`height min > max: ${ht.min_in}–${ht.max_in}`);
  }

  if (!raw?.image_url && !(Array.isArray(raw?.image_urls) && raw.image_urls.length > 0)) {
    issues.push('no primary image');
  }
  if (!raw?.traits) issues.push('missing traits');
  if (!raw?.ranking_data) issues.push('missing ranking_data');

  return { slug, name, issues };
}
