import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const _aiCachePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/ai-breed-summaries.json');
let _aiSummaries = null;

const FAMILY_CONFIG = {
  food: {
    category: 'Dog Food',
    postType: 'product-roundup',
    sensitivity: 'high',
    monetizationIntent: 'food',
    contentTier: 'money',
    intent: 'dog food',
    titleTemplates: [
      { id: 'food-best-size', best: true, seo: (b, f) => `Best Dog Food for ${b.name}: ${cap(f.size)} Breed Picks`, h1: (b, f) => `Best dog food for ${b.name} by life stage and size` },
      { id: 'food-best-joint', best: true, seo: (b) => `Best Food for ${b.name} Joint and Weight Support`, h1: (b) => `${b.name} food picks for joint support and steady weight` },
      { id: 'food-best-sensitive', best: true, seo: (b) => `Best Dog Food for ${b.name} Sensitive Stomachs`, h1: (b) => `Food options to compare for ${b.name} sensitive stomachs` },
      { id: 'food-best-puppy-adult', best: true, seo: (b) => `Best ${b.name} Food for Puppy, Adult, and Senior Dogs`, h1: (b) => `${b.name} food guide for puppy, adult, and senior stages` },
      { id: 'food-guide-life-stage', seo: (b) => `${b.name} Food Guide: Formulas by Life Stage`, h1: (b) => `${b.name} nutrition guide by life stage` },
      { id: 'food-owner-shortlist', seo: (b) => `${b.name} Owners: Dog Foods to Compare First`, h1: (b) => `Dog foods ${b.name} owners should compare first` },
      { id: 'food-size-energy', seo: (b, f) => `${b.name} Nutrition Guide for ${cap(f.size)} ${cap(f.energy)} Dogs`, h1: (b, f) => `Nutrition notes for ${f.size} ${f.energy} ${b.name} dogs` },
      { id: 'food-feeding-routine', seo: (b) => `What to Feed a ${b.name}: Practical Food Picks`, h1: (b) => `What to feed a ${b.name}: practical food picks` },
      { id: 'food-buyer-checklist', seo: (b) => `${b.name} Dog Food Checklist for Safer Buying`, h1: (b) => `${b.name} dog food buyer checklist` },
      { id: 'food-weight-control', seo: (b) => `${b.name} Food Options for Weight and Digestion`, h1: (b) => `Food options for ${b.name} weight control and digestion` },
      { id: 'food-large-breed', seo: (b, f) => `${b.name} Dog Food for ${cap(f.size)} Breed Needs`, h1: (b, f) => `${b.name} dog food matched to ${f.size} breed needs` },
      { id: 'food-vet-questions', seo: (b) => `${b.name} Food Questions to Ask Your Vet`, h1: (b) => `Food questions ${b.name} owners should ask their vet` },
      { id: 'food-active-calm', seo: (b, f) => `${b.name} Food Guide for ${cap(f.energy)} Energy Levels`, h1: (b, f) => `${b.name} food guidance for ${f.energy} energy levels` },
      { id: 'food-formula-fit', seo: (b) => `${b.name} Formula Fit: Kibble, Protein, and Feeding Notes`, h1: (b) => `${b.name} formula fit: kibble, protein, and feeding notes` },
      { id: 'food-shopping', seo: (b) => `${b.name} Dog Food Shopping Guide`, h1: (b) => `${b.name} dog food shopping guide` },
      { id: 'food-nutrition-shortlist', seo: (b) => `${b.name} Nutrition Shortlist for Everyday Feeding`, h1: (b) => `${b.name} nutrition shortlist for everyday feeding` },
    ],
    descriptionTemplates: [
      (b, f) => `Compare dog food options for ${b.name} dogs using breed size, ${f.energy} energy, life stage, and health-sensitive buyer checks.`,
      (b, f) => `A practical ${b.name} food guide for ${f.size} dogs, with nutrition notes, joint-support context, and owner-friendly comparison checks.`,
      (b) => `Breed-aware food guidance for ${b.name} owners, including formula fit, feeding routine, and vet-check reminders.`,
      (b, f) => `Review ${b.name} dog food choices by life stage, weight control, digestion, and ${f.size}-breed needs.`,
    ],
    h2: (b) => ({
      comparison: `Food shortlist for ${b.name} owners`,
      why: `Why ${b.name} nutrition needs its own checklist`,
      picks: `${b.name} food picks and trade-offs`,
    }),
  },
  toys: {
    category: 'Toys',
    postType: 'product-roundup',
    sensitivity: 'medium',
    monetizationIntent: 'training',
    contentTier: 'money',
    intent: 'toys',
    titleTemplates: [
      { id: 'toys-best-enrichment', best: true, seo: (b) => `Best Toys for ${b.name}: Enrichment and Chew Picks`, h1: (b) => `Best toys for ${b.name} enrichment and play` },
      { id: 'toys-best-chewers', best: true, seo: (b) => `Best Toys for ${b.name} Chewers and Puzzle Play`, h1: (b) => `${b.name} toys for chewing, puzzle play, and downtime` },
      { id: 'toys-best-active', best: true, seo: (b, f) => `Best ${b.name} Toys for ${cap(f.energy)} Energy Dogs`, h1: (b, f) => `Toy picks for ${f.energy} ${b.name} dogs` },
      { id: 'toys-durable', seo: (b) => `Durable Toys for ${b.name}: Chew and Play Shortlist`, h1: (b) => `Durable toys to compare for ${b.name}` },
      { id: 'toys-guide-daily', seo: (b) => `${b.name} Toy Guide for Daily Enrichment`, h1: (b) => `${b.name} toy guide for daily enrichment` },
      { id: 'toys-owner-compare', seo: (b) => `${b.name} Owners: Toys to Compare First`, h1: (b) => `Toys ${b.name} owners should compare first` },
      { id: 'toys-puzzle', seo: (b) => `${b.name} Puzzle Toy and Chew Guide`, h1: (b) => `${b.name} puzzle toy and chew guide` },
      { id: 'toys-energy-fit', seo: (b, f) => `${b.name} Toys for ${cap(f.energy)} Dogs and Busy Minds`, h1: (b, f) => `${b.name} toys for ${f.energy} dogs and busy minds` },
      { id: 'toys-safe-play', seo: (b) => `${b.name} Toy Safety and Enrichment Checklist`, h1: (b) => `${b.name} toy safety and enrichment checklist` },
      { id: 'toys-indoor-outdoor', seo: (b) => `${b.name} Toys for Indoor Play, Fetch, and Chewing`, h1: (b) => `${b.name} toys for indoor play, fetch, and chewing` },
      { id: 'toys-training', seo: (b) => `${b.name} Training Toy Shortlist`, h1: (b) => `${b.name} training toy shortlist` },
      { id: 'toys-boredom', seo: (b) => `${b.name} Boredom Toys Worth Comparing`, h1: (b) => `${b.name} boredom toys worth comparing` },
    ],
    descriptionTemplates: [
      (b, f) => `Compare toys for ${b.name} dogs by ${f.energy} energy, chewing style, safe play, and enrichment value.`,
      (b) => `A breed-aware ${b.name} toy guide covering puzzle toys, chews, fetch, and daily enrichment routines.`,
      (b) => `Shortlist practical toys for ${b.name} owners with durability, safety, and boredom prevention in view.`,
    ],
    h2: (b) => ({
      comparison: `Toy shortlist for ${b.name} owners`,
      why: `How to choose toys for a ${b.name}`,
      picks: `${b.name} toy picks and trade-offs`,
    }),
  },
  beds: {
    category: 'Beds',
    postType: 'product-roundup',
    sensitivity: 'medium',
    monetizationIntent: 'cost',
    contentTier: 'money',
    intent: 'beds',
    titleTemplates: [
      { id: 'beds-best-support', best: true, seo: (b) => `Best Beds for ${b.name}: Support and Size Picks`, h1: (b) => `Best beds for ${b.name} support and sizing` },
      { id: 'beds-best-ortho', best: true, seo: (b) => `Best Orthopedic Beds for ${b.name}`, h1: (b) => `Orthopedic beds to compare for ${b.name}` },
      { id: 'beds-best-large-small', best: true, seo: (b, f) => `Best Dog Beds for ${cap(f.size)} ${b.name} Dogs`, h1: (b, f) => `Dog beds for ${f.size} ${b.name} dogs` },
      { id: 'beds-best-washable', best: true, seo: (b) => `Best Washable Beds for ${b.name}`, h1: (b) => `Washable beds worth comparing for ${b.name}` },
      { id: 'beds-guide-sleep', seo: (b) => `${b.name} Bed Guide: Sleep, Joints, and Cleanup`, h1: (b) => `${b.name} bed guide for sleep, joints, and cleanup` },
      { id: 'beds-owner-compare', seo: (b) => `${b.name} Owners: Beds to Compare Before Buying`, h1: (b) => `Beds ${b.name} owners should compare before buying` },
      { id: 'beds-sizing', seo: (b, f) => `${b.name} Bed Sizing Guide for ${cap(f.size)} Dogs`, h1: (b, f) => `${b.name} bed sizing guide for ${f.size} dogs` },
      { id: 'beds-senior', seo: (b) => `${b.name} Beds for Senior Comfort and Joint Support`, h1: (b) => `${b.name} beds for senior comfort and joint support` },
      { id: 'beds-durable', seo: (b) => `${b.name} Dog Bed Durability Checklist`, h1: (b) => `${b.name} dog bed durability checklist` },
      { id: 'beds-home', seo: (b) => `Dog Beds for ${b.name}: Home, Crate, and Travel`, h1: (b) => `Dog beds for ${b.name}: home, crate, and travel` },
      { id: 'beds-cooling', seo: (b) => `${b.name} Beds for Cooling, Comfort, and Cleanup`, h1: (b) => `${b.name} beds for cooling, comfort, and cleanup` },
      { id: 'beds-shopping', seo: (b) => `${b.name} Dog Bed Shopping Guide`, h1: (b) => `${b.name} dog bed shopping guide` },
    ],
    descriptionTemplates: [
      (b, f) => `Compare bed options for ${b.name} dogs by ${f.size} sizing, support, washable covers, and long-term durability.`,
      (b) => `A practical ${b.name} bed guide covering supportive comfort, sleep style, cleanup, and everyday home fit.`,
      (b) => `Shortlist dog beds for ${b.name} owners with joint comfort, crate fit, travel use, and cover care in view.`,
    ],
    h2: (b) => ({
      comparison: `Bed shortlist for ${b.name} owners`,
      why: `What a ${b.name} needs from a dog bed`,
      picks: `${b.name} bed picks and trade-offs`,
    }),
  },
  grooming: {
    category: 'Grooming',
    postType: 'product-roundup',
    sensitivity: 'medium',
    monetizationIntent: 'grooming',
    contentTier: 'money',
    intent: 'grooming',
    titleTemplates: [
      { id: 'groom-best-tools', best: true, seo: (b) => `Best Grooming Tools for ${b.name}`, h1: (b) => `Best grooming tools for ${b.name}` },
      { id: 'groom-best-coat', best: true, seo: (b, f) => `Best ${b.name} Grooming Tools for ${cap(f.coat)} Coats`, h1: (b, f) => `${b.name} grooming tools for ${f.coat} coats` },
      { id: 'groom-best-brush', best: true, seo: (b) => `Best Brushes and Shampoo for ${b.name}`, h1: (b) => `Brushes and shampoo to compare for ${b.name}` },
      { id: 'groom-best-shedding', best: true, seo: (b) => `Best Grooming Picks for ${b.name} Shedding`, h1: (b) => `Grooming picks for ${b.name} shedding` },
      { id: 'groom-kit', seo: (b) => `${b.name} Grooming Kit: Brushes, Shampoo, Nail Tools`, h1: (b) => `${b.name} grooming kit for coat, bath, and nails` },
      { id: 'groom-guide', seo: (b) => `${b.name} Grooming Guide by Coat Type`, h1: (b) => `${b.name} grooming guide by coat type` },
      { id: 'groom-owner-checklist', seo: (b) => `${b.name} Grooming Checklist for Home Care`, h1: (b) => `${b.name} grooming checklist for home care` },
      { id: 'groom-coat-care', seo: (b, f) => `${b.name} Coat Care Guide for ${cap(f.coat)} Fur`, h1: (b, f) => `${b.name} coat care guide for ${f.coat} fur` },
      { id: 'groom-bath', seo: (b) => `${b.name} Bathing, Brushing, and Nail Care Guide`, h1: (b) => `${b.name} bathing, brushing, and nail care guide` },
      { id: 'groom-shopping', seo: (b) => `${b.name} Grooming Shopping Guide`, h1: (b) => `${b.name} grooming shopping guide` },
      { id: 'groom-routine', seo: (b) => `${b.name} Grooming Routine and Tool Shortlist`, h1: (b) => `${b.name} grooming routine and tool shortlist` },
      { id: 'groom-sensitive-skin', seo: (b) => `${b.name} Grooming for Shedding and Sensitive Skin`, h1: (b) => `${b.name} grooming for shedding and sensitive skin` },
    ],
    descriptionTemplates: [
      (b, f) => `Compare grooming tools for ${b.name} dogs by ${f.coat} coat type, shedding, bath routine, and nail-care needs.`,
      (b) => `A breed-aware ${b.name} grooming guide covering brushes, shampoo, nail tools, and home-care routines.`,
      (b, f) => `Shortlist ${b.name} grooming products with coat care, ${f.coat} fur, handling, and cleanup in view.`,
    ],
    h2: (b) => ({
      comparison: `Grooming tool shortlist for ${b.name} owners`,
      why: `How ${b.name} coat care changes the tool choice`,
      picks: `${b.name} grooming picks and trade-offs`,
    }),
  },
  supplements: {
    category: 'Supplements',
    postType: 'product-roundup',
    sensitivity: 'high',
    monetizationIntent: 'vet-care',
    contentTier: 'money',
    intent: 'supplements',
    titleTemplates: [
      { id: 'supp-best-careful', best: true, seo: (b) => `Best Supplements for ${b.name}: Careful Buyer Shortlist`, h1: (b) => `Supplement options to discuss for ${b.name}` },
      { id: 'supp-best-joint', best: true, seo: (b) => `Best Joint Supplements for ${b.name}`, h1: (b) => `Joint supplements to ask your vet about for ${b.name}` },
      { id: 'supp-best-skin-gut', best: true, seo: (b) => `Best Skin and Gut Supplements for ${b.name}`, h1: (b) => `Skin and gut supplement options for ${b.name}` },
      { id: 'supp-best-senior', best: true, seo: (b) => `Best Senior Supplements for ${b.name}`, h1: (b) => `Senior supplement questions for ${b.name}` },
      { id: 'supp-guide-vet', seo: (b) => `${b.name} Supplement Guide: What to Ask Your Vet`, h1: (b) => `${b.name} supplement guide: what to ask your vet` },
      { id: 'supp-owner-checklist', seo: (b) => `${b.name} Supplement Checklist for Safer Buying`, h1: (b) => `${b.name} supplement checklist for safer buying` },
      { id: 'supp-joint-skin-gut', seo: (b) => `${b.name} Supplements for Joints, Skin, and Gut Health`, h1: (b) => `${b.name} supplements for joints, skin, and gut health` },
      { id: 'supp-medication', seo: (b) => `${b.name} Supplement Safety and Medication Questions`, h1: (b) => `${b.name} supplement safety and medication questions` },
      { id: 'supp-active', seo: (b, f) => `${b.name} Supplement Guide for ${cap(f.energy)} Dogs`, h1: (b, f) => `${b.name} supplement guide for ${f.energy} dogs` },
      { id: 'supp-shopping', seo: (b) => `${b.name} Supplement Shopping Guide`, h1: (b) => `${b.name} supplement shopping guide` },
      { id: 'supp-evidence', seo: (b) => `${b.name} Supplements: Evidence, Labels, and Vet Checks`, h1: (b) => `${b.name} supplements: evidence, labels, and vet checks` },
      { id: 'supp-care-plan', seo: (b) => `${b.name} Supplement Care Plan Questions`, h1: (b) => `${b.name} supplement care plan questions` },
    ],
    descriptionTemplates: [
      (b) => `Health-sensitive supplement guidance for ${b.name} owners, with joint, skin, gut, medication, and vet-check reminders.`,
      (b, f) => `Compare supplement categories for ${b.name} dogs while keeping ${f.size}-breed needs and veterinary advice in view.`,
      (b) => `A careful ${b.name} supplement guide focused on safety, labels, evidence, and questions to ask your veterinarian.`,
    ],
    h2: (b) => ({
      comparison: `Supplement shortlist for ${b.name} owners`,
      why: `How to think about supplements for a ${b.name}`,
      picks: `${b.name} supplement categories and cautions`,
    }),
  },
  health: {
    category: 'Health',
    postType: 'health',
    sensitivity: 'high',
    monetizationIntent: 'vet-care',
    contentTier: 'support',
    intent: 'health',
    titleTemplates: [
      { id: 'health-problems', seo: (b) => `${b.name} Health Problems: Risks and Screening`, h1: (b) => `${b.name} health problems: risks and screening` },
      { id: 'health-guide', seo: (b) => `${b.name} Health Guide: Common Issues to Watch`, h1: (b) => `${b.name} health guide: common issues to watch` },
      { id: 'health-owner-notes', seo: (b) => `Health Concerns in ${b.name}: Owner Notes`, h1: (b) => `Health concerns in ${b.name}: owner notes` },
      { id: 'health-vet-questions', seo: (b) => `${b.name} Vet Questions for Common Health Risks`, h1: (b) => `${b.name} vet questions for common health risks` },
      { id: 'health-screening', seo: (b) => `${b.name} Screening and Prevention Checklist`, h1: (b) => `${b.name} screening and prevention checklist` },
      { id: 'health-insurance', seo: (b) => `${b.name} Health Risks and Insurance Timing`, h1: (b) => `${b.name} health risks and insurance timing` },
      { id: 'health-size-risk', seo: (b, f) => `${b.name} Health Risks for ${cap(f.size)} Dogs`, h1: (b, f) => `${b.name} health risks for ${f.size} dogs` },
      { id: 'health-lifespan', seo: (b) => `${b.name} Lifespan, Health Risks, and Vet Care`, h1: (b) => `${b.name} lifespan, health risks, and vet care` },
      { id: 'health-prevention', seo: (b) => `${b.name} Preventive Care and Warning Signs`, h1: (b) => `${b.name} preventive care and warning signs` },
      { id: 'health-breeder', seo: (b) => `${b.name} Health Clearances to Ask Breeders About`, h1: (b) => `${b.name} health clearances to ask breeders about` },
      { id: 'health-practical', seo: (b) => `${b.name} Health Notes for Practical Owners`, h1: (b) => `${b.name} health notes for practical owners` },
      { id: 'health-conditions', seo: (b) => `${b.name} Common Conditions and Care Planning`, h1: (b) => `${b.name} common conditions and care planning` },
    ],
    descriptionTemplates: [
      (b) => `Health-sensitive ${b.name} guidance covering common risks, screening questions, insurance timing, and veterinary follow-up.`,
      (b, f) => `A practical overview of ${b.name} health risks, ${f.size}-breed concerns, prevention habits, and when to ask a vet.`,
      (b) => `Review ${b.name} health concerns, warning signs, breeder questions, and care-planning notes for owners.`,
    ],
    h2: (b) => ({
      comparison: `${b.name} health risk overview`,
      why: `Why ${b.name} owners should plan health care early`,
      picks: `${b.name} prevention, screening, and care notes`,
    }),
  },
  training: {
    category: 'Training',
    postType: 'how-to',
    sensitivity: 'medium',
    monetizationIntent: 'training',
    contentTier: 'support',
    intent: 'training',
    titleTemplates: [
      { id: 'training-how-to', seo: (b) => `How to Train a ${b.name}: Practical Roadmap`, h1: (b) => `How to train a ${b.name}: practical roadmap` },
      { id: 'training-guide', seo: (b) => `${b.name} Training Guide: Recall, Leash, and Manners`, h1: (b) => `${b.name} training guide for recall, leash, and manners` },
      { id: 'training-foundation', seo: (b) => `Training a ${b.name}: Foundation Plan`, h1: (b) => `Training a ${b.name}: foundation plan` },
      { id: 'training-puppy', seo: (b) => `${b.name} Puppy Training Checklist`, h1: (b) => `${b.name} puppy training checklist` },
      { id: 'training-leash', seo: (b) => `${b.name} Leash Training and Recall Guide`, h1: (b) => `${b.name} leash training and recall guide` },
      { id: 'training-energy', seo: (b, f) => `${b.name} Training Plan for ${cap(f.energy)} Dogs`, h1: (b, f) => `${b.name} training plan for ${f.energy} dogs` },
      { id: 'training-owner', seo: (b) => `${b.name} Owner Training Checklist`, h1: (b) => `${b.name} owner training checklist` },
      { id: 'training-social', seo: (b) => `${b.name} Socialisation and Obedience Guide`, h1: (b) => `${b.name} socialisation and obedience guide` },
      { id: 'training-gear', seo: (b) => `${b.name} Training Gear and First Skills`, h1: (b) => `${b.name} training gear and first skills` },
      { id: 'training-mistakes', seo: (b) => `${b.name} Training Mistakes and Better Fixes`, h1: (b) => `${b.name} training mistakes and better fixes` },
      { id: 'training-routine', seo: (b) => `${b.name} Daily Training Routine`, h1: (b) => `${b.name} daily training routine` },
      { id: 'training-temperament', seo: (b) => `${b.name} Training by Temperament and Drive`, h1: (b) => `${b.name} training by temperament and drive` },
    ],
    descriptionTemplates: [
      (b, f) => `Build a ${b.name} training routine around ${f.energy} energy, breed temperament, leash skills, recall, and safe equipment choices.`,
      (b) => `A practical ${b.name} training plan covering foundation cues, socialisation, leash work, and common owner mistakes.`,
      (b) => `Train a ${b.name} with a structured roadmap for puppy foundations, recall, manners, enrichment, and gear checks.`,
    ],
    h2: (b) => ({
      comparison: `${b.name} training equipment shortlist`,
      why: `How ${b.name} temperament shapes training`,
      picks: `${b.name} training plan and common mistakes`,
    }),
  },
};

