// src/lib/tools/breedComparisonEngine.ts
// Compares 2–4 breeds side-by-side using signals, cost estimates, and normalized data.
// Pure functions — no browser APIs.

import type { ToolBreed, DogDecisionProfile, ToolNextAction } from './toolTypes';
import {
  getBreedDecisionSignals,
  getActivityLoad,
  getGroomingLoad,
  getSheddingLoad,
  getTrainingComplexity,
  getEstimatedCostLoad,
  getApartmentFit,
  getFirstTimeOwnerFit,
  getCareComplexity,
} from './breedSignals';
import { getBreedDisplayWeight } from './breedToolModel';
import { getScoreLabel } from './breedScoringEngine';

export interface BreedComparisonRow {
  key: string;
  label: string;
  values: {
    breedSlug: string;
    display: string;
    note?: string;
    score?: number;
  }[];
}

export interface BreedComparisonVerdicts {
  bestForApartments?: ToolBreed;
  easiestTraining?: ToolBreed;
  lowestGrooming?: ToolBreed;
  lowestShedding?: ToolBreed;
  lowestCost?: ToolBreed;
  mostActive?: ToolBreed;
  longestLifespan?: ToolBreed;
}

export interface BreedComparisonResult {
  breeds: ToolBreed[];
  verdicts: BreedComparisonVerdicts;
  rows: BreedComparisonRow[];
  summary: string[];
  tradeoffs: string[];
  nextActions: ToolNextAction[];
}

const FIT_LABEL: Record<string, string> = {
  strong: 'Strong',
  possible: 'Possible',
  challenging: 'Challenging',
  'needs-care': 'Needs care',
};

const LOAD_LABEL: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
  easy: 'Easy',
  hard: 'Hard',
};

const ACTIVITY_RANK: Record<string, number> = { low: 1, moderate: 2, high: 3 };
const GROOMING_RANK: Record<string, number> = { low: 1, moderate: 2, high: 3 };
const SHEDDING_RANK: Record<string, number> = { low: 1, moderate: 2, high: 3 };
const TRAINING_RANK: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
const COST_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, 'very-high': 4 };
const APT_RANK: Record<string, number> = { strong: 3, possible: 2, challenging: 1 };

function bestBy<T>(
  items: T[],
  rank: (item: T) => number,
  mode: 'min' | 'max' = 'min'
): T | undefined {
  if (items.length === 0) return undefined;
  let best = items[0];
  let bestRank = rank(items[0]);
  for (let i = 1; i < items.length; i++) {
    const r = rank(items[i]);
    if ((mode === 'min' && r < bestRank) || (mode === 'max' && r > bestRank)) {
      best = items[i];
      bestRank = r;
    }
  }
  // If tied, return undefined
  const topRank = mode === 'min' ? Math.min(...items.map(rank)) : Math.max(...items.map(rank));
  const tied = items.filter((i) => rank(i) === topRank);
  return tied.length === 1 ? tied[0] : undefined;
}

