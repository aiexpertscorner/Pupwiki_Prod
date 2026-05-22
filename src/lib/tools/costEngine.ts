// src/lib/tools/costEngine.ts
// Reusable cost calculation engine, extracted from cost-calculator pages.
// Pure functions — no browser APIs, no side effects.
// Existing /cost-calculator routes are unchanged and continue to use their own inline logic.

import type { ToolBreed, BudgetMode, DogCostEstimate, CostBreakdownItem, CostEngineData } from './toolTypes';
import { getBreedCostSizeKey } from './breedToolModel';

export interface SizeCostRecord {
  foodAnnual: number;
  vetAnnual: number;
  groomingAnnual: number;
  suppliesOneTime: number;
  spayNeuter: number;
  toysAnnual: number;
  otherAnnual: number;
}

// Matches the cost structure used in existing cost-calculator pages
export const SIZE_COSTS: Record<'small' | 'medium' | 'large' | 'giant', SizeCostRecord> = {
  small: {
    foodAnnual: 600,
    vetAnnual: 600,
    groomingAnnual: 400,
    suppliesOneTime: 400,
    spayNeuter: 300,
    toysAnnual: 150,
    otherAnnual: 200,
  },
  medium: {
    foodAnnual: 900,
    vetAnnual: 800,
    groomingAnnual: 500,
    suppliesOneTime: 500,
    spayNeuter: 400,
    toysAnnual: 200,
    otherAnnual: 200,
  },
  large: {
    foodAnnual: 1400,
    vetAnnual: 1000,
    groomingAnnual: 700,
    suppliesOneTime: 700,
    spayNeuter: 500,
    toysAnnual: 300,
    otherAnnual: 200,
  },
  giant: {
    foodAnnual: 2000,
    vetAnnual: 1400,
    groomingAnnual: 900,
    suppliesOneTime: 900,
    spayNeuter: 700,
    toysAnnual: 400,
    otherAnnual: 200,
  },
};

export const BUDGET_MULTIPLIERS: Record<BudgetMode, { low: number; high: number }> = {
  budget: { low: 0.75, high: 0.95 },
  balanced: { low: 0.9, high: 1.2 },
  premium: { low: 1.2, high: 1.8 },
};

// Size-based insurance fallbacks when breed not in actuarial dataset
const INS_SIZE_FALLBACK: Record<'small' | 'medium' | 'large' | 'giant', number> = {
  small: 28,
  medium: 35,
  large: 55,
  giant: 90,
};

export function getSizeCostTier(
  breed: ToolBreed | null | undefined
): 'small' | 'medium' | 'large' | 'giant' {
  if (!breed) return 'medium';
  return getBreedCostSizeKey(breed);
}

export function getStateMultiplier(statesIndex: unknown, stateCode?: string): number {
  if (!stateCode) return 1.0;
  const data = statesIndex as { states?: { code: string; cost_multiplier: number }[] };
  const match = data.states?.find(
    (s) => s.code?.toUpperCase() === stateCode.toUpperCase()
  );
  return match?.cost_multiplier ?? 1.0;
}

export function getBreedInsuranceBaseMonthly(
  breed: ToolBreed | null | undefined,
  actuarialRates: unknown
): number {
  const sizeKey = getSizeCostTier(breed);
  const fallback = INS_SIZE_FALLBACK[sizeKey];
  if (!breed) return fallback;

  const data = actuarialRates as {
    breed_rates?: { breed_slug: string; base_premium: number }[];
  };
  const match = data.breed_rates?.find((r) => r.breed_slug === breed.slug);
  return match?.base_premium ?? fallback;
}

export function getAgeFactor(ageFactors: unknown, dogAge?: number): number {
  if (dogAge === undefined || dogAge === null) return 1.0;
  const data = ageFactors as {
    age_factors?: { min_age_years: number; max_age_years: number; premium_factor: number }[];
  };
  if (!Array.isArray(data.age_factors)) return 1.0;

  const bucket = data.age_factors.find(
    (af) => dogAge >= af.min_age_years && dogAge <= af.max_age_years
  );
  return bucket?.premium_factor ?? 1.0;
}

export interface CostEstimateInput {
  breed?: ToolBreed | null;
  stateCode?: string;
  dogAge?: number;
  budgetMode?: BudgetMode;
  includeInsurance?: boolean;
}