const PREFIXES = [
  ['food', 'best-food-for-'],
  ['toys', 'best-toys-for-'],
  ['beds', 'best-bed-for-'],
  ['grooming', 'best-grooming-for-'],
  ['supplements', 'best-supplements-for-'],
  ['training', 'training-a-'],
];

function hash(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list, seed) {
  return list[hash(seed) % list.length];
}

function cap(value) {
  const text = String(value || 'All').replace(/[-_]+/g, ' ');
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function clean(value, fallback) {
  const text = String(value || '').trim().replace(/[-_]+/g, ' ');
  return text || fallback;
}

function numberRange(range, unit) {
  if (!range || typeof range !== 'object') return '';
  const min = Number(range.min_lbs ?? range.min_in ?? range.min);
  const max = Number(range.max_lbs ?? range.max_in ?? range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  return min === max ? `${min} ${unit}` : `${min}-${max} ${unit}`;
}

function sentenceFromList(values, fallback) {
  const cleanValues = values
    .flatMap((value) => String(value || '').split(/[,;]+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (cleanValues.length === 0) return fallback;
  if (cleanValues.length === 1) return cleanValues[0];
  return `${cleanValues.slice(0, -1).join(', ')} and ${cleanValues.at(-1)}`;
}

function getHomeFit(size, energy) {
  if (/toy|small/i.test(size) && /calm|low|regular/i.test(energy)) return 'small-home friendly when daily walks and play are consistent';
  if (/large|giant/i.test(size) && /active|high/i.test(energy)) return 'best matched with room to move, regular outdoor time, and predictable recovery space';
  if (/active|high/i.test(energy)) return 'happiest with owners who can make movement and training part of the day';
  return 'well suited to a steady home routine with daily walks, rest, and gentle enrichment';
}

function getHandlingNote(training) {
  if (/easy|eager|high/i.test(training)) return 'usually responds well to short, upbeat sessions and clear household rules';
  if (/independent|stubborn|hard|challenging/i.test(training)) return 'benefits from patient repetition, calm boundaries, and rewards that feel worth working for';
  return 'does best when training stays short, kind, and consistent';
}

function normalizeBreedPhrase(text, breed = {}) {
  const name = String(breed.name || '').trim();
  if (!name || !name.endsWith(' Dog')) return text;
  return String(text).replaceAll(`${name} dogs`, `${name}s`).replaceAll(`${name} Dogs`, `${name}s`);
}

function normalizeHeadings(headings, breed) {
  return Object.fromEntries(
    Object.entries(headings).map(([key, value]) => [key, normalizeBreedPhrase(value, breed)])
  );
}

export function getBreedFacets(breed = {}) {
  const healthBlob = [
    breed.primary_health_concern,
    breed.ranking_data?.genetic_ailment_names,
    breed.health_note,
  ].filter(Boolean).join(' ');
  const size = clean(breed.size_category, 'all-size');
  const energy = clean(breed.energy_level, 'regular');
  const coat = clean(breed.coat_type, 'mixed');
  const training = clean(breed.training_level, 'moderate');
  const weight = numberRange(breed.weight, 'lb');
  const height = numberRange(breed.height, 'in');
  const life = numberRange(breed.life_expectancy, 'years');
  const temperament = sentenceFromList([breed.temperament], 'steady companion temperament');

  return {
    size,
    energy,
    coat,
    training,
    health: healthBlob || 'general wellness',
    weight,
    height,
    life,
    group: clean(breed.akc_group, 'companion dog'),
    temperament,
    homeFit: getHomeFit(size, energy),
    handlingNote: getHandlingNote(training),
    bodyContext: [weight && `typical adult weight around ${weight}`, height && `height around ${height}`, life && `life expectancy around ${life}`].filter(Boolean).join('; '),
    coatCare: `${coat} coat care`,
  };
}

export function getPseoFamilyConfig(familyKey) {
  return FAMILY_CONFIG[familyKey] || null;
}

export function getPseoFamilyFromFilename(filename) {
  for (const [familyKey, prefix] of PREFIXES) {
    if (filename.startsWith(prefix)) {
      return {
        familyKey,
        breedSlug: filename.slice(prefix.length).replace(/\.md$/, ''),
      };
    }
  }

  if (filename.endsWith('-health-problems.md')) {
    return {
      familyKey: 'health',
      breedSlug: filename.replace(/-health-problems\.md$/, ''),
    };
  }

  return null;
}

export function buildPseoCopy(familyKey, breed = {}) {
  const config = getPseoFamilyConfig(familyKey);
  if (!config) throw new Error(`Unknown PSEO family: ${familyKey}`);

  const facets = getBreedFacets(breed);
  const titleTemplate = pick(config.titleTemplates, `${breed.slug}:${familyKey}:title`);
  const descriptionTemplate = pick(config.descriptionTemplates, `${breed.slug}:${familyKey}:description`);
  const headings = normalizeHeadings(config.h2(breed, facets), breed);

  return {
    familyKey,
    titlePattern: titleTemplate.id,
    titleStartsBest: Boolean(titleTemplate.best),
    seoTitle: normalizeBreedPhrase(titleTemplate.seo(breed, facets), breed),
    displayTitle: normalizeBreedPhrase(titleTemplate.h1(breed, facets), breed),
    description: normalizeBreedPhrase(descriptionTemplate(breed, facets), breed),
    category: config.category,
    postType: config.postType,
    claimSensitivity: config.sensitivity,
    monetizationIntent: config.monetizationIntent,
    contentTier: config.contentTier,
    reviewMethod: config.postType === 'product-roundup' ? 'product-data-comparison' : 'editorial-research',
    medicalDisclaimer: config.sensitivity === 'high',
    headings,
    intent: config.intent,
    facets,
  };
}

export function getAllPseoFamilyKeys() {
  return Object.keys(FAMILY_CONFIG);
}

export function getAISummary(breedSlug) {
  if (!_aiSummaries) {
    try {
      _aiSummaries = existsSync(_aiCachePath)
        ? JSON.parse(readFileSync(_aiCachePath, 'utf-8'))
        : {};
    } catch {
      _aiSummaries = {};
    }
  }
  return _aiSummaries[breedSlug]?.summary || '';
}
