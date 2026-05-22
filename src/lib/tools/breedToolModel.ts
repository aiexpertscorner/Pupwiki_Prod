// src/lib/tools/breedToolModel.ts
// Converts NormalizedBreed records into compact, browser-safe ToolBreed shapes.
// The rest of the decision engine uses ToolBreed, never raw JSON.

import type { NormalizedBreed } from '../breeds/normalizeBreed';
import type { ToolBreed } from './toolTypes';

export function toToolBreed(breed: NormalizedBreed): ToolBreed {
  return {
    id: breed.id,
    slug: breed.slug,
    name: breed.name,
    type: breed.type,
    parentBreeds: breed.parentBreeds ?? [],

    sizeKey: breed.size.key,
    sizeLabel: breed.size.label,
    energyKey: breed.energy.key,
    energyLabel: breed.energy.label,
    sheddingKey: breed.shedding.key,
    sheddingLabel: breed.shedding.label,
    trainingKey: breed.training.key,
    trainingLabel: breed.training.label,
    coatKey: breed.coat.key,
    coatLabel: breed.coat.label,
    groupLabel: breed.group.label,
    originLabel: breed.origin.label,

    weightMin: breed.weight.min,
    weightMax: breed.weight.max,
    weightLabel: breed.weight.label,
    heightMin: breed.height.min,
    heightMax: breed.height.max,
    heightLabel: breed.height.label,
    lifespanMin: breed.lifespan.min,
    lifespanMax: breed.lifespan.max,
    lifespanMid: breed.lifespan.mid,
    lifespanLabel: breed.lifespan.label,

    popularityRank: breed.popularityRank > 0 ? breed.popularityRank : null,
    temperament: breed.temperament,
    description: breed.description,
    primaryImage: breed.primaryImage,
    imageAlt: breed.imageAlt,

    guideLinks: breed.guideLinks.map((g) => ({
      key: g.key,
      label: g.label,
      href: g.href,
      available: g.available,
      monetizable: g.monetizable,
    })),
    monetizationTags: breed.monetizationTags ?? [],

    flags: {
      isSmall: breed.flags.isSmall,
      isLarge: breed.flags.isLarge,
      isGiant: breed.flags.isGiant,
      isCalm: breed.flags.isCalm,
      isActive: breed.flags.isActive,
      isLowShedding: breed.flags.isLowShedding,
      isEasyToTrain: breed.flags.isEasyToTrain,
      isHardToTrain: breed.flags.isHardToTrain,
      isApartmentFriendly: breed.flags.isApartmentFriendly,
      isWorkingHeritage: breed.flags.isWorkingHeritage,
      isLongLiving: breed.flags.isLongLiving,
      hasHealthContext: breed.flags.hasHealthContext,
      hasCostCalculator: breed.flags.hasCostCalculator,
      hasFoodGuide: breed.flags.hasFoodGuide,
      hasHealthGuide: breed.flags.hasHealthGuide,
      hasTrainingGuide: breed.flags.hasTrainingGuide,
      hasMonetizableGuides: breed.flags.hasMonetizableGuides,
    },
  };
}

export function toToolBreeds(breeds: NormalizedBreed[]): ToolBreed[] {
  return breeds.map(toToolBreed);
}

export function findToolBreedBySlug(
  breeds: ToolBreed[],
  slug: string | undefined | null
): ToolBreed | null {
  if (!slug) return null;
  return breeds.find((b) => b.slug === slug) ?? null;
}

export function getBreedDisplayWeight(breed: ToolBreed): string {
  if (breed.weightMin !== null && breed.weightMax !== null) {
    return `${breed.weightMin}–${breed.weightMax} lbs`;
  }
  if (breed.weightLabel) return breed.weightLabel;
  return 'Weight unknown';
}

export function getBreedCostSizeKey(
  breed: ToolBreed
): 'small' | 'medium' | 'large' | 'giant' {
  const key = breed.sizeKey;
  if (key === 'small' || key === 'medium' || key === 'large' || key === 'giant') {
    return key;
  }
  return 'medium';
}
