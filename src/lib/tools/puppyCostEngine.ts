// src/lib/tools/puppyCostEngine.ts
// First-year puppy planning estimates. Builds on costEngine.ts.
// Pure functions — no browser APIs.

import type { ToolBreed, BudgetMode, CostEngineData, ToolNextAction } from './toolTypes';
import { estimateDogCosts, getBreedInsuranceBaseMonthly, getAgeFactor, getStateMultiplier, BUDGET_MULTIPLIERS, SIZE_COSTS, getSizeCostTier } from './costEngine';

export interface PuppySetupCostItem {
  id: string;
  label: string;
  category: 'setup' | 'recurring' | 'optional';
  low: number;
  high: number;
  note: string;
  affiliateEligible: boolean;
}

export interface PuppyCostInput {
  breed?: ToolBreed | null;
  stateCode?: string;
  budgetMode: BudgetMode;
  puppyAgeMonths?: number;
  includeInsurance: boolean;
  alreadyHasBasics: boolean;
  needsCrate: boolean;
  needsGroomingTools: boolean;
  needsTravelGear: boolean;
}

export interface PuppyFirstYearEstimate {
  title: string;
  breedName?: string;
  stateCode?: string;
  budgetMode: BudgetMode;
  firstMonthLow: number;
  firstMonthHigh: number;
  firstYearLow: number;
  firstYearHigh: number;
  recurringMonthlyLow: number;
  recurringMonthlyHigh: number;
  setupItems: PuppySetupCostItem[];
  recurringItems: PuppySetupCostItem[];
  optionalItems: PuppySetupCostItem[];
  assumptions: string[];
  savingsTips: string[];
  nextActions: ToolNextAction[];
}

// Setup cost ranges by size
const SETUP_RANGES = {
  small: { crate: [40, 80], bed: [25, 80], bowls: [15, 40], collar: [12, 35], leash: [12, 35], id: [8, 20], toys: [30, 80], cleanup: [20, 50], groomingKit: [25, 80], travelGear: [40, 150] },
  medium: { crate: [60, 150], bed: [35, 120], bowls: [20, 50], collar: [15, 45], leash: [15, 45], id: [8, 20], toys: [40, 100], cleanup: [20, 50], groomingKit: [30, 100], travelGear: [60, 200] },
  large: { crate: [80, 200], bed: [50, 180], bowls: [20, 60], collar: [20, 55], leash: [20, 55], id: [8, 20], toys: [50, 150], cleanup: [25, 60], groomingKit: [40, 150], travelGear: [80, 250] },
  giant: { crate: [120, 300], bed: [80, 250], bowls: [25, 70], collar: [25, 70], leash: [25, 70], id: [8, 20], toys: [60, 200], cleanup: [30, 70], groomingKit: [50, 180], travelGear: [100, 350] },
};

function r(low: number, high: number): [number, number] {
  return [low, high];
}

