/**
 * src/lib/breeds/breedSignals.ts
 *
 * Derives decision signals from a NormalizedBreed.
 * Signals are used by breedDecisionEngine, BreedResultCard, and BreedOwnerFitCards.
 */

import type { NormalizedBreed } from './normalizeBreed';

export interface BreedDecisionSignals {
  activityLoad: 'low' | 'moderate' | 'high';
  groomingLoad: 'low' | 'moderate' | 'high';
  sheddingLoad: 'low' | 'moderate' | 'high';
  trainingComplexity: 'easy' | 'moderate' | 'hard';
  costLoad: 'low' | 'medium' | 'high' | 'very-high';
  apartmentFit: 'strong' | 'possible' | 'challenging';
  firstTimeOwnerFit: 'strong' | 'possible' | 'challenging';
  familyFit: 'strong' | 'possible' | 'needs-care';
  careComplexity: 'low' | 'moderate' | 'high';
  dataConfidence: 'high' | 'medium' | 'low';
}

function groomingLoad(breed: NormalizedBreed): 'low' | 'moderate' | 'high' {
  const val = Number(breed.raw?.traits?.grooming_value ?? 0);
  if (val >= 0.65) return 'high';
  if (val >= 0.35) return 'moderate';
  return 'low';
}

function costLoad(breed: NormalizedBreed): 'low' | 'medium' | 'high' | 'very-high' {
  const lifetime = Number(breed.raw?.ranking_data?.lifetime_cost_usd ?? 0);
  if (lifetime > 0) {
    if (lifetime >= 30000) return 'very-high';
    if (lifetime >= 18000) return 'high';
    if (lifetime >= 10000) return 'medium';
    return 'low';
  }
  // Size-based fallback when no cost data
  const size = breed.size.key;
  if (size === 'giant') return 'very-high';
  if (size === 'large') return 'high';
  if (size === 'medium') return 'medium';
  return 'low';
}

function apartmentFit(breed: NormalizedBreed): 'strong' | 'possible' | 'challenging' {
  if (breed.flags.isApartmentFriendly && !breed.flags.isActive) return 'strong';
  if (breed.flags.isApartmentFriendly || breed.flags.isCalm || breed.flags.isSmall) return 'possible';
  if (breed.flags.isLarge || breed.flags.isGiant || (breed.flags.isActive && !breed.flags.isSmall)) return 'challenging';
  return 'possible';
}

function firstTimeOwnerFit(breed: NormalizedBreed): 'strong' | 'possible' | 'challenging' {
  const difficulty = breed.ownerDifficulty ?? 5;
  if (difficulty <= 3) return 'strong';
  if (difficulty <= 6) return 'possible';
  return 'challenging';
}

function familyFit(breed: NormalizedBreed): 'strong' | 'possible' | 'needs-care' {
  const goodWithKids = breed.raw?.good_with_kids;
  if (goodWithKids === true) return 'strong';
  if (goodWithKids === false) return 'needs-care';
  // Infer from temperament traits when field is absent
  const temp = String(breed.raw?.temperament ?? '').toLowerCase();
  if (temp.includes('gentle') || temp.includes('friendly') || temp.includes('playful')) return 'strong';
  if (temp.includes('dominant') || temp.includes('aloof') || temp.includes('reserved')) return 'needs-care';
  return 'possible';
}

function careComplexity(signals: Omit<BreedDecisionSignals, 'careComplexity' | 'dataConfidence'>): 'low' | 'moderate' | 'high' {
  const scores = [
    signals.activityLoad === 'high' ? 2 : signals.activityLoad === 'moderate' ? 1 : 0,
    signals.groomingLoad === 'high' ? 2 : signals.groomingLoad === 'moderate' ? 1 : 0,
    signals.trainingComplexity === 'hard' ? 2 : signals.trainingComplexity === 'moderate' ? 1 : 0,
  ];
  const total = scores.reduce((a, b) => a + b, 0);
  if (total >= 4) return 'high';
  if (total >= 2) return 'moderate';
  return 'low';
}

function dataConfidence(breed: NormalizedBreed): 'high' | 'medium' | 'low' {
  const hasTraits = !!breed.raw?.traits;
  const hasRanking = !!breed.raw?.ranking_data;
  const hasImages = !!breed.primaryImage;
  const hasLifespan = breed.lifespan.min !== null && breed.lifespan.max !== null;
  const score = [hasTraits, hasRanking, hasImages, hasLifespan].filter(Boolean).length;
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export function getBreedDecisionSignals(breed: NormalizedBreed): BreedDecisionSignals {
  const activity: 'low' | 'moderate' | 'high' =
    breed.energy.key === 'active' ? 'high' : breed.energy.key === 'calm' ? 'low' : 'moderate';

  const shedding: 'low' | 'moderate' | 'high' =
    breed.shedding.key === 'heavy' ? 'high'
    : breed.shedding.key === 'minimal' || breed.shedding.key === 'low' ? 'low'
    : 'moderate';

  const training: 'easy' | 'moderate' | 'hard' =
    breed.training.key === 'easy' ? 'easy' : breed.training.key === 'difficult' ? 'hard' : 'moderate';

  const grooming = groomingLoad(breed);
  const cost = costLoad(breed);
  const apartment = apartmentFit(breed);
  const firstTime = firstTimeOwnerFit(breed);
  const family = familyFit(breed);

  const partial = {
    activityLoad: activity,
    groomingLoad: grooming,
    sheddingLoad: shedding,
    trainingComplexity: training,
    costLoad: cost,
    apartmentFit: apartment,
    firstTimeOwnerFit: firstTime,
    familyFit: family,
  };

  return {
    ...partial,
    careComplexity: careComplexity(partial),
    dataConfidence: dataConfidence(breed),
  };
}
