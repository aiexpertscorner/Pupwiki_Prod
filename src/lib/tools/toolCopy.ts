// src/lib/tools/toolCopy.ts
// Safe, liability-aware copy helpers. Pure functions, no side effects.
// Uses careful language throughout — no "best", "guaranteed", "safe", "perfect".

import type { BudgetMode } from './toolTypes';

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Strong fit';
  if (score >= 70) return 'Good fit';
  if (score >= 55) return 'Possible fit';
  return 'Consider carefully';
}

export function getCostDisclaimer(): string {
  return 'Cost estimates are for planning only and are based on national averages. Actual costs vary by provider, location, lifestyle, and individual animal needs.';
}

export function getInsuranceDisclaimer(): string {
  return 'Insurance figures shown are illustrative estimates, not quotes. Contact pet insurance providers directly for accurate pricing. Premiums vary based on age, breed, location, coverage, and health history.';
}

export function getHealthDisclaimer(): string {
  return 'Health information is provided for general awareness only. It does not constitute veterinary advice. Always consult a qualified veterinarian for health-related decisions.';
}

export function getDataConfidenceNote(
  confidence: 'high' | 'medium' | 'low'
): string {
  if (confidence === 'high') return 'Strong data is available for this breed.';
  if (confidence === 'medium')
    return 'Some data for this breed is limited — use results as a starting point.';
  return 'Limited data is available for this breed. Treat all results as estimates and research further.';
}

export function formatCostRange(
  low: number,
  high: number,
  period?: 'month' | 'year'
): string {
  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
      : `$${Math.round(n)}`;
  const range = `${fmt(low)}–${fmt(high)}`;
  if (period === 'month') return `${range}/mo`;
  if (period === 'year') return `${range}/yr`;
  return range;
}

export function formatScorePercent(score: number): string {
  return `${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

export function getSoftFitLabel(
  fit: 'strong' | 'possible' | 'challenging' | 'needs-care'
): string {
  if (fit === 'strong') return 'Could be a strong fit';
  if (fit === 'possible') return 'May work with planning';
  if (fit === 'challenging') return 'Requires extra planning';
  return 'Needs careful consideration';
}

export function getBudgetLabel(mode: BudgetMode): string {
  if (mode === 'budget') return 'Budget-conscious';
  if (mode === 'premium') return 'Premium';
  return 'Balanced';
}

export function getActivityMatchLabel(
  userPref: string,
  breedLoad: string
): string {
  if (userPref === breedLoad || (userPref === 'very-active' && breedLoad === 'high')) {
    return 'Activity levels appear well matched.';
  }
  if (breedLoad === 'high') return 'This breed may need more exercise than expected.';
  if (breedLoad === 'low') return 'This breed tends toward a calmer activity level.';
  return 'Activity levels are close enough with planning.';
}

export function getConfidenceWarning(confidence: 'high' | 'medium' | 'low'): string | null {
  if (confidence === 'low') {
    return 'Some data is limited for this breed — use this as a starting point and research further.';
  }
  return null;
}
