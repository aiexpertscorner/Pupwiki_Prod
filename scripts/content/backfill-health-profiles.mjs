#!/usr/bin/env node
/**
 * scripts/content/backfill-health-profiles.mjs
 *
 * Expands breed-health-profiles.json from 20 profiles to ~90+ by deriving
 * structured profiles from ranking_data.genetic_ailment_names in master-breeds.json.
 *
 * Tier 1: Breeds that have ranking_data.genetic_ailment_names
 *   → keyword-match each condition name to a structured issue entry
 * Tier 2: Breeds with no genetic data but belonging to high-risk AKC groups
 *   → assign group-level baseline conditions (giant breeds: bloat+hips; brachycephalic: BOAS)
 *
 * All derived profiles are flagged with "_derived: true" for editorial review.
 * Existing manually-researched profiles are NEVER overwritten.
 *
 * Usage:
 *   node scripts/content/backfill-health-profiles.mjs          # dry-run
 *   node scripts/content/backfill-health-profiles.mjs --apply  # write output
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BREEDS_PATH = join(ROOT, 'src', 'data', 'master-breeds.json');
const PROFILES_PATH = join(ROOT, 'src', 'data', 'breed-health-profiles.json');

const APPLY = process.argv.includes('--apply');

// ─── Condition keyword → structured issue mapping ─────────────────────────────

const AILMENT_MAP = {
  hip: {
    name: 'Hip Dysplasia',
    severity: 'Medium-High',
    prevalence: 'High',
    early_warning: 'Stiffness when rising, reluctance to exercise, bunny-hopping gait',
  },
  elbow: {
    name: 'Elbow Dysplasia',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Front leg lameness, swelling below the elbow, reluctance to extend the foreleg',
  },
  eye: {
    name: 'Progressive Retinal Atrophy / Eye Conditions',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Night blindness, hesitancy in dim light, bumping into furniture',
  },
  heart: {
    name: 'Cardiac Disease',
    severity: 'High',
    prevalence: 'Medium',
    early_warning: 'Exercise intolerance, nighttime coughing, reduced stamina, fainting',
  },
  bloat: {
    name: 'Gastric Dilatation-Volvulus (Bloat)',
    severity: 'Critical',
    prevalence: 'Medium',
    early_warning: 'Distended abdomen, unproductive retching, drooling, restlessness after eating',
  },
  spine: {
    name: 'Spinal / Intervertebral Disc Disease',
    severity: 'High',
    prevalence: 'Medium',
    early_warning: 'Back or neck pain, reluctance to jump, hind limb weakness or dragging',
  },
  nerve: {
    name: 'Degenerative Myelopathy',
    severity: 'High',
    prevalence: 'Medium',
    early_warning: 'Progressive hind limb weakness, loss of coordination, knuckling of paws',
  },
  cancer: {
    name: 'Cancer',
    severity: 'Critical',
    prevalence: 'Medium-High',
    early_warning: 'Unexplained weight loss, visible lumps, lethargy, pale gums, laboured breathing',
  },
  skin: {
    name: 'Skin Conditions / Allergies',
    severity: 'Low',
    prevalence: 'Medium',
    early_warning: 'Redness, itching, hair loss, recurring ear or paw infections',
  },
  thyroid: {
    name: 'Hypothyroidism',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Weight gain without diet change, low energy, thinning coat, cold intolerance',
  },
  knee: {
    name: 'Patellar Luxation',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Skipping or hopping gait, occasional non-weight-bearing on one hind leg',
  },
  'blood clotting': {
    name: 'Von Willebrand Disease',
    severity: 'Medium',
    prevalence: 'Low',
    early_warning: 'Prolonged bleeding from minor cuts, bloody nose, blood in urine',
  },
  kidney: {
    name: 'Renal / Kidney Disease',
    severity: 'High',
    prevalence: 'Low',
    early_warning: 'Increased thirst and urination, weight loss, vomiting, poor appetite',
  },
  liver: {
    name: 'Portosystemic Shunt / Liver Conditions',
    severity: 'High',
    prevalence: 'Low',
    early_warning: 'Stunted growth, confusion, seizures, poor coat, sensitivity to anaesthesia',
  },
  breathing: {
    name: 'Brachycephalic Obstructive Airway Syndrome',
    severity: 'High',
    prevalence: 'Universal',
    early_warning: 'Noisy breathing, exercise intolerance, overheating, sleep apnoea',
  },
  deafness: {
    name: 'Congenital Deafness',
    severity: 'Medium',
    prevalence: 'Low',
    early_warning: 'Unresponsive to sound, startles easily when approached from behind',
  },
  epilepsy: {
    name: 'Epilepsy',
    severity: 'High',
    prevalence: 'Medium',
    early_warning: 'Seizures (twitching, paddling, loss of consciousness), post-ictal confusion',
  },
  pancreas: {
    name: 'Exocrine Pancreatic Insufficiency',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Weight loss despite good appetite, greasy or voluminous stools',
  },
  joint: {
    name: 'Degenerative Joint Disease',
    severity: 'Medium',
    prevalence: 'High',
    early_warning: 'Stiffness after rest, reluctance to climb stairs, decreased activity',
  },
  cushings: {
    name: "Cushing's Disease (Hyperadrenocorticism)",
    severity: 'Medium',
    prevalence: 'Low',
    early_warning: 'Pot-bellied appearance, excessive thirst, hair loss, lethargy',
  },
  patella: {
    name: 'Patellar Luxation',
    severity: 'Medium',
    prevalence: 'Medium',
    early_warning: 'Skipping gait, occasional hind leg lifting, cracking or popping sound at the knee',
  },
};

// Care tips keyed by the first matched condition type
const CARE_TIPS_BY_TYPE = {
  hip: 'OFA hip certification on both parent dogs is strongly recommended before purchase. Avoid forced running or jumping on growing puppies before 18 months.',
  elbow: 'Request OFA elbow ratings from the breeder. Weight management significantly reduces elbow strain as the dog ages.',
  eye: 'Annual CAER ophthalmology exams are advisable. Breeding stock should be screened by a board-certified ophthalmologist.',
  heart: 'Annual cardiac auscultation by a vet is recommended. Discuss cardiac screening by a cardiologist from age 3 onwards with your vet.',
  bloat: 'Feed 2–3 smaller meals daily rather than one large meal. Avoid vigorous exercise for one hour after eating. Discuss prophylactic gastropexy with your vet.',
  spine: 'Use ramps or steps instead of jumping on and off furniture. Prevent high-impact activities that stress the spine. Pet insurance is strongly recommended given the cost of spinal surgery.',
  cancer: 'Annual wellness exams and early detection are the best tools available. Discuss breed-specific cancer screening with your vet from age 6.',
  skin: 'Regular bathing with appropriate shampoos and year-round flea prevention help manage skin conditions. Discuss allergy testing if symptoms are persistent.',
  thyroid: 'Thyroid screening is straightforward via a blood test. Weight management is important — hypothyroid dogs gain weight easily.',
  knee: 'Maintain healthy body weight to reduce stress on the knee. Patellar luxation is graded 1–4; most grade 1–2 cases are managed without surgery.',
  breathing: 'Avoid exercise in hot or humid conditions. Keep the dog at a healthy weight — even mild obesity significantly worsens breathing symptoms in brachycephalic breeds.',
  default: 'Regular veterinary wellness exams — at least annually for dogs under 7, and twice yearly for seniors — are the best early warning system for breed-specific conditions.',
};

// Group-level baseline conditions for Tier 2 breeds
const GROUP_BASELINES = {
  'Working Group': [
    AILMENT_MAP.hip,
    AILMENT_MAP.bloat,
    AILMENT_MAP.joint,
  ],
  'Herding Group': [
    AILMENT_MAP.hip,
    AILMENT_MAP.eye,
    AILMENT_MAP.epilepsy,
  ],
  'Sporting Group': [
    AILMENT_MAP.hip,
    AILMENT_MAP.elbow,
    AILMENT_MAP.eye,
  ],
  'Hound Group': [
    AILMENT_MAP.hip,
    AILMENT_MAP.bloat,
    AILMENT_MAP.eye,
  ],
  'Terrier Group': [
    AILMENT_MAP.knee,
    AILMENT_MAP.skin,
    AILMENT_MAP.spine,
  ],
  'Toy Group': [
    AILMENT_MAP.knee,
    AILMENT_MAP.heart,
    AILMENT_MAP.spine,
  ],
  'Non-Sporting Group': [
    AILMENT_MAP.hip,
    AILMENT_MAP.skin,
    AILMENT_MAP.eye,
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const breeds = JSON.parse(readFileSync(BREEDS_PATH, 'utf8'));
const profilesData = JSON.parse(readFileSync(PROFILES_PATH, 'utf8'));

const existingSlugs = new Set(profilesData.profiles.map(p => p.breed_slug));
const newProfiles = [];
let tier1Count = 0;
let tier2Count = 0;

// Tier 1: Breeds with genetic_ailment_names
for (const breed of breeds) {
  if (existingSlugs.has(breed.slug)) continue;
  const names = breed.ranking_data?.genetic_ailment_names;
  if (!names || names === 'none') continue;

  const lc = names.toLowerCase();
  const issues = [];
  let firstKey = null;

  for (const [keyword, issue] of Object.entries(AILMENT_MAP)) {
    if (lc.includes(keyword)) {
      issues.push({ ...issue });
      if (!firstKey) firstKey = keyword;
      if (issues.length >= 4) break;
    }
  }

  if (issues.length === 0) continue;

  const careTips = CARE_TIPS_BY_TYPE[firstKey] ?? CARE_TIPS_BY_TYPE.default;

  newProfiles.push({
    breed_slug: breed.slug,
    common_issues: issues,
    care_tips: careTips,
    _derived: true,
    _derived_source: 'genetic_ailment_names',
  });

  existingSlugs.add(breed.slug);
  tier1Count++;
}

// Tier 2: Group-level baseline for breeds still missing profiles
for (const breed of breeds) {
  if (existingSlugs.has(breed.slug)) continue;
  const baseline = GROUP_BASELINES[breed.akc_group];
  if (!baseline) continue;

  // Detect brachycephalic breeds by known coat/breathing signals
  const isBrachy = ['french-bulldog', 'bulldog', 'pug', 'boston-terrier',
    'shih-tzu', 'boxer', 'pekingese', 'cavalier-king-charles-spaniel',
    'english-toy-spaniel', 'brussels-griffon', 'japanese-chin', 'affenpinscher',
  ].includes(breed.slug);

  const issues = isBrachy
    ? [AILMENT_MAP.breathing, AILMENT_MAP.heart, AILMENT_MAP.skin]
    : baseline.slice(0, 3);

  const firstKey = isBrachy ? 'breathing' : Object.keys(AILMENT_MAP).find(k =>
    baseline[0]?.name?.toLowerCase().includes(k)
  ) ?? 'default';

  newProfiles.push({
    breed_slug: breed.slug,
    common_issues: issues,
    care_tips: CARE_TIPS_BY_TYPE[firstKey] ?? CARE_TIPS_BY_TYPE.default,
    _derived: true,
    _derived_source: 'akc_group_baseline',
  });

  existingSlugs.add(breed.slug);
  tier2Count++;
}

console.log(`\nHealth profile backfill`);
console.log(`  Existing profiles:          ${profilesData.profiles.length}`);
console.log(`  Tier 1 (genetic_ailment_names): ${tier1Count}`);
console.log(`  Tier 2 (group baseline):        ${tier2Count}`);
console.log(`  Total after merge:          ${profilesData.profiles.length + newProfiles.length}`);

if (APPLY) {
  profilesData.profiles = [...profilesData.profiles, ...newProfiles];
  profilesData._meta.last_updated = new Date().toISOString().split('T')[0];
  writeFileSync(PROFILES_PATH, JSON.stringify(profilesData, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Written to ${PROFILES_PATH}`);
} else {
  console.log(`\n(dry run — pass --apply to write)`);
  if (newProfiles.length > 0) {
    console.log('\nSample derived profiles:');
    for (const p of newProfiles.slice(0, 3)) {
      console.log(`  ${p.breed_slug} [${p._derived_source}]: ${p.common_issues.map(i => i.name).join(', ')}`);
    }
  }
}
