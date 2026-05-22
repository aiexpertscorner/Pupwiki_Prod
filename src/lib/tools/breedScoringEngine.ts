// src/lib/tools/breedScoringEngine.ts
// Scores breeds against a user's lifestyle and preferences.
// Pure functions — no browser APIs, no side effects.

import type { DogDecisionProfile, ToolBreed, BreedMatchResult, ScoreFactor, ToolNextAction } from './toolTypes';
import {
  getBreedDecisionSignals,
  getActivityLoad,
  getGroomingLoad,
  getSheddingLoad,
  getTrainingComplexity,
  getEstimatedCostLoad,
  getApartmentFit,
  getFirstTimeOwnerFit,
  getFamilyPlanningFit,
  getDataConfidence,
} from './breedSignals';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Strong fit';
  if (score >= 70) return 'Good fit';
  if (score >= 55) return 'Possible fit';
  return 'Consider carefully';
}

// Factor: Lifestyle / home fit (max 15)
function scoreHomeFit(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const fit = getApartmentFit(breed);
  let score = 10; // neutral starting point
  let reason = '';
  let severity: ScoreFactor['severity'] = 'neutral';

  if (profile.homeType === 'apartment') {
    if (fit === 'strong') { score = 15; reason = 'This breed often adapts well to apartment living.'; severity = 'positive'; }
    else if (fit === 'possible') { score = 8; reason = 'This breed can live in an apartment with sufficient daily exercise.'; }
    else { score = 3; reason = 'This breed may find apartment living challenging — plan for significant daily outdoor time.'; severity = 'warning'; }
  } else if (profile.homeType === 'rural') {
    if (fit === 'challenging') { score = 15; reason = 'This breed tends to thrive with space and outdoor access.'; severity = 'positive'; }
    else { score = 13; reason = 'This breed will enjoy rural living.'; severity = 'positive'; }
  } else {
    // house
    if (fit === 'challenging') { score = 12; reason = 'A house with a yard suits this active breed well.'; severity = 'positive'; }
    else { score = 13; reason = 'A house setting works well for this breed.'; severity = 'positive'; }
  }

  return { key: 'home', label: 'Home and lifestyle fit', score: clamp(score, 0, 15), maxScore: 15, reason, severity };
}

// Factor: Activity match (max 20)
function scoreActivityMatch(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const breedActivity = getActivityLoad(breed);
  const userActivity = profile.activityPreference;
  const exerciseMins = profile.dailyExerciseMinutes;

  const activityMap: Record<string, number> = { calm: 1, moderate: 2, active: 3, 'very-active': 4 };
  const breedMap: Record<string, number> = { low: 1, moderate: 2, high: 3 };

  const userLevel = activityMap[userActivity] ?? 2;
  const breedLevel = breedMap[breedActivity] ?? 2;
  const diff = Math.abs(userLevel - breedLevel);

  let score: number;
  let reason: string;
  let severity: ScoreFactor['severity'];

  if (diff === 0) {
    score = 20;
    reason = `Activity levels could be a strong match — both you and this breed lean ${breedActivity}.`;
    severity = 'positive';
  } else if (diff === 1) {
    score = 14;
    reason = `Activity levels are close but not identical — plan for ${breedActivity === 'high' ? 'more exercise than you might expect' : 'adapting to a calmer pace'}.`;
    severity = 'neutral';
  } else {
    score = 5;
    reason = `Activity mismatch — this breed tends toward ${breedActivity} activity levels, which may not match your ${userActivity} lifestyle.`;
    severity = 'warning';
  }

  // Bonus: very active user with low-exercise-minimum that conflicts
  if (userActivity === 'very-active' && breedActivity === 'high') {
    score = Math.min(20, score + 3);
  }
  if (exerciseMins < 30 && breedActivity === 'high') {
    score = Math.max(0, score - 4);
    reason += ' Under 30 min/day may not be enough for this breed.';
    severity = 'warning';
  }

  return { key: 'activity', label: 'Activity match', score: clamp(score, 0, 20), maxScore: 20, reason, severity };
}