export function estimatePuppyFirstYear(
  input: PuppyCostInput,
  data: CostEngineData
): PuppyFirstYearEstimate {
  const {
    breed,
    stateCode,
    budgetMode,
    puppyAgeMonths = 2,
    includeInsurance,
    alreadyHasBasics,
    needsCrate,
    needsGroomingTools,
    needsTravelGear,
  } = input;

  const sizeKey = getSizeCostTier(breed);
  const mult = BUDGET_MULTIPLIERS[budgetMode];
  const ranges = SETUP_RANGES[sizeKey];
  const baseCosts = SIZE_COSTS[sizeKey];

  const setupItems: PuppySetupCostItem[] = [];
  const recurringItems: PuppySetupCostItem[] = [];
  const optionalItems: PuppySetupCostItem[] = [];

  // Setup — only include what's needed
  if (!alreadyHasBasics) {
    if (needsCrate) {
      setupItems.push({
        id: 'crate', label: 'Crate or safe sleeping area',
        category: 'setup',
        low: Math.round(ranges.crate[0] * mult.low),
        high: Math.round(ranges.crate[1] * mult.high),
        note: sizeKey === 'large' || sizeKey === 'giant'
          ? 'Consider an adjustable crate with divider for a growing pup.'
          : 'A proper-sized crate helps with house training.',
        affiliateEligible: true,
      });
    }
    setupItems.push(
      { id: 'bed', label: 'Dog bed or crate mat', category: 'setup', low: Math.round(ranges.bed[0] * mult.low), high: Math.round(ranges.bed[1] * mult.high), note: 'Washable is worth the extra cost.', affiliateEligible: true },
      { id: 'bowls', label: 'Food and water bowls', category: 'setup', low: Math.round(ranges.bowls[0] * mult.low), high: Math.round(ranges.bowls[1] * mult.high), note: 'Stainless steel is easier to keep clean.', affiliateEligible: true },
      { id: 'collar', label: 'Collar or harness', category: 'setup', low: Math.round(ranges.collar[0] * mult.low), high: Math.round(ranges.collar[1] * mult.high), note: sizeKey === 'small' ? 'A lightweight harness is often gentler for small breeds.' : 'A well-fitted harness can be easier on the neck.', affiliateEligible: true },
      { id: 'leash', label: 'Leash', category: 'setup', low: Math.round(ranges.leash[0] * mult.low), high: Math.round(ranges.leash[1] * mult.high), note: 'Start with a standard 6-foot leash.', affiliateEligible: true },
      { id: 'id', label: 'ID tag and microchip', category: 'setup', low: Math.round(ranges.id[0] * mult.low), high: Math.round(ranges.id[1] * mult.high), note: 'Microchipping is usually done at the first vet visit.', affiliateEligible: false },
      { id: 'toys', label: 'Starter toys and chews', category: 'setup', low: Math.round(ranges.toys[0] * mult.low), high: Math.round(ranges.toys[1] * mult.high), note: 'Mix of chew, tug, and puzzle toys. Rotate regularly.', affiliateEligible: true },
      { id: 'cleanup', label: 'Poop bags and enzyme cleaner', category: 'setup', low: Math.round(ranges.cleanup[0] * mult.low), high: Math.round(ranges.cleanup[1] * mult.high), note: 'Enzyme cleaner is essential for accidents.', affiliateEligible: true },
    );
  }

  if (needsGroomingTools) {
    setupItems.push({
      id: 'groomingKit', label: 'Grooming starter kit',
      category: 'setup',
      low: Math.round(ranges.groomingKit[0] * mult.low),
      high: Math.round(ranges.groomingKit[1] * mult.high),
      note: breed?.coatKey && ['curly', 'long', 'double', 'corded'].includes(breed.coatKey)
        ? 'This coat type needs regular brushing — invest in quality tools.'
        : 'Basic brush, nail trimmer, and shampoo.',
      affiliateEligible: true,
    });
  }

  if (needsTravelGear) {
    setupItems.push({
      id: 'travelGear', label: 'Travel crate or car restraint',
      category: 'setup',
      low: Math.round(ranges.travelGear[0] * mult.low),
      high: Math.round(ranges.travelGear[1] * mult.high),
      note: 'A crash-tested car harness or travel crate adds safety.',
      affiliateEligible: true,
    });
  }

  // Spay/neuter (one-time but often in first year)
  const spayNeuterCosts = { small: [200, 400], medium: [300, 500], large: [400, 650], giant: [500, 900] };
  setupItems.push({
    id: 'spayNeuter', label: 'Spay or neuter (planned)',
    category: 'setup',
    low: spayNeuterCosts[sizeKey][0],
    high: spayNeuterCosts[sizeKey][1],
    note: 'Timing varies — discuss with your vet. Low-cost clinics can reduce this significantly.',
    affiliateEligible: false,
  });

  // Recurring
  const foodMonthlyLow = Math.round((baseCosts.foodAnnual * mult.low) / 12);
  const foodMonthlyHigh = Math.round((baseCosts.foodAnnual * mult.high) / 12);
  recurringItems.push(
    { id: 'food', label: 'Dog food', category: 'recurring', low: foodMonthlyLow, high: foodMonthlyHigh, note: 'Puppies need life-stage appropriate food — check with your vet.', affiliateEligible: true },
    { id: 'treats', label: 'Training treats', category: 'recurring', low: 15, high: 40, note: 'High-value treats help with puppy training.', affiliateEligible: true },
    { id: 'vetRoutine', label: 'Routine vet visits', category: 'recurring', low: Math.round((baseCosts.vetAnnual * mult.low) / 12), high: Math.round((baseCosts.vetAnnual * mult.high) / 12), note: 'Puppy series vaccines, deworming, and wellness checks.', affiliateEligible: false },
  );

  if (includeInsurance) {
    const basePremium = getBreedInsuranceBaseMonthly(breed, data.actuarialRates);
    // Puppies often get better rates
    const ageFactor = getAgeFactor(data.ageFactors, puppyAgeMonths / 12);
    const stateMult = getStateMultiplier(data.statesIndex, stateCode);
    const insLow = Math.round(basePremium * ageFactor * stateMult * mult.low);
    const insHigh = Math.round(basePremium * ageFactor * stateMult * mult.high);
    recurringItems.push({
      id: 'insurance', label: 'Pet insurance (optional)',
      category: 'recurring',
      low: insLow,
      high: insHigh,
      note: 'Illustrative estimate — get quotes from insurers. Starting young often means lower premiums.',
      affiliateEligible: false,
    });
  }

  // Optional
  optionalItems.push(
    { id: 'trainingClass', label: 'Puppy training class', category: 'optional', low: 100, high: 300, note: 'Group classes are often more affordable. Usually a one-time cost.', affiliateEligible: false },
    { id: 'premiumBed', label: 'Premium orthopedic bed', category: 'optional', low: 60, high: 200, note: 'Worth it for large/giant breeds or senior planning.', affiliateEligible: true },
    { id: 'puzzleFeeders', label: 'Puzzle feeders and enrichment', category: 'optional', low: 20, high: 80, note: 'Great for active or intelligent breeds.', affiliateEligible: true },
    { id: 'camera', label: 'Pet camera', category: 'optional', low: 40, high: 150, note: 'Useful for monitoring a new puppy when you are away.', affiliateEligible: false },
  );

  // Calculate totals
  const setupTotal = setupItems.reduce((acc, i) => ({ low: acc.low + i.low, high: acc.high + i.high }), { low: 0, high: 0 });
  const recurringTotal = recurringItems.reduce((acc, i) => ({ low: acc.low + i.low, high: acc.high + i.high }), { low: 0, high: 0 });

  const firstMonthLow = setupTotal.low + recurringTotal.low;
  const firstMonthHigh = setupTotal.high + recurringTotal.high;
  const firstYearLow = setupTotal.low + recurringTotal.low * 12;
  const firstYearHigh = setupTotal.high + recurringTotal.high * 12;

  const nextActions: ToolNextAction[] = [
    { label: 'View full cost calculator', href: '/cost-calculator', type: 'cost', eventName: 'puppy_cost_to_calculator' },
    { label: 'Build your supplies checklist', href: '/tools/puppy-supplies', type: 'tool', eventName: 'puppy_cost_to_supplies' },
  ];
  if (breed) {
    nextActions.unshift({
      label: `View ${breed.name} breed guide`,
      href: `/breeds/${breed.slug}`,
      type: 'breed',
      eventName: 'puppy_cost_to_breed',
    });
    if (breed.flags.hasCostCalculator) {
      nextActions.push({
        label: `${breed.name} cost breakdown`,
        href: `/cost-calculator/${breed.slug}`,
        type: 'cost',
        eventName: 'puppy_cost_to_breed_calc',
      });
    }
  }

  return {
    title: breed ? `${breed.name} First-Year Cost Planner` : 'Puppy First-Year Cost Planner',
    breedName: breed?.name,
    stateCode,
    budgetMode,
    firstMonthLow,
    firstMonthHigh,
    firstYearLow,
    firstYearHigh,
    recurringMonthlyLow: recurringTotal.low,
    recurringMonthlyHigh: recurringTotal.high,
    setupItems,
    recurringItems,
    optionalItems,
    assumptions: [
      `Size category: ${sizeKey}`,
      `Budget mode: ${budgetMode}`,
      alreadyHasBasics ? 'You already have basic supplies — setup items reduced.' : 'Assumes starting from scratch.',
      includeInsurance ? 'Insurance estimate included as optional monthly recurring.' : 'Insurance not included.',
      stateCode ? `State: ${stateCode}` : 'No state selected — using national averages.',
      'Emergency vet costs and breed-specific health conditions are not included.',
    ],
    savingsTips: [
      'Buy food in bulk from reputable brands — often 15–20% cheaper than single bags.',
      'Preventive care (vaccines, dental, parasite prevention) costs much less than treating illness.',
      'Start insurance when your dog is a puppy — premiums are usually lower and pre-existing conditions are less of a concern.',
      'Rotate toys and introduce puzzle feeders to reduce boredom without constantly buying new ones.',
      'Look for low-cost spay/neuter clinics in your area — many nonprofits offer significant discounts.',
      'Group training classes offer similar results to private sessions at a fraction of the cost.',
    ],
    nextActions,
  };
}