export function compareBreeds(
  breeds: ToolBreed[],
  _profile?: Partial<DogDecisionProfile>
): BreedComparisonResult {
  if (breeds.length < 2) {
    return { breeds, verdicts: {}, rows: [], summary: ['Select at least 2 breeds to compare.'], tradeoffs: [], nextActions: [] };
  }

  const signalsMap = new Map(breeds.map((b) => [b.slug, getBreedDecisionSignals(b)]));
  const getS = (b: ToolBreed) => signalsMap.get(b.slug)!;

  const rows: BreedComparisonRow[] = [
    {
      key: 'size',
      label: 'Size',
      values: breeds.map((b) => ({ breedSlug: b.slug, display: b.sizeLabel })),
    },
    {
      key: 'weight',
      label: 'Weight range',
      values: breeds.map((b) => ({ breedSlug: b.slug, display: getBreedDisplayWeight(b) })),
    },
    {
      key: 'energy',
      label: 'Energy level',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: LOAD_LABEL[getActivityLoad(b)] ?? b.energyLabel,
        score: ACTIVITY_RANK[getActivityLoad(b)],
      })),
    },
    {
      key: 'training',
      label: 'Training difficulty',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: LOAD_LABEL[getTrainingComplexity(b)] ?? b.trainingLabel,
        score: TRAINING_RANK[getTrainingComplexity(b)],
      })),
    },
    {
      key: 'grooming',
      label: 'Grooming load',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: `${LOAD_LABEL[getGroomingLoad(b)] ?? 'Moderate'} (${b.coatLabel} coat)`,
        score: GROOMING_RANK[getGroomingLoad(b)],
      })),
    },
    {
      key: 'shedding',
      label: 'Shedding level',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: LOAD_LABEL[getSheddingLoad(b)] ?? b.sheddingLabel,
        score: SHEDDING_RANK[getSheddingLoad(b)],
      })),
    },
    {
      key: 'lifespan',
      label: 'Estimated lifespan',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: b.lifespanLabel ?? (b.lifespanMid ? `~${b.lifespanMid} years` : 'Unknown'),
        score: b.lifespanMid ?? 0,
      })),
    },
    {
      key: 'costTier',
      label: 'Estimated cost tier',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: LOAD_LABEL[getEstimatedCostLoad(b)] ?? 'Medium',
        note: 'Rough estimate based on size and coat — actual costs vary.',
        score: COST_RANK[getEstimatedCostLoad(b)],
      })),
    },
    {
      key: 'apartmentFit',
      label: 'Apartment suitability',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: FIT_LABEL[getApartmentFit(b)] ?? 'Possible',
        score: APT_RANK[getApartmentFit(b)],
      })),
    },
    {
      key: 'firstTimeFit',
      label: 'First-time owner fit',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: FIT_LABEL[getFirstTimeOwnerFit(b)] ?? 'Possible',
        score: APT_RANK[getFirstTimeOwnerFit(b)],
      })),
    },
    {
      key: 'careComplexity',
      label: 'Overall care complexity',
      values: breeds.map((b) => ({
        breedSlug: b.slug,
        display: LOAD_LABEL[getCareComplexity(b)] ?? 'Moderate',
        score: GROOMING_RANK[getCareComplexity(b)],
      })),
    },
    {
      key: 'bestFitNote',
      label: 'Best-fit owner profile',
      values: breeds.map((b) => {
        const sig = getS(b);
        const notes: string[] = [];
        if (sig.apartmentFit === 'strong') notes.push('apartment living');
        if (sig.firstTimeOwnerFit === 'strong') notes.push('first-time owners');
        if (sig.activityLoad === 'high') notes.push('active owners');
        if (sig.groomingLoad === 'low') notes.push('low grooming preference');
        if (sig.familyPlanningFit === 'strong') notes.push('families with children');
        return {
          breedSlug: b.slug,
          display: notes.length > 0 ? notes.join(', ') : 'Versatile — suits a range of owners',
        };
      }),
    },
    {
      key: 'carePlanningNote',
      label: 'Care planning note',
      values: breeds.map((b) => {
        const sig = getS(b);
        const notes: string[] = [];
        if (sig.groomingLoad === 'high') notes.push('regular grooming sessions');
        if (sig.activityLoad === 'high') notes.push('60+ min daily exercise');
        if (sig.trainingComplexity === 'hard') notes.push('consistent training commitment');
        if (b.flags.isGiant) notes.push('higher food and vet costs');
        return {
          breedSlug: b.slug,
          display: notes.length > 0 ? `Plan for: ${notes.join(', ')}.` : 'Generally manageable care needs.',
        };
      }),
    },
  ];

  const verdicts: BreedComparisonVerdicts = {
    bestForApartments: bestBy(breeds, (b) => APT_RANK[getApartmentFit(b)] ?? 2, 'max'),
    easiestTraining: bestBy(breeds, (b) => TRAINING_RANK[getTrainingComplexity(b)] ?? 2, 'min'),
    lowestGrooming: bestBy(breeds, (b) => GROOMING_RANK[getGroomingLoad(b)] ?? 2, 'min'),
    lowestShedding: bestBy(breeds, (b) => SHEDDING_RANK[getSheddingLoad(b)] ?? 2, 'min'),
    lowestCost: bestBy(breeds, (b) => COST_RANK[getEstimatedCostLoad(b)] ?? 2, 'min'),
    mostActive: bestBy(breeds, (b) => ACTIVITY_RANK[getActivityLoad(b)] ?? 2, 'max'),
    longestLifespan: bestBy(breeds, (b) => b.lifespanMid ?? 0, 'max'),
  };

  // Summary sentences
  const summary: string[] = [];
  const names = breeds.map((b) => b.name).join(' and ');
  summary.push(`Comparing ${names}.`);
  if (verdicts.easiestTraining) {
    summary.push(`${verdicts.easiestTraining.name} may be easier to train.`);
  }
  if (verdicts.lowestCost) {
    summary.push(`${verdicts.lowestCost.name} has a lower estimated cost tier — though actual costs vary.`);
  }
  if (verdicts.longestLifespan) {
    summary.push(`${verdicts.longestLifespan.name} tends toward a longer lifespan.`);
  }

  const tradeoffs: string[] = [
    'Breed characteristics reflect typical tendencies — individual dogs vary significantly.',
    'Cost estimates are size-based and do not account for breed-specific health conditions.',
    'Training scores reflect breed tendencies, not individual dog intelligence or capability.',
  ];

  const nextActions: ToolNextAction[] = [
    { label: 'Find your breed match', href: '/tools/breed-match', type: 'tool', eventName: 'compare_to_breed_match' },
    { label: 'Estimate your puppy costs', href: '/tools/puppy-cost', type: 'tool', eventName: 'compare_to_puppy_cost' },
    ...breeds.map((b): ToolNextAction => ({
      label: `View ${b.name} full guide`,
      href: `/breeds/${b.slug}`,
      type: 'breed',
      eventName: 'compare_to_breed',
    })),
  ];

  return { breeds, verdicts, rows, summary, tradeoffs, nextActions };
}