// Factor: Experience / training fit (max 15)
function scoreTrainingFit(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const complexity = getTrainingComplexity(breed);
  const experience = profile.experienceLevel;
  const commitment = profile.trainingCommitment;

  let score: number;
  let reason: string;
  let severity: ScoreFactor['severity'];

  if (complexity === 'easy') {
    score = experience === 'first-time' ? 15 : 13;
    reason = 'This breed is generally considered easier to train, which could be a good fit for your experience level.';
    severity = 'positive';
  } else if (complexity === 'moderate') {
    if (experience === 'experienced') { score = 14; reason = 'Moderate training complexity suits your experience level.'; severity = 'positive'; }
    else if (experience === 'some') { score = 11; reason = 'Moderate training complexity — manageable with consistent effort.'; severity = 'neutral'; }
    else { score = 7; reason = 'This breed needs consistent training. As a first-time owner, plan for a training class.'; severity = 'neutral'; }
  } else {
    // hard
    if (experience === 'experienced') { score = 11; reason = 'This breed can be demanding to train — your experience will help.'; severity = 'neutral'; }
    else if (experience === 'some') { score = 6; reason = 'This breed needs experienced handling. Extra training investment is likely needed.'; severity = 'warning'; }
    else { score = 2; reason = 'This breed may be challenging for a first-time owner. Professional training guidance is strongly recommended.'; severity = 'warning'; }
  }

  // Training commitment bonus
  if (commitment === 'high' && complexity !== 'easy') score = Math.min(15, score + 2);

  return { key: 'training', label: 'Training and experience fit', score: clamp(score, 0, 15), maxScore: 15, reason, severity };
}

// Factor: Grooming and shedding fit (max 15)
function scoreGroomingShedding(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const grooming = getGroomingLoad(breed);
  const shedding = getSheddingLoad(breed);
  const groomTol = profile.groomingTolerance;
  const sheddingTol = profile.sheddingTolerance;

  const tolMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const loadMap: Record<string, number> = { low: 1, moderate: 2, high: 3 };

  const groomScore = tolMap[groomTol] >= loadMap[grooming] ? 8 : tolMap[groomTol] + 1 === loadMap[grooming] ? 5 : 2;
  const sheddScore = tolMap[sheddingTol] >= loadMap[shedding] ? 7 : tolMap[sheddingTol] + 1 === loadMap[shedding] ? 4 : 1;
  const total = groomScore + sheddScore;

  let reason: string;
  let severity: ScoreFactor['severity'];
  if (total >= 13) {
    reason = `Grooming and shedding levels appear compatible with your tolerance.`;
    severity = 'positive';
  } else if (total >= 8) {
    reason = `There may be some grooming or shedding considerations — plan accordingly.`;
    severity = 'neutral';
  } else {
    reason = `This breed's grooming or shedding level may be higher than your tolerance — factor in time and cost.`;
    severity = 'warning';
  }

  return { key: 'grooming', label: 'Grooming and shedding fit', score: clamp(total, 0, 15), maxScore: 15, reason, severity };
}

// Factor: Budget / cost fit (max 15)
function scoreBudgetFit(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const costLoad = getEstimatedCostLoad(breed);
  const budget = profile.budgetMode;

  const budgetMap: Record<string, number> = { budget: 1, balanced: 2, premium: 3 };
  const costMap: Record<string, number> = { low: 1, medium: 2, high: 3, 'very-high': 4 };

  const budgetLevel = budgetMap[budget] ?? 2;
  const costLevel = costMap[costLoad] ?? 2;

  let score: number;
  let reason: string;
  let severity: ScoreFactor['severity'];

  if (budgetLevel >= costLevel) {
    score = 15;
    reason = `Your budget mode appears compatible with this breed's estimated cost tier (${costLoad}).`;
    severity = 'positive';
  } else if (costLevel - budgetLevel === 1) {
    score = 9;
    reason = `This breed's ongoing costs may be slightly above a ${budget} budget — plan carefully.`;
    severity = 'neutral';
  } else {
    score = 3;
    reason = `This breed's estimated cost tier (${costLoad}) may be a significant stretch on a ${budget} budget.`;
    severity = 'warning';
  }

  return { key: 'budget', label: 'Budget and cost fit', score: clamp(score, 0, 15), maxScore: 15, reason, severity };
}

