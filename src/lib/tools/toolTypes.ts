// src/lib/tools/toolTypes.ts
// Shared type foundation for the PupWiki Decision Engine.
// No logic, no data imports — types only.

export type HomeType = 'apartment' | 'house' | 'rural';
export type YardAccess = 'none' | 'shared' | 'private';
export type ActivityPreference = 'calm' | 'moderate' | 'active' | 'very-active';
export type ExperienceLevel = 'first-time' | 'some' | 'experienced';
export type ToleranceLevel = 'low' | 'medium' | 'high';
export type BudgetMode = 'budget' | 'balanced' | 'premium';
export type DogAgeStage = 'puppy' | 'adult' | 'senior';
export type HouseholdKids = 'none' | 'young' | 'older' | 'mixed';
export type OtherPets = 'none' | 'dogs' | 'cats' | 'dogs-and-cats';

export interface DogDecisionProfile {
  homeType: HomeType;
  yardAccess: YardAccess;
  activityPreference: ActivityPreference;
  dailyExerciseMinutes: number;
  dailyTrainingMinutes: number;
  experienceLevel: ExperienceLevel;
  householdKids: HouseholdKids;
  otherPets: OtherPets;
  groomingTolerance: ToleranceLevel;
  sheddingTolerance: ToleranceLevel;
  trainingCommitment: ToleranceLevel;
  budgetMode: BudgetMode;
  preferredSize: 'any' | 'small' | 'medium' | 'large' | 'giant';
  stateCode?: string;
  dogAgeStage?: DogAgeStage;
  goals: string[];
}

export interface ToolBreedGuideLink {
  key: string;
  label: string;
  href: string;
  available: boolean;
  monetizable: boolean;
}

export interface ToolBreed {
  id: string;
  slug: string;
  name: string;
  type: 'purebred' | 'mixed';
  parentBreeds: { name: string; slug?: string }[];

  sizeKey: string;
  sizeLabel: string;
  energyKey: string;
  energyLabel: string;
  sheddingKey: string;
  sheddingLabel: string;
  trainingKey: string;
  trainingLabel: string;
  coatKey: string;
  coatLabel: string;
  groupLabel: string;
  originLabel: string;

  weightMin: number | null;
  weightMax: number | null;
  weightLabel: string | null;
  heightMin: number | null;
  heightMax: number | null;
  heightLabel: string | null;
  lifespanMin: number | null;
  lifespanMax: number | null;
  lifespanMid: number | null;
  lifespanLabel: string | null;

  popularityRank: number | null;
  temperament: string;
  description: string;
  primaryImage: string;
  imageAlt: string;

  guideLinks: ToolBreedGuideLink[];
  monetizationTags: string[];

  flags: {
    isSmall: boolean;
    isLarge: boolean;
    isGiant: boolean;
    isCalm: boolean;
    isActive: boolean;
    isLowShedding: boolean;
    isEasyToTrain: boolean;
    isHardToTrain: boolean;
    isApartmentFriendly: boolean;
    isWorkingHeritage: boolean;
    isLongLiving: boolean;
    hasHealthContext: boolean;
    hasCostCalculator: boolean;
    hasFoodGuide: boolean;
    hasHealthGuide: boolean;
    hasTrainingGuide: boolean;
    hasMonetizableGuides: boolean;
  };
}

export interface BreedDecisionSignals {
  activityLoad: 'low' | 'moderate' | 'high';
  groomingLoad: 'low' | 'moderate' | 'high';
  sheddingLoad: 'low' | 'moderate' | 'high';
  trainingComplexity: 'easy' | 'moderate' | 'hard';
  estimatedCostLoad: 'low' | 'medium' | 'high' | 'very-high';
  apartmentFit: 'strong' | 'possible' | 'challenging';
  firstTimeOwnerFit: 'strong' | 'possible' | 'challenging';
  familyPlanningFit: 'strong' | 'possible' | 'needs-care';
  careComplexity: 'low' | 'moderate' | 'high';
  dataConfidence: 'high' | 'medium' | 'low';
}

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  reason: string;
  severity?: 'positive' | 'neutral' | 'warning';
}

export interface ToolNextAction {
  label: string;
  href: string;
  type: 'breed' | 'tool' | 'guide' | 'cost' | 'shopping';
  eventName?: string;
}

export interface BreedMatchResult {
  breed: ToolBreed;
  signals: BreedDecisionSignals;
  score: number;
  scoreLabel: string;
  bestFor: string[];
  factors: ScoreFactor[];
  reasons: string[];
  tradeoffs: string[];
  assumptions: string[];
  nextActions: ToolNextAction[];
}

export interface CostBreakdownItem {
  key: string;
  label: string;
  monthlyLow?: number;
  monthlyHigh?: number;
  annualLow?: number;
  annualHigh?: number;
  oneTimeLow?: number;
  oneTimeHigh?: number;
  note: string;
}

export interface DogCostEstimate {
  breedSlug?: string;
  breedName?: string;
  stateCode?: string;
  budgetMode: BudgetMode;
  monthlyLow: number;
  monthlyHigh: number;
  annualLow: number;
  annualHigh: number;
  firstYearLow: number;
  firstYearHigh: number;
  lifetimeLow?: number;
  lifetimeHigh?: number;
  breakdown: CostBreakdownItem[];
  assumptions: string[];
  disclaimers: string[];
}

export type PuppyChecklistCategory =
  | 'before-arrival'
  | 'first-week'
  | 'first-month'
  | 'later'
  | 'skip-unless-needed';

export type PuppyChecklistPriority = 'must-have' | 'recommended' | 'optional' | 'conditional';

export interface PuppyChecklistItem {
  id: string;
  label: string;
  category: PuppyChecklistCategory;
  priority: PuppyChecklistPriority;
  why: string;
  sizeHint?: string;
  budgetHint?: string;
  safetyNote?: string;
  shoppingIntentTag?: string;
  affiliateEligible: boolean;
}

export interface CostEngineData {
  actuarialRates: unknown;
  ageFactors: unknown;
  statesIndex: unknown;
}

export interface HealthProfile {
  breed_slug: string;
  common_issues: {
    name: string;
    severity: string;
    prevalence: string;
    early_warning: string;
  }[];
  care_tips: string;
}
