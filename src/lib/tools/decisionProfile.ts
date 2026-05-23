// src/lib/tools/decisionProfile.ts
// Normalize user form input into a stable DogDecisionProfile.
// Pure functions only — no browser APIs.

import type {
  DogDecisionProfile,
  HomeType,
  YardAccess,
  ActivityPreference,
  ExperienceLevel,
  ToleranceLevel,
  BudgetMode,
  HouseholdKids,
  OtherPets,
} from './toolTypes';

const VALID_HOME_TYPES: HomeType[] = ['apartment', 'house', 'rural'];
const VALID_YARD_ACCESS: YardAccess[] = ['none', 'shared', 'private'];
const VALID_ACTIVITY: ActivityPreference[] = ['calm', 'moderate', 'active', 'very-active'];
const VALID_EXPERIENCE: ExperienceLevel[] = ['first-time', 'some', 'experienced'];
const VALID_TOLERANCE: ToleranceLevel[] = ['low', 'medium', 'high'];
const VALID_BUDGET: BudgetMode[] = ['budget', 'balanced', 'premium'];
const VALID_KIDS: HouseholdKids[] = ['none', 'young', 'older', 'mixed'];
const VALID_PETS: OtherPets[] = ['none', 'dogs', 'cats', 'dogs-and-cats'];
const VALID_SIZES = ['any', 'small', 'medium', 'large', 'giant'] as const;
const VALID_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  if (options.includes(value as T)) return value as T;
  return fallback;
}

export function getDefaultDogDecisionProfile(): DogDecisionProfile {
  return {
    homeType: 'house',
    yardAccess: 'shared',
    activityPreference: 'moderate',
    dailyExerciseMinutes: 45,
    dailyTrainingMinutes: 10,
    experienceLevel: 'first-time',
    householdKids: 'none',
    otherPets: 'none',
    groomingTolerance: 'medium',
    sheddingTolerance: 'medium',
    trainingCommitment: 'medium',
    budgetMode: 'balanced',
    preferredSize: 'any',
    stateCode: 'CA',
    dogAgeStage: 'puppy',
    goals: [],
  };
}

export function normalizeDecisionProfile(
  input: Partial<DogDecisionProfile>
): DogDecisionProfile {
  const defaults = getDefaultDogDecisionProfile();
  return {
    homeType: oneOf(input.homeType, VALID_HOME_TYPES, defaults.homeType),
    yardAccess: oneOf(input.yardAccess, VALID_YARD_ACCESS, defaults.yardAccess),
    activityPreference: oneOf(input.activityPreference, VALID_ACTIVITY, defaults.activityPreference),
    dailyExerciseMinutes: clamp(
      typeof input.dailyExerciseMinutes === 'number' ? input.dailyExerciseMinutes : defaults.dailyExerciseMinutes,
      0,
      240
    ),
    dailyTrainingMinutes: clamp(
      typeof input.dailyTrainingMinutes === 'number' ? input.dailyTrainingMinutes : defaults.dailyTrainingMinutes,
      0,
      120
    ),
    experienceLevel: oneOf(input.experienceLevel, VALID_EXPERIENCE, defaults.experienceLevel),
    householdKids: oneOf(input.householdKids, VALID_KIDS, defaults.householdKids),
    otherPets: oneOf(input.otherPets, VALID_PETS, defaults.otherPets),
    groomingTolerance: oneOf(input.groomingTolerance, VALID_TOLERANCE, defaults.groomingTolerance),
    sheddingTolerance: oneOf(input.sheddingTolerance, VALID_TOLERANCE, defaults.sheddingTolerance),
    trainingCommitment: oneOf(input.trainingCommitment, VALID_TOLERANCE, defaults.trainingCommitment),
    budgetMode: oneOf(input.budgetMode, VALID_BUDGET, defaults.budgetMode),
    preferredSize: oneOf(input.preferredSize, VALID_SIZES, defaults.preferredSize),
    stateCode: typeof input.stateCode === 'string' && VALID_STATE_CODES.has(input.stateCode.toUpperCase())
      ? input.stateCode.toUpperCase()
      : defaults.stateCode,
    dogAgeStage: input.dogAgeStage ?? defaults.dogAgeStage,
    goals: Array.isArray(input.goals) ? input.goals.filter((g) => typeof g === 'string') : [],
  };
}

export function getProfileSummary(profile: DogDecisionProfile): string[] {
  const lines: string[] = [];

  if (profile.homeType === 'apartment') lines.push('Apartment living');
  else if (profile.homeType === 'rural') lines.push('Rural/acreage living');
  else lines.push('House with yard access');

  if (profile.activityPreference === 'very-active') {
    lines.push(`Very active lifestyle (${profile.dailyExerciseMinutes}+ min/day)`);
  } else if (profile.activityPreference === 'active') {
    lines.push(`Active lifestyle (${profile.dailyExerciseMinutes}+ min/day)`);
  } else if (profile.activityPreference === 'calm') {
    lines.push('Calm/low-activity lifestyle');
  } else {
    lines.push(`Moderate activity (${profile.dailyExerciseMinutes} min/day)`);
  }

  if (profile.experienceLevel === 'first-time') lines.push('First-time dog owner');
  else if (profile.experienceLevel === 'experienced') lines.push('Experienced dog owner');

  if (profile.householdKids === 'young' || profile.householdKids === 'mixed') {
    lines.push('Household with young children');
  }

  const budgetMap: Record<BudgetMode, string> = {
    budget: 'Budget-conscious',
    balanced: 'Balanced budget',
    premium: 'Premium budget',
  };
  lines.push(budgetMap[profile.budgetMode]);

  return lines;
}

export function getProfileStorageKey(): string {
  return 'pupwiki_decision_profile';
}