// Factor: Size preference (max 8)
function scoreSizePreference(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const preferred = profile.preferredSize;
  const breedSize = breed.sizeKey;

  let score: number;
  let reason: string;

  if (preferred === 'any') {
    score = 8;
    reason = 'No size preference set — all sizes considered equally.';
  } else if (preferred === breedSize) {
    score = 8;
    reason = `Matches your preferred size (${preferred}).`;
  } else {
    score = 2;
    reason = `This is a ${breedSize} breed — different from your preference (${preferred}).`;
  }

  return { key: 'size', label: 'Size preference', score: clamp(score, 0, 8), maxScore: 8, reason, severity: score >= 7 ? 'positive' : 'warning' };
}

// Factor: Family / pet planning fit (max 7)
function scoreFamilyFit(breed: ToolBreed, profile: DogDecisionProfile): ScoreFactor {
  const familyFit = getFamilyPlanningFit(breed);
  const kids = profile.householdKids;
  const pets = profile.otherPets;

  let score = 5;
  let reason = '';
  let severity: ScoreFactor['severity'] = 'neutral';

  if (familyFit === 'strong') {
    score = 7;
    reason = 'This breed is often noted for getting along well in family settings.';
    severity = 'positive';
  } else if (familyFit === 'needs-care') {
    score = 2;
    reason = 'This breed may need careful introduction and management in households with young children or other pets.';
    severity = 'warning';
  } else {
    score = 5;
    reason = 'Most breeds do well in family settings with appropriate socialization.';
  }

  if ((kids === 'young' || kids === 'mixed') && familyFit === 'needs-care') {
    score = Math.max(0, score - 2);
    reason += ' Extra caution is warranted with young children.';
    severity = 'warning';
  }
  if (pets !== 'none' && breed.flags.isWorkingHeritage) {
    score = Math.max(1, score - 1);
    reason += ' Working heritage breeds may have strong prey instincts around other pets.';
  }

  return { key: 'family', label: 'Family and pet planning', score: clamp(score, 0, 7), maxScore: 7, reason, severity };
}

// Factor: Data confidence bonus (max 5)
function scoreDataConfidence(breed: ToolBreed): ScoreFactor {
  const confidence = getDataConfidence(breed);
  const score = confidence === 'high' ? 5 : confidence === 'medium' ? 2 : 0;
  const reason =
    confidence === 'high'
      ? 'Strong data is available for this breed.'
      : confidence === 'medium'
      ? 'Moderate data is available — results are a reasonable starting point.'
      : 'Limited data is available for this breed — treat results as a starting point only.';
  return { key: 'confidence', label: 'Data quality', score, maxScore: 5, reason, severity: 'neutral' };
}

function getBestForLabels(breed: ToolBreed, signals: ReturnType<typeof getBreedDecisionSignals>): string[] {
  const labels: string[] = [];
  if (signals.apartmentFit === 'strong') labels.push('Apartment living');
  if (signals.firstTimeOwnerFit === 'strong') labels.push('First-time owners');
  if (signals.groomingLoad === 'low') labels.push('Low-maintenance coat');
  if (signals.sheddingLoad === 'low') labels.push('Minimal shedding');
  if (signals.trainingComplexity === 'easy') labels.push('Easy to train');
  if (breed.flags.isLongLiving) labels.push('Long lifespan');
  if (breed.flags.isCalm) labels.push('Calm households');
  if (signals.familyPlanningFit === 'strong') labels.push('Families with children');
  return labels.slice(0, 4);
}

