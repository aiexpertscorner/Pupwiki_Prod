#!/usr/bin/env node
/**
 * scripts/content/backfill-ranking-data.mjs
 *
 * Fills ranking_data for the 191 breeds missing it using fields already
 * present in master-breeds.json (weight, life_expectancy, traits, akc_group).
 *
 * Fields derived:
 *   intelligence_rank / intelligence_pct / intelligence_label  — from trainability_value
 *   longevity_years                                            — from life_expectancy avg
 *   annual_food_cost                                           — from weight bucket
 *   lifetime_cost_usd                                          — food + non-food × longevity
 *   purchase_price_usd                                         — size-category median
 *   children_score                                             — from demeanor_value
 *   overall_score                                              — composite
 *   breed_type                                                 — from akc_group
 *   genetic_ailments / genetic_ailment_names                   — left null (needs research)
 *
 * Usage:
 *   node scripts/content/backfill-ranking-data.mjs          # dry-run (print summary)
 *   node scripts/content/backfill-ranking-data.mjs --apply  # write master-breeds.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BREEDS_PATH = join(ROOT, 'src', 'data', 'master-breeds.json');

const APPLY = process.argv.includes('--apply');

// ─── Lookup tables ────────────────────────────────────────────────────────────

const AKC_GROUP_TO_BREED_TYPE = {
  'Herding Group': 'herding',
  'Hound Group': 'hound',
  'Non-Sporting Group': 'non-sporting',
  'Sporting Group': 'sporting',
  'Terrier Group': 'terrier',
  'Toy Group': 'toy',
  'Working Group': 'working',
  'Foundation Stock Service': 'non-sporting',
  'Miscellaneous Class': 'non-sporting',
};

// Annual food cost medians per size (observed from 86 existing entries, $/yr)
const ANNUAL_FOOD_BY_SIZE = {
  small: 350,
  medium: 440,
  large: 520,
  giant: 680,
};

// Non-food annual cost baseline (vet, supplies, grooming) by size ($/yr)
const NON_FOOD_ANNUAL_BY_SIZE = {
  small: 1200,
  medium: 1470,
  large: 1600,
  giant: 1900,
};

// Typical purchase price medians by size
const PURCHASE_PRICE_BY_SIZE = {
  small: 780,
  medium: 900,
  large: 870,
  giant: 1050,
};

// Intelligence labels by rank tier
const INTELLIGENCE_TIERS = [
  { maxRank: 10, label: 'Brightest', pct: '100' },
  { maxRank: 26, label: 'Excellent', pct: '89' },
  { maxRank: 39, label: 'Above average', pct: '75' },
  { maxRank: 54, label: 'Average', pct: '60' },
  { maxRank: 69, label: 'Fair', pct: '45' },
  { maxRank: 80, label: 'Lowest', pct: '30' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashCode(str) {
  let h = 0;
  for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function lerp(t, fromArr, toArr) {
  for (let i = 0; i < fromArr.length - 1; i++) {
    if (t <= fromArr[i + 1]) {
      const f = (t - fromArr[i]) / (fromArr[i + 1] - fromArr[i]);
      return toArr[i] + f * (toArr[i + 1] - toArr[i]);
    }
  }
  return toArr[toArr.length - 1];
}

function getIntelligenceLabel(rank) {
  for (const tier of INTELLIGENCE_TIERS) {
    if (rank <= tier.maxRank) return { label: tier.label, pct: tier.pct };
  }
  return { label: 'Lowest', pct: '30' };
}

function deriveIntelligenceRank(breed) {
  const tv = breed.traits?.trainability_value ?? 0.5;
  // Map trainability → rough rank (inverted: high trainability = low rank number = better)
  const baseRank = Math.round(
    lerp(tv, [0, 0.3, 0.6, 0.8, 1.0], [72, 62, 48, 32, 18])
  );
  // Deterministic jitter so breeds don't all cluster at the same rank
  const jitter = (hashCode(breed.slug) % 9) - 4;
  return clamp(baseRank + jitter, 1, 80);
}

function deriveLongevity(breed) {
  const le = breed.life_expectancy;
  if (!le || le.min == null || le.max == null) return 11;
  return Math.round((le.min + le.max) / 2) - 1; // observed offset vs raw avg
}

function deriveAnnualFoodCost(breed) {
  return ANNUAL_FOOD_BY_SIZE[breed.size_category] ?? 466;
}

function deriveLifetimeCost(breed, annualFood, longevity) {
  const nonFood = NON_FOOD_ANNUAL_BY_SIZE[breed.size_category] ?? 1470;
  return Math.round((annualFood + nonFood) * longevity);
}

function derivePurchasePrice(breed) {
  const base = PURCHASE_PRICE_BY_SIZE[breed.size_category] ?? 900;
  // Grooming-intensive breeds typically cost more
  const groomingPremium = (breed.traits?.grooming_value ?? 0) >= 0.8 ? 200 : 0;
  return base + groomingPremium;
}

function deriveChildrenScore(breed) {
  const dv = breed.traits?.demeanor_value ?? 0.6;
  if (dv >= 0.85) return 1;
  if (dv >= 0.55) return 2;
  return 3;
}

function deriveOverallScore(breed, childrenScore) {
  const tv = breed.traits?.trainability_value ?? 0.5;
  const dv = breed.traits?.demeanor_value ?? 0.6;
  const ev = breed.traits?.energy_value ?? 0.6;
  // Approximate observed range (1.0–3.64, lower = easier/more suitable)
  const raw = 1 + (1 - tv) * 0.8 + (1 - dv) * 0.5 + ev * 0.25 + childrenScore * 0.25;
  return Math.round(raw * 100) / 100;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const breeds = JSON.parse(readFileSync(BREEDS_PATH, 'utf8'));

let updated = 0;
let skipped = 0;

for (const breed of breeds) {
  if (breed.ranking_data) {
    skipped++;
    continue;
  }

  const rank = deriveIntelligenceRank(breed);
  const { label: intelligenceLabel, pct: intelligencePct } = getIntelligenceLabel(rank);
  const longevity = deriveLongevity(breed);
  const annualFood = deriveAnnualFoodCost(breed);
  const lifetimeCost = deriveLifetimeCost(breed, annualFood, longevity);
  const purchasePrice = derivePurchasePrice(breed);
  const childrenScore = deriveChildrenScore(breed);
  const overallScore = deriveOverallScore(breed, childrenScore);
  const breedType = AKC_GROUP_TO_BREED_TYPE[breed.akc_group] ?? 'non-sporting';

  breed.ranking_data = {
    intelligence_rank: rank,
    intelligence_pct: intelligencePct,
    intelligence_label: intelligenceLabel,
    lifetime_cost_usd: lifetimeCost,
    annual_food_cost: annualFood,
    purchase_price_usd: purchasePrice,
    longevity_years: longevity,
    genetic_ailments: null,
    genetic_ailment_names: null,
    children_score: childrenScore,
    overall_score: overallScore,
    breed_type: breedType,
    _derived: true,
  };

  updated++;
}

console.log(`\nRanking data backfill`);
console.log(`  Already had data: ${skipped}`);
console.log(`  Filled in:        ${updated}`);
console.log(`  Total breeds:     ${breeds.length}`);

if (APPLY) {
  writeFileSync(BREEDS_PATH, JSON.stringify(breeds, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Written to ${BREEDS_PATH}`);
} else {
  console.log(`\n(dry run — pass --apply to write)`);
  // Preview 3 samples
  console.log('\nSample output (3 breeds):');
  const samples = breeds.filter(b => b.ranking_data?._derived).slice(0, 3);
  for (const b of samples) {
    console.log(`  ${b.name}: rank=${b.ranking_data.intelligence_rank} label="${b.ranking_data.intelligence_label}" food=$${b.ranking_data.annual_food_cost} lifetime=$${b.ranking_data.lifetime_cost_usd} longevity=${b.ranking_data.longevity_years}yr`);
  }
}
