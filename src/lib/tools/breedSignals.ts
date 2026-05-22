// src/lib/tools/breedSignals.ts
// Derives reusable decision signals from ToolBreed.
// Pure functions — no browser APIs, no side effects.
// Reused by scoring, comparison, supplies, and future tools.

import type { ToolBreed, BreedDecisionSignals } from './toolTypes';

const HIGH_GROOMING_COATS = new Set(['curly', 'corded', 'double', 'wiry', 'long', 'rough']);
const MODERATE_GROOMING_COATS = new Set(['wavy', 'silky', 'medium']);
const WORKING_HERITAGE_GROUPS = new Set(['herding', 'working', 'sporting', 'hound']);

export function getActivityLoad(breed: ToolBreed): 'low' | 'moderate' | 'high' {
  const energy = breed.energyKey;
  if (energy === 'active') return 'high';
  if (energy === 'calm') return 'low';
  // regular energy — check if working/herding/sporting group pushes it higher
  const group = breed.groupLabel.toLowerCase();
  if (WORKING_HERITAGE_GROUPS.has(group) || breed.flags.isWorkingHeritage) return 'high';
  return 'moderate';
}

export function getGroomingLoad(breed: ToolBreed): 'low' | 'moderate' | 'high' {
  const coat = breed.coatKey;
  if (HIGH_GROOMING_COATS.has(coat)) return 'high';
  if (MODERATE_GROOMING_COATS.has(coat)) return 'moderate';
  // short coat — check shedding as secondary signal
  if (breed.sheddingKey === 'heavy') return 'moderate';
  return 'low';
}

export function getSheddingLoad(breed: ToolBreed): 'low' | 'moderate' | 'high' {
  const shedding = breed.sheddingKey;
  if (shedding === 'heavy') return 'high';
  if (shedding === 'seasonal') return 'moderate';
  if (shedding === 'minimal' || shedding === 'low') return 'low';
  // unknown — infer from coat
  if (breed.coatKey === 'double') return 'moderate';
  return 'low';
}

export function getTrainingComplexity(breed: ToolBreed): 'easy' | 'moderate' | 'hard' {
  const training = breed.trainingKey;
  if (training === 'easy') return 'easy';
  if (training === 'difficult') return 'hard';
  // moderate — working/herding can be demanding despite intelligence
  if (breed.flags.isWorkingHeritage && breed.flags.isActive) return 'hard';
  return 'moderate';
}

export function getEstimatedCostLoad(
  breed: ToolBreed
): 'low' | 'medium' | 'high' | 'very-high' {
  const size = breed.sizeKey;
  const groomingLoad = getGroomingLoad(breed);

  let base: 'low' | 'medium' | 'high' | 'very-high';
  if (size === 'giant') base = 'very-high';
  else if (size === 'large') base = 'high';
  else if (size === 'medium') base = 'medium';
  else base = 'low'; // small or unknown

  // High grooming coat bumps one tier up
  if (groomingLoad === 'high') {
    if (base === 'low') return 'medium';
    if (base === 'medium') return 'high';
    if (base === 'high') return 'very-high';
  }
  return base;
}

export function getApartmentFit(breed: ToolBreed): 'strong' | 'possible' | 'challenging' {
  if (breed.flags.isGiant) return 'challenging';
  if (breed.energyKey === 'active' && (breed.flags.isLarge || breed.flags.isGiant)) {
    return 'challenging';
  }
  if (breed.flags.isApartmentFriendly) return 'strong';
  if (breed.energyKey === 'calm' && !breed.flags.isLarge && !breed.flags.isGiant) {
    return 'strong';
  }
  if (breed.energyKey === 'active') return 'challenging';
  return 'possible';
}

export function getFirstTimeOwnerFit(breed: ToolBreed): 'strong' | 'possible' | 'challenging' {
  const training = getTrainingComplexity(breed);
  const activity = getActivityLoad(breed);
  const care = getCareComplexity(breed);

  if (training === 'hard' || (training === 'moderate' && activity === 'high')) {
    return 'challenging';
  }
  if (training === 'easy' && activity !== 'high' && care !== 'high') {
    return 'strong';
  }
  return 'possible';
}

export function getFamilyPlanningFit(
  breed: ToolBreed
): 'strong' | 'possible' | 'needs-care' {
  const training = getTrainingComplexity(breed);
  // Herding breeds can have instinctual behaviors around kids
  const group = breed.groupLabel.toLowerCase();
  const isHerding = group === 'herding';

  if (isHerding && training === 'hard') return 'needs-care';
  if (breed.energyKey === 'calm' && training !== 'hard') return 'strong';
  if (breed.flags.isGiant) return 'possible'; // size consideration
  if (training === 'hard') return 'needs-care';
  return 'possible';
}

export function getCareComplexity(breed: ToolBreed): 'low' | 'moderate' | 'high' {
  const grooming = getGroomingLoad(breed);
  const training = getTrainingComplexity(breed);
  const activity = getActivityLoad(breed);

  const highCount = [grooming === 'high', training === 'hard', activity === 'high'].filter(
    Boolean
  ).length;
  const lowCount = [grooming === 'low', training === 'easy', activity === 'low'].filter(
    Boolean
  ).length;

  if (highCount >= 2) return 'high';
  if (lowCount >= 2) return 'low';
  return 'moderate';
}

export function getDataConfidence(breed: ToolBreed): 'high' | 'medium' | 'low' {
  let score = 0;
  if (breed.weightMin !== null && breed.weightMax !== null) score++;
  if (breed.lifespanMin !== null && breed.lifespanMax !== null) score++;
  if (breed.flags.hasCostCalculator) score++;
  if (breed.description && breed.description.length > 20) score++;
  if (breed.temperament && breed.temperament.length > 5) score++;
  if (breed.guideLinks.some((g) => g.available)) score++;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function getBreedDecisionSignals(breed: ToolBreed): BreedDecisionSignals {
  return {
    activityLoad: getActivityLoad(breed),
    groomingLoad: getGroomingLoad(breed),
    sheddingLoad: getSheddingLoad(breed),
    trainingComplexity: getTrainingComplexity(breed),
    estimatedCostLoad: getEstimatedCostLoad(breed),
    apartmentFit: getApartmentFit(breed),
    firstTimeOwnerFit: getFirstTimeOwnerFit(breed),
    familyPlanningFit: getFamilyPlanningFit(breed),
    careComplexity: getCareComplexity(breed),
    dataConfidence: getDataConfidence(breed),
  };
}
