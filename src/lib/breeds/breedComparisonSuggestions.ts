/**
 * src/lib/breeds/breedComparisonSuggestions.ts
 *
 * Finds similar breeds with a human-readable reason and key difference.
 * Replaces the inline similar-breed logic in [breed].astro.
 */

import type { NormalizedBreed } from './normalizeBreed';

export interface SimilarBreed extends NormalizedBreed {
  similarityReason: string;
  keyDifference: string;
  similarityScore: number;
}

function score(target: NormalizedBreed, candidate: NormalizedBreed): number {
  let s = 0;
  if (candidate.size.key === target.size.key) s += 3;
  if (candidate.energy.key === target.energy.key) s += 2;
  if (candidate.training.key === target.training.key) s += 1;
  if (candidate.shedding.key === target.shedding.key) s += 1;
  if (candidate.coat.key === target.coat.key) s += 1;
  if (candidate.group.key === target.group.key) s += 1;
  if (candidate.type === target.type) s += 1;
  // Slight popularity boost for well-known breeds
  if (candidate.popularityRank > 0 && candidate.popularityRank <= 50) s += 1;
  return s;
}

function similarityReason(target: NormalizedBreed, candidate: NormalizedBreed): string {
  const matched: string[] = [];
  if (candidate.size.key === target.size.key) matched.push(`${candidate.size.label.toLowerCase()} size`);
  if (candidate.energy.key === target.energy.key) matched.push(`${candidate.energy.label.toLowerCase()} energy`);
  if (candidate.group.key === target.group.key && candidate.group.key !== 'unknown') matched.push(`${candidate.group.label} group`);
  if (candidate.training.key === target.training.key) matched.push(`${candidate.training.label.toLowerCase()} training profile`);
  if (matched.length === 0) matched.push('comparable size and temperament range');
  return `Similar ${matched.slice(0, 2).join(' and ')}`;
}

function keyDifference(target: NormalizedBreed, candidate: NormalizedBreed): string {
  if (candidate.shedding.key !== target.shedding.key) {
    return `${candidate.shedding.label} shedding vs ${target.shedding.label}`;
  }
  if (candidate.coat.key !== target.coat.key) {
    return `${candidate.coat.label} coat vs ${target.coat.label}`;
  }
  if (candidate.energy.key !== target.energy.key) {
    return `${candidate.energy.label} energy vs ${target.energy.label}`;
  }
  if (candidate.training.key !== target.training.key) {
    return `${candidate.training.label} to train vs ${target.training.label}`;
  }
  if (candidate.group.key !== target.group.key && candidate.group.key !== 'unknown') {
    return `${candidate.group.label} group`;
  }
  return 'Different breed background and history';
}

export function getSimilarBreeds(
  target: NormalizedBreed,
  all: NormalizedBreed[],
  max = 5,
): SimilarBreed[] {
  return all
    .filter((b) => b.slug !== target.slug)
    .map((b) => ({ breed: b, s: score(target, b) }))
    .filter(({ s }) => s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map(({ breed, s }) => ({
      ...breed,
      similarityReason: similarityReason(target, breed),
      keyDifference: keyDifference(target, breed),
      similarityScore: s,
    }));
}
