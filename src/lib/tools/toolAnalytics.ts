// src/lib/tools/toolAnalytics.ts
// No-op-safe GA4 event wrapper for tool pages.
// All functions are void and never throw.
// Guards all calls with typeof window check and try/catch.

import type { DogDecisionProfile } from './toolTypes';

export function trackToolEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag;
  if (typeof gtag !== 'function') return;
  try {
    (gtag as Function)('event', eventName, {
      event_category: 'tools',
      ...params,
    });
  } catch {
    // Never let analytics break a tool.
  }
}

export function trackBreedMatchStart(profile: Partial<DogDecisionProfile>): void {
  trackToolEvent('breed_match_start', {
    home_type: profile.homeType,
    activity: profile.activityPreference,
    experience: profile.experienceLevel,
    budget: profile.budgetMode,
    size_pref: profile.preferredSize,
  });
}

export function trackBreedMatchResult(topBreedSlug: string, score: number): void {
  trackToolEvent('breed_match_result', {
    top_breed: topBreedSlug,
    top_score: score,
  });
}

export function trackBreedCompare(slugs: string[]): void {
  trackToolEvent('breed_compare', {
    breeds: slugs.join(','),
    count: slugs.length,
  });
}

export function trackCostEstimate(
  breedSlug: string | undefined,
  stateCode: string | undefined
): void {
  trackToolEvent('cost_estimate', {
    breed: breedSlug ?? 'none',
    state: stateCode ?? 'none',
  });
}

export function trackPuppyCostStart(): void {
  trackToolEvent('puppy_cost_start');
}

export function trackSuppliesChecklistView(breedSlug: string | undefined): void {
  trackToolEvent('supplies_checklist_view', {
    breed: breedSlug ?? 'none',
  });
}