export function estimateDogCosts(
  input: CostEstimateInput,
  data: CostEngineData
): DogCostEstimate {
  const { breed, stateCode, dogAge, budgetMode = 'balanced', includeInsurance = true } = input;
  const sizeKey = getSizeCostTier(breed);
  const costs = SIZE_COSTS[sizeKey];
  const mult = BUDGET_MULTIPLIERS[budgetMode];

  const annualBase = costs.foodAnnual + costs.vetAnnual + costs.groomingAnnual +
    costs.toysAnnual + costs.otherAnnual;

  const annualLow = Math.round(annualBase * mult.low);
  const annualHigh = Math.round(annualBase * mult.high);
  const monthlyLow = Math.round(annualLow / 12);
  const monthlyHigh = Math.round(annualHigh / 12);

  const oneTimeLow = Math.round((costs.suppliesOneTime + costs.spayNeuter) * mult.low);
  const oneTimeHigh = Math.round((costs.suppliesOneTime + costs.spayNeuter) * mult.high);
  const firstYearLow = annualLow + oneTimeLow;
  const firstYearHigh = annualHigh + oneTimeHigh;

  const breakdown: CostBreakdownItem[] = [
    {
      key: 'food',
      label: 'Food',
      annualLow: Math.round(costs.foodAnnual * mult.low),
      annualHigh: Math.round(costs.foodAnnual * mult.high),
      monthlyLow: Math.round((costs.foodAnnual * mult.low) / 12),
      monthlyHigh: Math.round((costs.foodAnnual * mult.high) / 12),
      note: 'Varies by brand, portion size, and dietary needs.',
    },
    {
      key: 'vet',
      label: 'Routine veterinary care',
      annualLow: Math.round(costs.vetAnnual * mult.low),
      annualHigh: Math.round(costs.vetAnnual * mult.high),
      monthlyLow: Math.round((costs.vetAnnual * mult.low) / 12),
      monthlyHigh: Math.round((costs.vetAnnual * mult.high) / 12),
      note: 'Wellness visits, vaccinations, parasite prevention. Excludes emergencies.',
    },
    {
      key: 'grooming',
      label: 'Grooming',
      annualLow: Math.round(costs.groomingAnnual * mult.low),
      annualHigh: Math.round(costs.groomingAnnual * mult.high),
      monthlyLow: Math.round((costs.groomingAnnual * mult.low) / 12),
      monthlyHigh: Math.round((costs.groomingAnnual * mult.high) / 12),
      note: 'Coat type and style preferences significantly affect this.',
    },
    {
      key: 'toys',
      label: 'Toys and enrichment',
      annualLow: Math.round(costs.toysAnnual * mult.low),
      annualHigh: Math.round(costs.toysAnnual * mult.high),
      monthlyLow: Math.round((costs.toysAnnual * mult.low) / 12),
      monthlyHigh: Math.round((costs.toysAnnual * mult.high) / 12),
      note: 'Active and working breeds often need more enrichment.',
    },
    {
      key: 'other',
      label: 'Other (training, boarding, misc)',
      annualLow: Math.round(costs.otherAnnual * mult.low),
      annualHigh: Math.round(costs.otherAnnual * mult.high),
      note: 'Training classes, daycare, travel, and incidentals.',
    },
    {
      key: 'setup',
      label: 'First-year setup (one-time)',
      oneTimeLow,
      oneTimeHigh,
      note: 'Crate, bed, collar, leash, bowls, spay/neuter. Paid once.',
    },
  ];

  if (includeInsurance) {
    const basePremium = getBreedInsuranceBaseMonthly(breed, data.actuarialRates);
    const ageFactor = getAgeFactor(data.ageFactors, dogAge);
    const stateMult = getStateMultiplier(data.statesIndex, stateCode);
    const insMonthlyLow = Math.round(basePremium * ageFactor * stateMult * mult.low);
    const insMonthlyHigh = Math.round(basePremium * ageFactor * stateMult * mult.high);
    breakdown.push({
      key: 'insurance',
      label: 'Pet insurance (optional)',
      monthlyLow: insMonthlyLow,
      monthlyHigh: insMonthlyHigh,
      annualLow: insMonthlyLow * 12,
      annualHigh: insMonthlyHigh * 12,
      note: 'Illustrative estimate only — get a personalized quote from insurers.',
    });
  }

  return {
    breedSlug: breed?.slug,
    breedName: breed?.name,
    stateCode,
    budgetMode,
    monthlyLow,
    monthlyHigh,
    annualLow,
    annualHigh,
    firstYearLow,
    firstYearHigh,
    breakdown,
    assumptions: [
      `Size category: ${sizeKey}`,
      `Budget mode: ${budgetMode}`,
      'Costs are US national averages adjusted for size and budget preference.',
      stateCode ? `State selected: ${stateCode}` : 'No state selected — using national averages.',
      'Emergency veterinary costs and breed-specific health conditions are not included.',
    ],
    disclaimers: [
      'Planning estimates only — not quotes or financial advice.',
      'Actual costs vary by provider, location, health, lifestyle, and individual care choices.',
      'Insurance figures are illustrative estimates, not insurance quotes.',
    ],
  };
}