function getTradeoffs(breed: ToolBreed, signals: ReturnType<typeof getBreedDecisionSignals>): string[] {
  const tradeoffs: string[] = [];
  if (signals.activityLoad === 'high') tradeoffs.push('Needs significant daily exercise and mental stimulation.');
  if (signals.groomingLoad === 'high') tradeoffs.push('Regular professional or at-home grooming is part of ownership.');
  if (signals.trainingComplexity === 'hard') tradeoffs.push('Training requires patience, consistency, and ideally some experience.');
  if (signals.estimatedCostLoad === 'very-high') tradeoffs.push('Giant breeds tend to have higher ongoing costs across food, vet, and supplies.');
  if (signals.sheddingLoad === 'high') tradeoffs.push('Heavy shedding — regular vacuuming and grooming management required.');
  if (signals.apartmentFit === 'challenging') tradeoffs.push('May struggle in small living spaces without ample outdoor access.');
  if (breed.flags.isGiant) tradeoffs.push('Giant breeds often have shorter lifespans and higher veterinary costs.');
  return tradeoffs.slice(0, 3);
}

function getBreedNextActions(breed: ToolBreed): ToolNextAction[] {
  const actions: ToolNextAction[] = [
    { label: `View ${breed.name} breed guide`, href: `/breeds/${breed.slug}`, type: 'breed', eventName: 'match_to_breed' },
    { label: 'Compare with other breeds', href: '/tools/compare', type: 'tool', eventName: 'match_to_compare' },
  ];
  if (breed.flags.hasCostCalculator) {
    actions.push({ label: `${breed.name} cost calculator`, href: `/cost-calculator/${breed.slug}`, type: 'cost', eventName: 'match_to_cost' });
  }
  const foodLink = breed.guideLinks.find((g) => g.key === 'food' && g.available);
  if (foodLink) {
    actions.push({ label: 'Best food for this breed', href: foodLink.href, type: 'guide', eventName: 'match_to_food' });
  }
  return actions;
}

export function scoreBreedForProfile(
  breed: ToolBreed,
  profile: DogDecisionProfile
): BreedMatchResult {
  const signals = getBreedDecisionSignals(breed);

  const factors: ScoreFactor[] = [
    scoreHomeFit(breed, profile),
    scoreActivityMatch(breed, profile),
    scoreTrainingFit(breed, profile),
    scoreGroomingShedding(breed, profile),
    scoreBudgetFit(breed, profile),
    scoreSizePreference(breed, profile),
    scoreFamilyFit(breed, profile),
    scoreDataConfidence(breed),
  ];

  const totalScore = clamp(factors.reduce((sum, f) => sum + f.score, 0));
  const scoreLabel = getScoreLabel(totalScore);

  const positiveReasons = factors
    .filter((f) => f.severity === 'positive' && f.score >= f.maxScore * 0.7)
    .map((f) => f.reason)
    .slice(0, 3);

  const tradeoffs = getTradeoffs(breed, signals);
  const bestFor = getBestForLabels(breed, signals);

  const assumptions = [
    'Scores are estimates based on breed characteristics — individual dogs vary.',
    'Data confidence affects score reliability. Lower-confidence breeds should be researched further.',
    signals.dataConfidence === 'low'
      ? 'Limited data is available for this breed — use this as a starting point only.'
      : null,
  ].filter(Boolean) as string[];

  return {
    breed,
    signals,
    score: totalScore,
    scoreLabel,
    bestFor,
    factors,
    reasons: positiveReasons.length > 0 ? positiveReasons : [`This breed could be a possible fit based on your profile.`],
    tradeoffs: tradeoffs.length > 0 ? tradeoffs : ['Every breed has trade-offs — compare a few before deciding.'],
    assumptions,
    nextActions: getBreedNextActions(breed),
  };
}

export function getBreedMatches(
  breeds: ToolBreed[],
  profile: DogDecisionProfile,
  limit = 10
): BreedMatchResult[] {
  return breeds
    .map((b) => scoreBreedForProfile(b, profile))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
