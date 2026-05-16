#!/usr/bin/env node
/**
 * AWIN-led PSEO generator for PupWiki.
 *
 * Purpose:
 * - Generate a small set of rich commerce cluster pages from current joined/active AWIN programmes.
 * - Keep breed-specific generation manual/reviewed.
 * - Never fail production build when used through the CI wrapper script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeMonetizationIntent,
  normalizeReviewMethod,
  sanitizePublicDogCopy,
} from '../lib/public-content-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply');
const INCLUDE_EXISTING = process.argv.includes('--include-existing');
const MODE = getArg('mode') || 'clusters';
const LIMIT = Number(getArg('limit') || 10);
const CLUSTER_LIMIT = Number(getArg('cluster-limit') || LIMIT);
const BREED_LIMIT = Number(getArg('breed-limit') || LIMIT);
const MIN_PROGRAMS = Number(getArg('min-programs') || 1);

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}
function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}
function writeJson(rel, data) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function quote(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
function yamlList(values) {
  return `[${Array.from(new Set((values || []).filter(Boolean).map(String))).map(quote).join(', ')}]`;
}
function clean(value) {
  return sanitizePublicDogCopy(String(value || '')).replace(/\s+/g, ' ').trim();
}
function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
const awin = readJson('src/data/awin-programs.json', { programs: [] });
const products = readJson('src/data/awin-products.json', []);
const backlog = readJson('src/data/pseo-opportunity-backlog.json', { items: [] });
const breeds = [...readJson('src/data/master-breeds.json', []), ...readJson('src/data/master-crossbreeds.json', [])];
const aiSummaries = readJson('src/data/ai-breed-summaries.json', {}); // cached AI summaries (empty = not yet generated)
const existing = new Set(walk(BLOG_DIR).filter((file) => file.endsWith('.md')).map((file) => path.basename(file, '.md')));
const programs = (awin.programs || []).filter((program) => program.relationship === 'joined' && program.isActive !== false);

const RULES = [
  {
    slug: 'dog-food-nutrition-partners',
    title: 'Dog Food, Toppers and Feeding Help',
    tags: ['food', 'nutrition', 'feeding', 'fresh-food', 'raw-food', 'sensitive-stomach', 'broth', 'allergies', 'appliances'],
    amazonQueries: ['dog food storage container', 'slow feeder dog bowl', 'dog broth topper', 'freeze dried raw dog food'],
    internalTargets: ['/categories/dog-food', '/categories/puppy', '/categories/senior-dogs', '/breeds', '/cost-calculator'],
    intent: 'food',
    sensitivity: 'high',
    intro: 'Use this guide to compare dog food, toppers, storage, feeding tools and nutrition services by life stage, ingredient fit, preparation time, budget and veterinary context.',
  },
  {
    slug: 'dog-training-gear-safety-partners',
    title: 'Dog Training, Walking and Safety Help',
    tags: ['training', 'behavior', 'obedience', 'recall', 'leash', 'harness', 'working', 'active', 'gear', 'safety', 'fence'],
    amazonQueries: ['no pull dog harness', 'long leash recall training', 'dog training treats', 'dog training clicker'],
    internalTargets: ['/categories/training', '/categories/dog-services', '/categories/puppy', '/categories/travel', '/breeds'],
    intent: 'training',
    sensitivity: 'medium',
    intro: 'Use this guide to compare training support, walking gear, recall practice, containment, active-dog routines and safer outings without treating gear as a shortcut for kind training.',
  },
  {
    slug: 'personalized-dog-gifts-lifestyle-partners',
    title: 'Personalized Dog Gifts and Everyday Dog Life',
    tags: ['gift', 'lifestyle', 'portrait', 'memorial', 'dog-names', 'apparel', 'accessories', 'id', 'license'],
    amazonQueries: ['personalized dog gifts', 'custom dog portrait', 'dog owner gifts', 'personalized dog id tag'],
    internalTargets: ['/categories/lifestyle', '/dog-names', '/categories/pupwiki-partners', '/breeds'],
    intent: 'lifestyle',
    sensitivity: 'low',
    intro: 'Use this guide to compare personalized gifts, portraits, IDs, accessories and dog-owner keepsakes by meaning, quality, timing, sizing and everyday usefulness.',
  },
  {
    slug: 'dog-beds-comfort-home-partners',
    title: 'Dog Beds, Comfort and Home Setup',
    tags: ['beds', 'bed', 'comfort', 'home', 'sleep', 'orthopedic', 'senior-dog'],
    amazonQueries: ['orthopedic dog bed washable cover', 'washable dog crate bed', 'senior dog bed', 'cooling dog bed'],
    internalTargets: ['/categories/beds', '/categories/senior-dogs', '/categories/puppy', '/breeds'],
    intent: 'cost',
    sensitivity: 'medium',
    intro: 'Use this guide to compare beds, crate comfort, washable covers, senior comfort, cooling, travel rest and household setup by the dog\'s size and sleep style.',
  },
  {
    slug: 'dog-health-wellness-adjacent-partners',
    title: 'Dog Health, Wellness and Vet-Care Planning',
    tags: ['health', 'wellness', 'care', 'nutrition', 'supplements', 'vet', 'insurance'],
    amazonQueries: ['dog first aid kit', 'dog dental care kit', 'senior dog comfort supplies'],
    internalTargets: ['/categories/health', '/categories/dog-services', '/categories/senior-dogs', '/categories/insurance', '/disclosure'],
    intent: 'vet-care',
    sensitivity: 'high',
    intro: 'Use this guide to compare health-adjacent resources, wellness routines, insurance timing and vet-care planning while keeping medical decisions with a veterinarian.',
  },
  {
    slug: 'dog-services-care-planning',
    title: 'Dog Services, Local Care and Booking Questions',
    tags: ['service', 'services', 'vet', 'telehealth', 'grooming', 'training', 'boarding', 'walking', 'daycare', 'insurance', 'subscription'],
    amazonQueries: [],
    internalTargets: ['/categories/dog-services', '/categories/health', '/categories/training', '/categories/grooming', '/categories/insurance', '/breeds'],
    intent: 'service',
    sensitivity: 'high',
    intro: 'Use this guide to compare dog services such as vet support, insurance, grooming appointments, training help, walking, boarding and care subscriptions. Later local pages can connect this same structure to maps and nearby providers.',
  },
  {
    slug: 'puppy-essentials-partners',
    title: 'Puppy Essentials and New Dog Setup',
    tags: ['puppy', 'puppy-food', 'puppy-training', 'puppy-supplies', 'new-dog', 'crate-training', 'socialization'],
    amazonQueries: ['puppy food small breed', 'puppy crate training', 'puppy training treats', 'puppy starter kit'],
    internalTargets: ['/categories/puppy', '/categories/training', '/categories/dog-food', '/breeds', '/blog'],
    intent: 'puppy',
    sensitivity: 'medium',
    intro: 'Use this guide to compare puppy-specific food, training support, crate setup, socialization tools and early-life care decisions by breed size, age stage and owner experience level.',
  },
  {
    slug: 'senior-dog-care-partners',
    title: 'Senior Dog Care, Comfort and Vet Planning',
    tags: ['senior', 'senior-dog', 'senior-dogs', 'joint-health', 'senior-food', 'aging', 'geriatric', 'mobility'],
    amazonQueries: ['senior dog food joint health', 'orthopedic dog bed large breed', 'dog joint supplement glucosamine', 'senior dog ramp stairs'],
    internalTargets: ['/categories/senior-dogs', '/categories/health', '/categories/beds', '/categories/supplements', '/breeds'],
    intent: 'senior',
    sensitivity: 'high',
    intro: 'Use this guide to compare senior-dog food, joint care, mobility aids, comfortable bedding and vet-care planning while keeping medical decisions with a veterinarian.',
  },
  {
    slug: 'dog-insurance-and-vet-planning',
    title: 'Dog Insurance and Vet-Care Planning',
    tags: ['insurance', 'vet', 'health-plan', 'wellness-plan', 'pet-insurance', 'telehealth', 'emergency-vet'],
    amazonQueries: ['dog first aid kit emergency', 'pet emergency fund tracker', 'dog vaccination record book'],
    internalTargets: ['/cost-calculator', '/categories/health', '/categories/insurance', '/categories/dog-services', '/breeds'],
    intent: 'insurance',
    sensitivity: 'high',
    intro: 'Use this guide to compare pet insurance options, wellness plans and vet-care cost planning. Breed-specific conditions, waiting periods, exclusions and annual limits all affect total value.',
  },
];

// ─── Breed-attribute-driven content sections ──────────────────────────────────

function lifeExpStr(breed) {
  const life = breed?.life_expectancy;
  if (!life?.min && !life?.max) return null;
  return life.min === life.max ? `${life.min} years` : `${life.min}–${life.max} years`;
}

function buildHealthRisks(breed) {
  const t = getBreedTraits(breed);
  const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').trim();
  const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
  const lifeStr = lifeExpStr(breed);

  if (!ailmentNames || ailmentCount === 0) {
    return `### Common health concerns for ${t.name}s\n\nNo breed-specific genetic ailments are currently documented for the ${t.name}${lifeStr ? ` (typical life expectancy: ${lifeStr})` : ''}. Standard preventive care — annual vet checks, dental hygiene, parasite prevention, and weight management — applies to all breeds. Discuss appropriate screening schedules with your vet.`;
  }

  const ailmentList = ailmentNames.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const bulletList = ailmentList.map((a) => `- **${a.charAt(0).toUpperCase() + a.slice(1)}**: Ask your vet about recommended screening and prevention for this condition in ${t.name}s.`).join('\n');

  return `### Common health concerns for ${t.name}s

${t.name}s have ${ailmentCount} documented genetic health condition${ailmentCount !== 1 ? 's' : ''}: ${ailmentNames}.${lifeStr ? ` Typical life expectancy is ${lifeStr}.` : ''}

${bulletList}

> **Important:** This list is drawn from breed-level genetic data and does not predict what any individual dog will experience. Only a vet can assess your dog's specific health risk based on exam findings, parentage, and history.`;
}

function buildCostContext(breed) {
  const t = getBreedTraits(breed);
  const rd = breed?.ranking_data || {};
  const lifetimeCost = rd.lifetime_cost_usd;
  const annualFood = rd.annual_food_cost;
  const purchasePrice = rd.purchase_price_usd;

  if (!lifetimeCost && !annualFood && !purchasePrice) return '';

  const parts = [];
  if (purchasePrice) parts.push(`**Typical purchase price:** $${Number(purchasePrice).toLocaleString()} (varies by breeder quality and region)`);
  if (annualFood) parts.push(`**Annual food cost:** ~$${Number(annualFood).toLocaleString()} for a ${t.size}-sized ${t.name}`);
  if (lifetimeCost) parts.push(`**Estimated lifetime cost:** ~$${Number(lifetimeCost).toLocaleString()} (food, vet, grooming, and supplies — excludes major unexpected costs)`);

  return `### Cost context for ${t.name} owners\n\n${parts.join('\n')}\n\nThese figures are estimates from aggregated ownership data. Actual costs vary significantly by region, individual health, and care choices. Use the [PupWiki cost calculator](/cost-calculator/${breed.slug}) for a personalised estimate.`;
}

function buildCareTips(breed, maxTips = 4) {
  const t = getBreedTraits(breed);
  const tips = Array.isArray(breed?.care_tips) ? breed.care_tips : [];
  if (tips.length === 0) return '';
  const bulletList = tips.slice(0, maxTips).map((tip) => `- ${tip}`).join('\n');
  return `### Care tips for ${t.name} owners\n\n${bulletList}`;
}

function getBreedTraits(breed) {
  const size = (breed?.size_category || breed?.size || 'medium').toLowerCase();
  const energy = (breed?.energy_level || breed?.traits?.energy_level || 'moderate').toLowerCase();
  const coat = (breed?.coat_type || breed?.traits?.coat_type || 'short').toLowerCase();
  const shedding = (breed?.shedding_level || breed?.traits?.shedding_level || 'moderate').toLowerCase();
  const training = (breed?.training_level || breed?.traits?.training_level || 'moderate').toLowerCase();
  const health = breed?.primary_health_concern || '';
  const name = breed?.name || 'This breed';
  const wMin = breed?.weight?.min_lbs ?? breed?.weight?.imperial?.min;
  const wMax = breed?.weight?.max_lbs ?? breed?.weight?.imperial?.max;
  const weightStr = (wMin || wMax)
    ? (wMin && wMax && wMin !== wMax ? `${wMin}–${wMax} lbs` : `${wMin || wMax} lbs`)
    : null;
  const isSmall = /toy|small/i.test(size);
  const isLarge = /large|giant/i.test(size);
  const isActive = /high|active|very active/i.test(energy);
  const isCalm = /low|calm|sedentary/i.test(energy);
  const isEasyTrain = /easy|eager|high/i.test(training);
  const isHardTrain = /independent|stubborn|challenging|hard/i.test(training);
  const isHighShed = /high|heavy/i.test(shedding);
  const isDoubleCoat = /double/i.test(coat);
  return { size, energy, coat, shedding, training, health, name, weightStr, isSmall, isLarge, isActive, isCalm, isEasyTrain, isHardTrain, isHighShed, isDoubleCoat };
}

function buildWhatToLookFor(breed, commerceCluster, pseoFamily) {
  const t = getBreedTraits(breed);
  const family = pseoFamily || (commerceCluster || '').replace('dog-', '').replace('-partners', '').replace('-nutrition', '').split('-')[0];

  if (family === 'food' || commerceCluster === 'dog-food-nutrition-partners') {
    const sizeNote = t.isSmall
      ? `Small and toy breeds like the ${t.name} have fast metabolisms — look for formulas with calorie-dense kibble sized for smaller jaws, and avoid large-breed blends designed for slower growth rates.`
      : t.isLarge
      ? `Large breeds benefit from formulas with a controlled calcium-to-phosphorus ratio. Look for products specifically labelled for large or giant breeds, as these manage growth rate and joint load more carefully.`
      : `Medium breeds like the ${t.name} do well on standard adult maintenance formulas. Prioritise a named protein source in the first ingredient and an AAFCO adequacy statement for the right life stage.`;
    const energyNote = t.isActive
      ? `${t.name}s are active dogs — a higher-protein formula (26–30% crude protein) supports muscle maintenance and sustained energy through their exercise demands.`
      : t.isCalm
      ? `${t.name}s tend toward lower activity — choose a formula with controlled fat content to avoid the weight gain that commonly affects lower-energy breeds over time.`
      : `Match calorie density to your individual dog's actual activity level, not just the breed average — a less active ${t.name} needs fewer calories than an athletic one.`;
    const coatNote = (t.isHighShed || t.isDoubleCoat)
      ? `${t.name}s shed seasonally — look for formulas that include omega-3 fatty acids (EPA/DHA from salmon or fish oil) to support coat health from the inside out.`
      : '';
    // Breed health conditions note
    const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').toLowerCase();
    const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
    let ailmentNote = '';
    if (/hip|elbow|joint/.test(ailmentNames)) {
      ailmentNote = `${t.name}s have a documented risk of joint conditions. Formulas with added glucosamine and chondroitin offer a convenient way to support joint health alongside the diet.`;
    } else if (ailmentCount >= 3) {
      ailmentNote = `${t.name}s carry ${ailmentCount} known genetic health conditions — discuss with your vet whether any specific nutritional adjustments make sense for your individual dog.`;
    }
    return `### What to look for in food for a ${t.name}\n\n${sizeNote} ${energyNote}${coatNote ? ' ' + coatNote : ''}${ailmentNote ? ' ' + ailmentNote : ''}`;
  }

  if (family === 'beds' || commerceCluster === 'dog-beds-comfort-home-partners') {
    const sizeNote = t.isSmall
      ? `Measure your ${t.name} when fully stretched — add 12 inches to that length for the ideal sleep surface. Smaller breeds often prefer bolster or donut-style beds that let them curl up, rather than flat mats.`
      : t.isLarge
      ? `Large breeds need beds with a usable sleep surface of at least 40–48 inches. Look for memory foam or orthopedic foam rather than fibrefill, which compresses flat under heavier dogs within months.`
      : `Mid-size breeds like the ${t.name} do well in rectangular flat beds (30–36 inch) with a removable washable cover. Washability matters more than most buyers expect — plan to launder every 2–3 weeks.`;
    const ageNote = `Orthopedic foam matters most once your ${t.name} reaches 7+ years — earlier than most owners expect for medium breeds. If your dog is already showing joint stiffness, prioritise pressure-relief foam over aesthetics.`;
    const durabilityNote = t.isActive
      ? `Active ${t.name}s tend to dig and circle before lying down — look for beds with reinforced stitching at the corners and a water-resistant inner liner to extend the usable lifespan.`
      : `Choose a cover with a zipper rather than a slip-on sleeve so the insert stays in place even when your ${t.name} rearranges it overnight.`;
    return `### What to look for in a bed for a ${t.name}\n\n${sizeNote} ${ageNote} ${durabilityNote}`;
  }

  if (family === 'grooming' || commerceCluster === 'dog-grooming-care-partners') {
    const coatNote = t.isHighShed || t.isDoubleCoat
      ? `The ${t.name} is a heavy shedder — a slicker brush for surface debris and an undercoat rake for the dense undercoat are both essential, not optional. Plan for deshedding sessions at least twice weekly during peak shedding seasons.`
      : /curly|wavy|long/i.test(t.coat)
      ? `${t.name}s have a ${t.coat} coat that mats if neglected — a wide-tooth comb used after each brush session catches tangles before they tighten. Professional trims every 6–8 weeks keep the coat manageable.`
      : `The ${t.name}'s ${t.coat} coat is relatively low-maintenance — a soft-bristle brush once or twice weekly keeps it clean and distributes natural oils. A rubber deshedding glove works well for weekly use.`;
    const bathNote = `Bathing frequency depends on lifestyle: every 4–6 weeks for a dog that mostly stays indoors, more often if they swim or dig regularly. Over-bathing strips protective oils — use a pH-balanced dog shampoo rather than human products.`;
    const nailNote = `Nail trims are often the most neglected part of ${t.name} grooming. Nails that click on hard floors are already too long — plan for trims every 3–4 weeks or use a grinder if your dog is sensitive to clippers.`;
    return `### What to look for in grooming tools for a ${t.name}\n\n${coatNote} ${bathNote} ${nailNote}`;
  }

  if (family === 'training' || commerceCluster === 'dog-training-gear-safety-partners') {
    const difficultyNote = t.isEasyTrain
      ? `${t.name}s are responsive to training — they generalise cues quickly and stay engaged through reward-based sessions. Short 10–15 minute sessions with high-value treats outperform long correction-based drills for this breed.`
      : t.isHardTrain
      ? `${t.name}s are independent thinkers — they need clear, consistent boundaries from day one. Enrol in a structured puppy class in the first two weeks home and use a marker-reward system to reduce ambiguity in what earns reinforcement.`
      : `${t.name}s respond best to consistent, reward-focused training. Keep sessions under 15 minutes, end on a success, and involve every person in the household — selective compliance is common when rules differ by person.`;
    const gearNote = `For walking gear, start with a flat collar for ID and a front-clip harness for leash training — avoid using aversive tools (prong collars, choke chains) while building leash skills. A 6-foot leash for street work and a 20–30 foot long-line for recall practice cover 90% of training scenarios.`;
    const socialNote = `Socialisation matters as much as obedience: expose your ${t.name} to different surfaces, sounds, dogs, and strangers between 8 and 16 weeks. A well-socialised ${t.name} with moderate obedience is more manageable than a precisely trained but under-socialised one. Many trainers recommend structured puppy classes over solo home training for this reason — the peer exposure is as valuable as the instruction.`;
    return `### What to look for in training gear for a ${t.name}\n\n${difficultyNote} ${gearNote} ${socialNote}`;
  }

  if (family === 'health') {
    const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').trim();
    const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
    const lifeStr = lifeExpStr(breed);
    const riskNote = ailmentCount > 0 && ailmentNames
      ? `${t.name}s have ${ailmentCount} documented genetic health condition${ailmentCount !== 1 ? 's' : ''}: **${ailmentNames}**. Knowing these in advance helps you choose the right insurance timing and ask targeted screening questions at vet appointments.`
      : `No specific genetic ailments are documented for the ${t.name} in current breed data. Standard preventive care still applies.`;
    const sizeNote2 = t.isLarge
      ? `Large breeds like the ${t.name} are statistically more prone to joint issues and shorter lifespans. Vet visits every 6 months from age 6 onward are generally recommended over the standard annual check.`
      : t.isSmall
      ? `Toy and small breeds like the ${t.name} often live longer but are more prone to dental disease, luxating patellas, and tracheal collapse. Annual dental checks from age 2 onward are more important for small breeds than most owners realise.`
      : `Medium breeds generally have fewer size-specific health risks than very small or very large breeds, but breed-specific genetic screening still applies.`;
    const insuranceNote = `For any breed with documented genetic conditions, consider enrolling in pet insurance before symptoms appear — most policies exclude pre-existing conditions.${lifeStr ? ` With a typical ${t.name} life expectancy of ${lifeStr}, insurance decisions made in the first year can significantly affect lifetime vet coverage.` : ''}`;
    return `### What to know about ${t.name} health planning\n\n${riskNote} ${sizeNote2} ${insuranceNote}`;
  }

  if (family === 'supplements') {
    const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').toLowerCase();
    const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
    const vetFirstNote = `⚠️ Always discuss supplements with your vet before starting. Supplements are not regulated as rigorously as medications — quality and dosing vary widely between products.`;
    let conditionNote = '';
    if (/hip|elbow|joint|dysplasi/.test(ailmentNames)) {
      conditionNote = `${t.name}s have documented joint conditions (${ailmentNames}). Glucosamine and chondroitin are among the most studied supplements for joint support in dogs — discuss appropriate timing with your vet before symptoms appear.`;
    } else if (/skin|derm|allerg/.test(ailmentNames)) {
      conditionNote = `${t.name}s have noted skin and allergy conditions. Omega-3 fatty acids (EPA/DHA from fish oil) are well-studied for skin barrier support. Ask your vet about dosing specific to your dog's weight.`;
    } else if (/heart|cardiac/.test(ailmentNames)) {
      conditionNote = `${t.name}s have elevated cardiac risk. Be cautious with supplements marketed for "heart health" that lack veterinary evidence. Discuss any supplement plan with a veterinary cardiologist if indicated.`;
    } else if (ailmentCount > 0) {
      conditionNote = `${t.name}s have ${ailmentCount} documented genetic conditions. Supplements relevant to these conditions may offer support — confirm relevance and safety with your vet before starting any.`;
    } else {
      conditionNote = `No breed-specific supplement priority is indicated by current genetic data for the ${t.name}. A balanced AAFCO-compliant diet is the baseline — supplements fill specific gaps identified by your vet, not general prevention.`;
    }
    const labelNote = `When evaluating supplements, prioritise products with NASC (National Animal Supplement Council) certification, a published Certificate of Analysis (CoA) for third-party testing, and a clearly stated active-ingredient concentration on the label.`;
    return `### What to look for in supplements for a ${t.name}\n\n${vetFirstNote} ${conditionNote} ${labelNote}`;
  }

  if (family === 'puppy') {
    const sizeNote2 = t.isSmall
      ? `Small-breed puppies like the ${t.name} have fast metabolisms and small stomachs — feed 3–4 small meals per day until 6 months, then twice daily. Use a small-breed puppy formula; avoid large-breed or all-breed blends with inappropriate calorie density.`
      : t.isLarge
      ? `Large-breed puppies like the ${t.name} need large-breed-specific puppy formulas that control calcium and phosphorus ratios. Avoid generic puppy food — rapid growth from inappropriate nutrition is a major cause of joint problems in large breeds. Limit stairs and jumping until growth plates close at 12–18 months.`
      : `Medium-breed puppies do well on standard puppy formulas — look for AAFCO "growth" or "all life stages" labelling. Transition to adult food between 12 and 15 months.`;
    const vetNote = `Schedule a vet visit within the first 72 hours of bringing your ${t.name} puppy home. The first-year vet schedule typically includes: 8-week vaccines, 12-week booster, 16-week final puppy booster, 6-month neuter/spay consultation, and 12-month first adult check.`;
    const socialNote = `The critical socialisation window is 8–16 weeks. Each week, introduce new sounds, surfaces, people, and vaccinated calm dogs. A puppy class started at 8–10 weeks provides peer exposure that home training alone cannot replicate.`;
    return `### What to prioritise in the first weeks with a ${t.name} puppy\n\n${sizeNote2} ${vetNote} ${socialNote}`;
  }

  // Generic fallback for other families
  const sizeNote = t.isSmall
    ? `${t.name}s are small dogs — always verify sizing, weight limits, and portion sizes are appropriate for a ${t.size}-sized breed before buying.`
    : t.isLarge
    ? `${t.name}s are large dogs — look for products rated to the correct weight range and make sure durability specs account for a heavier, stronger dog.`
    : `The ${t.name} is a ${t.size}-sized dog — check that sizing, portions, and product ratings are appropriate before purchasing.`;
  const traitNote = t.isActive
    ? `As an active breed, the ${t.name} needs products and services that match a higher energy output and more frequent use.`
    : `The ${t.name} is a ${t.energy}-energy breed — match any ongoing product commitments (subscriptions, portions, sessions) to actual activity level.`;
  return `### What to look for for a ${t.name}\n\n${sizeNote} ${traitNote}`;
}

function buildMiniFAQ(breed, commerceCluster, pseoFamily) {
  const t = getBreedTraits(breed);
  const family = pseoFamily || (commerceCluster || '').replace('dog-', '').replace('-partners', '').replace('-nutrition', '').split('-')[0];
  const pairs = [];

  if (family === 'food' || commerceCluster === 'dog-food-nutrition-partners') {
    const portionNote = t.weightStr
      ? `A rough starting point for ${t.name}s (${t.weightStr}) is 1–2 cups per day for smaller adults and 3–4 cups for larger ones — always follow the feeding guidelines on the specific formula and adjust based on body condition, not just weight.`
      : `Follow the feeding guide on your chosen formula and adjust based on body condition — you should be able to feel (but not see) the ribs. Most ${t.name}s need 2–3 meals per day as adults.`;
    const formulaNote = t.isSmall
      ? `Small-breed formulas with higher protein and smaller kibble sizes are the right starting point. Avoid large-breed or generic "all sizes" formulas, which may have inappropriate calcium levels for fast metabolisms.`
      : t.isLarge
      ? `Look for formulas specifically labelled for large breeds, which manage calcium and phosphorus ratios to support joint development. Avoid puppy formulas designed for small dogs even if your ${t.name} is young.`
      : `An AAFCO-compliant adult maintenance formula with a named protein source (not "meat meal") as the first ingredient is the right baseline. Fresh or freeze-dried toppers can add variety without the commitment of a full diet switch.`;
    const switchNote = t.isSmall
      ? `Small breeds typically transition to adult food around 12 months. Moving too late keeps them on higher-calorie puppy formulas that can cause weight gain in lower-activity adults.`
      : t.isLarge
      ? `Large breeds should stay on a large-breed puppy formula until 18–24 months, then transition to an adult formula. Switching too early can disrupt joint development during the growth phase.`
      : `Most ${t.name}s can transition to adult food between 12 and 15 months. Transition gradually over 7–10 days to avoid digestive upset.`;
    pairs.push(
      { q: `How much should I feed my ${t.name}?`, a: portionNote },
      { q: `What food formula works best for a ${t.name}?`, a: formulaNote },
      { q: `When should I switch my ${t.name} from puppy to adult food?`, a: switchNote },
    );
  } else if (family === 'beds' || commerceCluster === 'dog-beds-comfort-home-partners') {
    const sizeNote = t.isSmall
      ? `Measure your ${t.name} when fully stretched out and add 12 inches. Small breeds often sleep curled up but still need space to stretch — a 24–30 inch bed usually covers most ${t.size}-breed dogs.`
      : t.isLarge
      ? `Measure your ${t.name} fully stretched (nose to tail base) and add 12 inches. Most large-breed dogs need a 40–48 inch usable sleep surface. Check the actual foam dimensions, not the outer shell size.`
      : `Measure your ${t.name} stretched out and add 12 inches. Medium breeds (30–40 lb) typically need a 30–36 inch bed. If they hang off the edges regularly, size up.`;
    const orthNote = `For any dog over 7 years, or one already showing joint stiffness, an orthopedic foam bed offers meaningful pressure relief. For younger healthy ${t.name}s, a quality foam bed with a washable cover is adequate — you can upgrade as they age.`;
    const replaceNote = `Most dog beds need replacing every 1–2 years under regular use. Signs it's time: visible compression of the foam (it no longer springs back), persistent odour after washing, or your ${t.name} choosing the floor over the bed.`;
    pairs.push(
      { q: `What size bed does a ${t.name} need?`, a: sizeNote },
      { q: `Is an orthopedic bed worth it for a ${t.name}?`, a: orthNote },
      { q: `How often should I replace my ${t.name}'s bed?`, a: replaceNote },
    );
  } else if (family === 'grooming' || commerceCluster === 'dog-grooming-care-partners') {
    const freqNote = t.isHighShed || t.isDoubleCoat
      ? `${t.name}s are heavy shedders and typically need brushing 3–5 times per week — daily during seasonal coat blows. Skipping this schedule leads to matting and significantly increases grooming time.`
      : /curly|wavy|long/i.test(t.coat)
      ? `${t.name}s have a ${t.coat} coat that should be brushed at least 3–4 times per week to prevent matting. Professional grooming every 6–8 weeks helps maintain coat health and reduces the at-home workload.`
      : `${t.name}s generally need brushing once or twice a week. More frequent brushing during shedding season (typically spring and autumn) helps contain hair in the home.`;
    const shedNote = t.isHighShed
      ? `Yes — ${t.name}s are considered heavy shedders. Regular brushing is the most effective tool; deshedding treatments from professional groomers can reduce seasonal shedding by up to 80% temporarily.`
      : `${t.name}s have ${t.shedding} shedding. It's manageable with a consistent brushing routine — a quality slicker brush or rubber grooming glove catches most loose hair before it reaches your furniture.`;
    const homeNote = t.isHighShed || /curly|long/i.test(t.coat)
      ? `Home grooming is possible with the right tools — slicker brush, undercoat rake, and nail grinder — but many ${t.name} owners supplement with professional grooming 3–4 times per year to maintain coat condition and avoid burn-out.`
      : `Yes — most ${t.name} owners can handle routine maintenance at home with a slicker brush and nail grinder. Professional grooming once or twice per year for a bath and trim keeps things manageable.`;
    pairs.push(
      { q: `How often should I groom a ${t.name}?`, a: freqNote },
      { q: `Do ${t.name}s shed a lot?`, a: shedNote },
      { q: `Can I groom a ${t.name} at home?`, a: homeNote },
    );
  } else if (family === 'training' || commerceCluster === 'dog-training-gear-safety-partners') {
    const easeNote = t.isEasyTrain
      ? `${t.name}s are considered easier to train than average — they respond well to reward-based methods and pick up new cues quickly. Consistency matters more than intensity; short daily sessions outperform occasional long ones.`
      : t.isHardTrain
      ? `${t.name}s are independent-minded and can be challenging to train. They respond better to high-value rewards and clear criteria than to corrections. Enrol in a structured class early and stay consistent — improvement compounds with time.`
      : `${t.name}s are moderately easy to train. They benefit from positive reinforcement methods and early socialisation. Most owners with some prior dog experience find them straightforward; first-time owners benefit from a puppy class.`;
    const methodNote = `Reward-based training (treats, praise, toy rewards) is the most effective and well-researched approach for ${t.name}s. Clicker training works well if you're precise with timing. Avoid aversive methods — they increase anxiety in dogs and can create secondary behavioural problems.`;
    const ageNote = `Start training your ${t.name} puppy from the day they arrive home — typically 8 weeks. Early socialisation (weeks 8–16) is the most sensitive developmental window. Enrol in a puppy class within the first two weeks for structured socialisation alongside basic obedience foundations.`;
    pairs.push(
      { q: `How easy is it to train a ${t.name}?`, a: easeNote },
      { q: `What training method works best for a ${t.name}?`, a: methodNote },
      { q: `At what age should I start training my ${t.name}?`, a: ageNote },
    );
  } else if (family === 'health') {
    const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').trim();
    const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
    const lifeStr = lifeExpStr(breed);
    const q1 = `What are the most common health problems in ${t.name}s?`;
    const a1 = ailmentCount > 0 && ailmentNames
      ? `${t.name}s have ${ailmentCount} documented genetic health condition${ailmentCount !== 1 ? 's' : ''}: ${ailmentNames}. These are breed-level statistical risks — not every ${t.name} will develop these conditions. Your vet can recommend targeted screening based on your dog's individual history.`
      : `No specific genetic ailments are currently documented for the ${t.name}. Standard preventive care — annual vet checks, dental hygiene, parasite prevention, and healthy weight — applies to all dogs. Ask your vet whether any breed-specific screening is recommended.`;
    const q2 = `How long do ${t.name}s live?`;
    const a2 = lifeStr
      ? `${t.name}s have a typical life expectancy of ${lifeStr}. Individual lifespan depends on genetics, weight management, preventive care, and whether any genetic conditions develop. Annual vet visits and maintaining a healthy weight are among the most evidence-backed longevity factors for dogs.`
      : `Life expectancy varies by individual dog. Annual preventive vet care, healthy weight, and early detection of any breed-specific conditions are the most evidence-backed factors affecting lifespan.`;
    const q3 = `Should I get pet insurance for a ${t.name}?`;
    const a3 = ailmentCount >= 3
      ? `${t.name}s have ${ailmentCount} documented genetic conditions — pet insurance is worth serious consideration. Enrol before any symptoms appear, as most policies exclude pre-existing conditions. Compare waiting periods, breed-specific exclusions, and annual limits across providers.`
      : ailmentCount > 0
      ? `With ${ailmentCount} documented genetic condition${ailmentCount !== 1 ? 's' : ''}, pet insurance can help manage financial risk for ${t.name}s. Get a quote before your puppy's first vet visit — some conditions can be flagged as pre-existing quickly.`
      : `Pet insurance is worth considering for any dog. Even without breed-specific genetic conditions, unexpected accidents and illnesses affect most dogs over a lifetime. Compare plans by waiting period, reimbursement model, and annual or per-condition limits.`;
    pairs.push({ q: q1, a: a1 }, { q: q2, a: a2 }, { q: q3, a: a3 });
  } else if (family === 'supplements') {
    const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').toLowerCase();
    const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
    const q1 = `What supplements are most relevant for a ${t.name}?`;
    let a1 = '';
    if (/hip|elbow|joint|dysplasi/.test(ailmentNames)) {
      a1 = `${t.name}s have documented joint conditions — glucosamine (500–1,000 mg/day depending on weight), chondroitin (400–800 mg/day), and omega-3 fatty acids are among the most studied options for joint support in dogs. Confirm dosing with your vet.`;
    } else if (/skin|derm|allerg/.test(ailmentNames)) {
      a1 = `${t.name}s have noted skin and allergy conditions. Fish oil (EPA+DHA omega-3s) is well-supported for skin barrier health. Biotin and vitamin E are sometimes added but have weaker evidence. Discuss with your vet before starting.`;
    } else {
      a1 = `No breed-specific supplement priority is clearly indicated for the ${t.name}. Omega-3 fatty acids are broadly supported for coat health and inflammation. Joint supplements become relevant around age 5+ for many breeds. Always confirm with your vet before starting any supplement.`;
    }
    const q2 = `Are supplements safe for ${t.name}s?`;
    const a2 = `Dog supplements are not FDA-regulated the same way medications are — quality varies significantly between brands. Choose products with NASC certification, a published Certificate of Analysis (CoA) from third-party testing, and clearly stated active ingredient concentrations. Always disclose supplement use to your vet, as interactions with medications and health conditions are possible.`;
    const q3 = `At what age should I start supplements for a ${t.name}?`;
    const a3 = t.isLarge
      ? `For large breeds like the ${t.name}, joint supplements can be introduced as early as age 3–5 — before symptoms develop — if your vet agrees. This is particularly relevant for breeds with documented joint conditions. Don't wait until limping or stiffness appears if genetic risk is high.`
      : `Most supplements are most relevant from middle age onward (5–7 years depending on size). Puppies should generally not receive adult-strength supplements — ask your vet about puppy-appropriate options if indicated.`;
    pairs.push({ q: q1, a: a1 }, { q: q2, a: a2 }, { q: q3, a: a3 });
  } else if (family === 'puppy') {
    const rd = breed?.ranking_data || {};
    const purchasePrice = rd.purchase_price_usd;
    const annualFood = rd.annual_food_cost;
    const q1 = `What does a ${t.name} puppy need in the first week?`;
    const a1 = t.isLarge
      ? `In the first week: vet check within 72 hours, a large-breed puppy formula (2–3 meals/day — avoid one large meal), a crate sized for an adult ${t.name}, and crate training started with short positive sessions. Limit stairs and jumping — growth plates are open until 12–18 months.`
      : t.isSmall
      ? `In the first week: vet check within 72 hours, a small-breed puppy formula (3–4 small meals/day), a crate the right size for sleeping, and gentle exposure to household sounds. Avoid dog parks and public areas until vaccinations are complete.`
      : `In the first week: vet check within 72 hours, a puppy formula appropriate for ${t.size} breeds (3 meals/day until 6 months), crate introduction with positive reinforcement, and household exposure. Avoid public dog areas until vaccines are complete.`;
    const q2 = `How do I socialise a ${t.name} puppy?`;
    const a2 = `The critical window is 8–16 weeks. Each week, introduce new sounds (traffic, appliances, children), new surfaces (gravel, carpet, grass, pavement), new people, and vaccinated calm dogs. A structured puppy class started at 8–10 weeks is the most efficient route — it covers socialisation and basic obedience in one place. After 16 weeks the window closes — missed socialisation is harder (not impossible) to compensate for later.`;
    const q3 = `How much does a ${t.name} puppy cost in the first year?`;
    const a3 = (purchasePrice || annualFood)
      ? `Beyond the purchase price (~$${purchasePrice ? Number(purchasePrice).toLocaleString() : '500–2,000'} for a ${t.name}), the first year typically includes: ${annualFood ? `food (~$${Math.round(Number(annualFood) * 0.85)}–${Math.round(Number(annualFood) * 1.15)} for puppy-stage feeding)` : 'food ($300–$800 depending on size)'}, puppy vaccines and vet checks ($300–$600), supplies/setup ($200–$500), and spay/neuter ($200–$600). Total first-year cost is often 50–100% higher than subsequent years.`
      : `The first year is typically the most expensive — beyond the purchase price, budget for vaccines ($300–$600), supplies/setup ($200–$500), food ($300–$800), and spay/neuter ($200–$600). Use the PupWiki cost calculator for a ${t.name}-specific estimate.`;
    pairs.push({ q: q1, a: a1 }, { q: q2, a: a2 }, { q: q3, a: a3 });
  } else {
    // Generic fallback
    const q1 = `Is a ${t.name} expensive to care for?`;
    const a1 = t.isLarge
      ? `Large breeds like the ${t.name} generally cost more in food, vet care, and products due to weight-based dosing and larger product sizes. Budget $2,000–$4,500 per year for ongoing care excluding unexpected vet bills.`
      : t.isSmall
      ? `Small breeds like the ${t.name} often cost less in food and some products, but vet bills don't scale proportionally — procedures cost similar amounts regardless of dog size. Budget $1,500–$3,000 per year for routine care.`
      : `The ${t.name} is a ${t.size}-sized breed with typical mid-range ownership costs. Budget $1,800–$3,500 per year for food, vet care, grooming, and supplies — more in the first year when startup costs are highest.`;
    const q2 = `How active is a ${t.name}?`;
    const a2 = t.isActive
      ? `${t.name}s are high-energy dogs that need at least 60–90 minutes of structured activity daily. They do best with owners who enjoy outdoor activities and can commit to a consistent exercise routine.`
      : t.isCalm
      ? `${t.name}s have lower energy requirements compared to many breeds — 30–45 minutes of daily exercise is typically sufficient. They adapt well to apartment living and quieter households.`
      : `${t.name}s have moderate energy needs — plan for 45–60 minutes of daily exercise split into two sessions. They're versatile companions that adapt to both active and calmer owner lifestyles.`;
    const q3 = `Is a ${t.name} good for first-time owners?`;
    const a3 = t.isEasyTrain && !t.isLarge
      ? `${t.name}s are generally considered suitable for first-time owners — they're responsive, manageable in size, and respond well to reward-based training. A puppy class is still recommended to build good foundations.`
      : t.isHardTrain || t.isLarge
      ? `${t.name}s can be challenging for first-time owners due to their ${t.isHardTrain ? 'independent temperament' : 'large size and strength'}. Prior dog experience helps significantly — at minimum, commit to professional puppy training and ongoing socialisation.`
      : `${t.name}s are manageable for motivated first-time owners who research the breed thoroughly, commit to early training, and have realistic expectations about time and cost.`;
    pairs.push({ q: q1, a: a1 }, { q: q2, a: a2 }, { q: q3, a: a3 });
  }

  const faqMd = pairs.map(({ q, a }) => `**${q}**\n\n${a}`).join('\n\n');
  const faqLabel = { food: 'feeding', beds: 'beds', grooming: 'grooming', training: 'training', health: 'health', supplements: 'supplements', puppy: 'puppy care' }[family] || 'care';
  return `### Frequently asked questions about ${t.name} ${faqLabel}\n\n${faqMd}`;
}

const AAFCO_BASELINES = [
  'Look for AAFCO compliance — the label should confirm the formula is complete and balanced for your dog\'s life stage. A named protein (chicken, salmon, beef) should be the first ingredient listed.',
  'Check for an AAFCO adequacy statement, which confirms the food meets minimum nutritional standards for the correct life stage. A named protein source (chicken, turkey, beef, salmon) should appear as the first ingredient.',
  'Prioritise formulas with an AAFCO adequacy statement — this confirms the recipe is complete and balanced. Named proteins should appear before grains in the ingredient list.',
  'An AAFCO-approved formula with a whole protein source — chicken, beef, salmon, or turkey — listed first is the baseline standard. Avoid formulas where the first ingredient is a grain or generic "meat by-products".',
  'Start with AAFCO compliance: the label should state the food is complete and balanced for the appropriate life stage. A clearly named protein (not just "meat" or "poultry") as the first ingredient is the next filter.',
];

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
  return Math.abs(hash);
}

function breedFoodGuidance(breed) {
  const size = (breed?.size_category || breed?.size || '').toLowerCase();
  const energy = (breed?.energy_level || breed?.traits?.energy_level || '').toLowerCase();
  const coat = (breed?.coat_type || breed?.traits?.coat_type || '').toLowerCase();
  const shedding = (breed?.shedding_level || breed?.traits?.shedding_level || '').toLowerCase();
  const name = breed?.name || 'This breed';
  // traits.energy_value is a 0-1 float scale
  const energyValue = Number(breed?.traits?.energy_value ?? -1);

  const baselineIdx = djb2Hash(breed?.slug || breed?.name || 'default') % AAFCO_BASELINES.length;
  const baseLine = AAFCO_BASELINES[baselineIdx];

  const sizeNote = size === 'toy' || size === 'small'
    ? `Small and toy breeds have faster metabolisms and do better with smaller kibble sizes and calorie-dense formulas — avoid large-breed formulations designed for slower growth.`
    : size === 'large'
    ? `Large breeds benefit from formulas with controlled calcium-to-phosphorus ratios and moderate fat content to support joint health and avoid rapid growth issues.`
    : size === 'giant'
    ? `Giant breeds require large-breed-specific formulas with precisely balanced calcium and phosphorus levels. Avoid puppy formulas designed for smaller dogs, which can cause developmental issues.`
    : `Medium breeds do well on standard adult maintenance formulas — prioritise named protein sources and appropriate calorie density for their activity level.`;

  const isHighEnergy = energy === 'high' || energy === 'active' || energy === 'very active' || energyValue >= 0.7;
  const isLowEnergy = energy === 'low' || energy === 'calm' || energy === 'sedentary' || (energyValue >= 0 && energyValue <= 0.3);
  const energyNote = isHighEnergy
    ? `${name} is an active breed — a higher-protein, moderate-fat formula supports sustained energy without excess weight gain.`
    : isLowEnergy
    ? `${name} has a lower activity level — choose a formula with controlled fat content to avoid obesity, which is a common risk for lower-energy dogs.`
    : '';

  const coatNote = (coat.includes('double') || shedding === 'high' || shedding === 'heavy')
    ? `High-shedding and double-coated breeds often benefit from omega-3 fatty acids (EPA/DHA) — look for formulas with salmon or fish oil as a listed ingredient.`
    : '';

  // Breed-specific health note from ranking_data.genetic_ailment_names
  const ailmentNames = String(breed?.ranking_data?.genetic_ailment_names || '').toLowerCase();
  const ailmentCount = Number(breed?.ranking_data?.genetic_ailments || 0);
  let healthNote = '';
  if (ailmentNames && ailmentCount > 0) {
    if (/hip|elbow|joint|dysplasi/.test(ailmentNames)) {
      healthNote = `${name}s are documented for joint conditions (${ailmentNames}) — look for formulas listing glucosamine and chondroitin as added ingredients, or plan to add a separate joint supplement after age 5.`;
    } else if (/skin|derm|allerg/.test(ailmentNames)) {
      healthNote = `${name}s have a noted tendency for skin and allergy conditions — limited-ingredient or single-protein diets can help identify food triggers. Fish-based formulas (salmon, whitefish) also support skin barrier health.`;
    } else if (/heart|cardiac/.test(ailmentNames)) {
      healthNote = `${name}s have an elevated risk for cardiac conditions. Current evidence suggests caution with grain-free diets as a primary choice — consult your vet before selecting a formula, and ensure it meets AAFCO nutritional standards.`;
    } else if (/bloat|gastric/.test(ailmentNames)) {
      healthNote = `${name}s can be susceptible to bloat (gastric dilatation-volvulus). Feed two or three smaller meals per day rather than one large meal, and avoid feeding immediately before or after vigorous exercise.`;
    } else if (ailmentCount >= 3) {
      healthNote = `${name}s carry ${ailmentCount} known genetic health conditions. Discuss nutritional support strategies with your vet when choosing a long-term formula.`;
    }
  }

  // Calorie note using actual weight data
  const wMin = breed?.weight?.min_lbs ?? breed?.weight?.imperial?.min;
  const wMax = breed?.weight?.max_lbs ?? breed?.weight?.imperial?.max;
  let calorieNote = '';
  if (wMin && wMax) {
    const midWeight = Math.round((Number(wMin) + Number(wMax)) / 2);
    const baseCals = Math.round(70 * Math.pow(midWeight * 0.453592, 0.75));
    const activeMult = isHighEnergy ? 1.6 : isLowEnergy ? 1.2 : 1.4;
    const estCals = Math.round(baseCals * activeMult);
    calorieNote = `For a typical adult ${name} (${wMin}–${wMax} lbs), the estimated resting energy requirement is around ${baseCals} kcal/day — with a ${energy || 'moderate'}-energy activity factor, daily intake sits roughly in the ${Math.round(estCals * 0.9)}–${Math.round(estCals * 1.1)} kcal range. Most quality kibbles list kcal/cup on the bag; use this to portion accurately rather than relying on the default "suggested feeding" table alone.`;
  }

  // Food-related care tip
  const careTips = Array.isArray(breed?.care_tips) ? breed.care_tips : [];
  const foodRelatedTip = careTips.find(t => /food|feed|diet|nutrition|eat|meal|treat/i.test(String(t)));
  const careTipNote = foodRelatedTip ? `PupWiki care note: ${foodRelatedTip}` : '';

  return [baseLine, sizeNote, energyNote, coatNote, healthNote, calorieNote, careTipNote].filter(Boolean).join(' ');
}

const CLUSTER_GUIDANCE = {
  'dog-food-nutrition-partners': null, // breed-specific version generated by breedFoodGuidance()
  'dog-training-gear-safety-partners': 'Match gear to your dog\'s size, strength and training level. Start with the lowest-stimulation option and focus on reward-based methods before adding management tools.',
  'personalized-dog-gifts-lifestyle-partners': 'Check production time, sizing options and return policy before ordering. Personalised items are usually non-returnable.',
  'dog-beds-comfort-home-partners': 'Measure your dog stretched out fully, add 12 inches, then match to the bed\'s stated usable sleep surface. Check whether the cover is machine washable.',
  'dog-health-wellness-adjacent-partners': '⚠️ Always consult your vet before adding supplements or making changes to your dog\'s health routine. This page is for comparison and planning only.',
  'dog-services-care-planning': 'Compare service area, booking lead time, insurance held by the provider, emergency protocols and genuine reviews before committing to a care service.',
  'puppy-essentials-partners': 'Choose puppy-specific formulas, sizes and training tools. Avoid adult-strength supplements and training methods designed for mature dogs.',
  'senior-dog-care-partners': '⚠️ Senior dogs often have concurrent health conditions. Get a vet check before introducing new supplements, changing food, or modifying an exercise routine.',
  'dog-insurance-and-vet-planning': 'Compare waiting periods, breed-specific exclusions, reimbursement models (actual cost vs. benefit schedule) and annual or per-condition limits before choosing a plan.',
};

function scoreProgram(program) {
  const kpi = program.kpi || {};
  return Number(program.priority || 50) + Number(kpi.epc || 0) * 8 + Number(kpi.conversionRate || 0) * 1.5 + Number(kpi.approvalPercentage || 0) * 0.12 + (program.hasLogo ? 5 : 0) + (program.hasProductFeed ? 6 : 0);
}
function matches(obj, rule) {
  const tags = (obj.topicTags || []).map(slugify);
  const blob = [obj.name, obj.description, obj.category, obj.merchant, obj.primarySector, obj.displayUrl, ...tags].join(' ').toLowerCase();
  return rule.tags.some((tag) => tags.includes(slugify(tag)) || blob.includes(String(tag).replace(/-/g, ' ')) || blob.includes(slugify(tag)));
}
function productLine(product) {
  const price = Number(product.price) > 0 ? `**Price:** $${Number(product.price).toFixed(2)} (check current price on site)` : '';
  const img = product.merchant_image_url || product.aw_image_url || '';
  const descRaw = clean(product.description || '');
  const highlights = descRaw.split(/\.\s+/).slice(0, 3).filter(Boolean).map((s) => `  - ${s.trim()}.`).join('\n');
  const link = product.url || product.deepLink || product.aw_deep_link || '';
  const cta = link ? `[View at ${product.merchant || 'merchant'}](${link}){rel="nofollow sponsored"}` : '';
  return sanitizePublicDogCopy([
    `### ${product.name}`,
    img ? `![${product.name}](${img})` : '',
    highlights || `  - ${descRaw.slice(0, 120)}`,
    price,
    cta,
  ].filter(Boolean).join('\n'));
}

function breedContext(breed) {
  if (!breed) return '';
  const size = breed.size_category || breed.size || 'medium';
  const wMin = breed.weight?.min_lbs ?? breed.weight?.imperial?.min;
  const wMax = breed.weight?.max_lbs ?? breed.weight?.imperial?.max;
  const weightStr = (wMin || wMax)
    ? (wMin && wMax && wMin !== wMax ? `${wMin}–${wMax} lbs` : `${wMin || wMax} lbs`)
    : null;
  const energy = breed.traits?.energy_level || breed.energy_level || 'moderate';
  const shedding = breed.traits?.shedding_level || breed.shedding_level || 'moderate';
  const coat = breed.traits?.coat_type || breed.coat_type || 'standard';
  const weightPart = weightStr ? ` (${weightStr})` : '';
  return `${breed.name}s are ${size}-sized${weightPart}, with ${energy} energy, ${shedding} shedding, and a ${coat} coat. The recommendations below are matched to these traits.`;
}
function partnerLine(program) {
  const details = [
    program.primarySector,
    program.hasProductFeed ? 'product or service details available' : 'brand details available',
  ].filter(Boolean).join('; ');
  return sanitizePublicDogCopy(`- **${program.name}** - ${details}. Useful to compare for fit, trust, availability, terms and dog-care purpose. [Review ${program.name}](${program.deeplink || program.clickThroughUrl})`);
}
function getClusters() {
  return RULES.map((rule) => {
    const matchedPrograms = programs.filter((program) => matches(program, rule)).sort((a, b) => scoreProgram(b) - scoreProgram(a));
    const matchedProducts = products.filter((product) => matches(product, rule));
    return {
      kind: 'cluster',
      slug: rule.slug,
      suggestedSlug: rule.slug,
      title: rule.title,
      rule,
      programs: matchedPrograms,
      products: matchedProducts.slice(0, 16),
      priorityScore: Math.round(matchedPrograms.reduce((sum, program) => sum + scoreProgram(program), 0) + matchedProducts.length * 4 + matchedPrograms.length * 20),
      amazonQueries: rule.amazonQueries,
      internalLinkTargets: unique([...rule.internalTargets, '/categories/pupwiki-partners', '/disclosure']),
    };
  }).filter((cluster) => cluster.programs.length >= MIN_PROGRAMS);
}
function getBreedPages(clusters) {
  const byTag = new Map();
  for (const cluster of clusters) for (const tag of cluster.rule.tags) byTag.set(slugify(tag), cluster);
  return (backlog.items || []).filter((item) => item.type === 'breed-family-page').map((item) => {
    const family = slugify(item.family || item.cluster || '');
    const cluster = byTag.get(family) || clusters.find((candidate) => candidate.rule.tags.some((tag) => family.includes(slugify(tag)) || slugify(tag).includes(family)));
    const breed = breeds.find((breedItem) => breedItem.slug === item.breedSlug);
    if (!cluster || !breed) return null;
    return { ...item, kind: 'breed', commerceCluster: cluster.slug, commerceClusterTitle: cluster.title, programmes: cluster.programs.map((program) => program.name), products: cluster.products.slice(0, 6), amazonQueries: cluster.amazonQueries, internalLinkTargets: unique([...(item.internalLinkTargets || []), `/blog/${cluster.slug}`, ...cluster.internalLinkTargets]) };
  }).filter(Boolean);
}
function renderCluster(cluster) {
  const tags = unique([cluster.slug, ...cluster.rule.tags, ...cluster.programs.flatMap((program) => program.topicTags || []), ...cluster.products.flatMap((product) => product.topicTags || [])]).map(slugify);
  const sensitive = cluster.rule.sensitivity === 'high';
  const relatedLinks = cluster.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' > '))}](${href})`).join('\n');
  const amazonCoverage = cluster.amazonQueries.length ? cluster.amazonQueries.map((query) => `- ${query}`).join('\n') : '- This journey is mainly service-led, so compare provider details, booking terms, coverage, reviews and dog fit before choosing.';
  const body = `> **Reader-support note:** PupWiki may earn from qualifying partner links. Brand availability, offers, products and terms can change.
${sensitive ? '\n> **Health-sensitive note:** This page is for comparison and planning only. It does not provide veterinary, medical, insurance, or financial advice.\n' : ''}
## What this guide helps you decide

${cluster.rule.intro}

It is written for people who already have a dog and for people still deciding whether a dog fits their home, time, budget and care expectations.

## Dog brands and services to compare

${cluster.programs.map(partnerLine).join('\n')}

## Products and service details worth reviewing

${cluster.products.length ? cluster.products.slice(0, 8).map(productLine).join('\n') : '- This guide currently has brand or service coverage but limited detailed product rows. Start with provider fit, service terms, availability, reviews and dog-care purpose.'}

## How to compare these options

${CLUSTER_GUIDANCE[cluster.slug] || 'Match the product or service to your dog\'s life stage, size, activity level and your own goal.'}

- Confirm shipping, availability, formula, sizing, subscription terms, return policy or service terms on the partner site.
- If you are still choosing a dog, use these options to understand the real care, time and budget commitments behind ownership.
- Treat price and availability as dynamic; do not rely on older imported data.

## Related PupWiki pages

${relatedLinks}

## Extra comparison paths

${amazonCoverage}
`;
  return `---
title: ${quote(`${cluster.title} - PupWiki Dog Guide`)}
seoTitle: ${quote(`${cluster.title} - Brands, Services and Dog-Fit Checks`)}
displayTitle: ${quote(cluster.title)}
description: ${quote(`Compare dog-focused brands, products and services for ${cluster.title.toLowerCase()}, with practical checks for current and future dog owners.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: "PupWiki Partners"
tags: ${yamlList(tags)}
postType: "comparison"
contentTier: "money"
cluster: ${quote(cluster.slug)}
productFamilies: ${yamlList(cluster.rule.tags)}
awinTopicTags: ${yamlList(tags)}
amazonQueries: ${yamlList(cluster.amazonQueries)}
internalLinkTargets: ${yamlList(cluster.internalLinkTargets)}
generated: true
indexInBlog: false
reviewMethod: ${quote(normalizeReviewMethod('product-data-comparison'))}
claimSensitivity: ${quote(cluster.rule.sensitivity)}
monetizationIntent: ${quote(normalizeMonetizationIntent(cluster.rule.intent || cluster.rule.tags[0] || 'service'))}
affiliateDisclosure: true
medicalDisclaimer: ${sensitive ? 'true' : 'false'}
partnerProgramKeys: ${yamlList(cluster.programs.map((program) => program.key))}
partnerAdvertiserIds: ${yamlList(cluster.programs.map((program) => program.advertiserId))}
canonicalUrl: ${quote(`https://pupwiki.com/blog/${cluster.slug}`)}
---

${body}`;
}
function estimateWordCount(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+.+$/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1).length;
}

function renderBreedPage(item) {
  const breed = breeds.find((breedItem) => breedItem.slug === item.breedSlug);
  const pseoFamilyKey = item.family || '';
  const isHealthFamily = pseoFamilyKey === 'health';
  const isSuppFamily = pseoFamilyKey === 'supplements';
  const isPuppyFamily = pseoFamilyKey === 'puppy';

  const FAMILY_TITLE_MAP = {
    health: `${breed.name} Health Guide: Common Issues and Vet Planning`,
    puppy: `${breed.name} Puppy Guide: First Year Setup and Care`,
    supplements: `${breed.name} Supplement Guide: What to Ask Your Vet`,
  };
  const FAMILY_DESC_MAP = {
    health: `A practical ${breed.name} health guide covering genetic risks, vet care scheduling, insurance timing, and preventive care.`,
    puppy: `What new ${breed.name} owners need in the first year: feeding, socialisation, vet schedule, and first-year budget.`,
    supplements: `Supplement guidance for ${breed.name} owners, including breed-specific joint, skin, and gut health context and vet-check reminders.`,
  };
  const FAMILY_DISPLAY_MAP = {
    health: `${breed.name} health guide: common issues and vet planning`,
    puppy: `${breed.name} puppy guide: first year setup and care`,
    supplements: `${breed.name} supplement guide: what to ask your vet`,
  };
  const FAMILY_POSTTYPE_MAP = {
    health: 'health',
    puppy: 'general',
    supplements: 'product-roundup',
  };

  const title = FAMILY_TITLE_MAP[pseoFamilyKey] || `${breed.name} ${titleCase(item.family)} Dog-Care Decision Guide`;
  const description = FAMILY_DESC_MAP[pseoFamilyKey] || `A PupWiki guide for current and future ${breed.name} people comparing dog-care brands, products, services and practical next steps.`;
  const displayTitle = FAMILY_DISPLAY_MAP[pseoFamilyKey] || `${breed.name} ${titleCase(item.family)} decision guide`;
  const postType = FAMILY_POSTTYPE_MAP[pseoFamilyKey] || 'product-roundup';

  const tags = unique([item.family, item.cluster, item.commerceCluster, breed.slug, breed.name, ...item.programmes, ...item.amazonQueries]).map(slugify);
  const sensitive = (item.monetization?.claimSensitivity || 'medium') === 'high';
  const ctx = breedContext(breed);
  const aiSummary = aiSummaries[breed.slug]?.summary || '';
  const guidance = item.commerceCluster === 'dog-food-nutrition-partners'
    ? breedFoodGuidance(breed)
    : (CLUSTER_GUIDANCE[item.commerceCluster] || '');

  // Normalise internal links: /blog → /guides
  item = {
    ...item,
    internalLinkTargets: (item.internalLinkTargets || []).map((href) => href === '/blog' ? '/guides' : href),
  };
  const isEnrichedFamily = isHealthFamily || isSuppFamily || isPuppyFamily;

  const healthRisksSection = (isHealthFamily || isSuppFamily) ? buildHealthRisks(breed) : '';
  const costSection = isEnrichedFamily ? buildCostContext(breed) : '';
  const careTipsSection = isEnrichedFamily ? buildCareTips(breed) : '';

  const body = `> **Reader-support note:** PupWiki may earn from qualifying partner links.
${sensitive ? '\n> **Health-sensitive note:** This page is for comparison and planning only. It does not provide veterinary, medical, insurance, or financial advice.\n' : ''}
## About ${breed.name}s

${ctx}
${aiSummary ? `\n${aiSummary}\n` : ''}
${isEnrichedFamily ? '' : `This page helps ${breed.name} people compare useful brands, products and services for a real care decision. It is also useful if you are still deciding whether a ${breed.name} fits your home, budget and routine.`}

${healthRisksSection ? `${healthRisksSection}\n` : ''}
${!isEnrichedFamily ? `## Brands and services to compare

${item.programmes.map((name) => `- **${name}**`).join('\n')}

## Products and service details to compare

${item.products.length ? item.products.map(productLine).join('\n\n') : '- Start with provider fit, service terms, availability, reviews and dog-care purpose. Product-level details may vary by brand and location.'}` : ''}

## How to approach ${isHealthFamily ? `${breed.name} health` : isSuppFamily ? `supplements for ${breed.name}s` : isPuppyFamily ? `a ${breed.name} puppy's first year` : `${breed.name} care`}

${guidance || `Match the option to a ${breed.name}'s specific size, energy level and coat type. Confirm details directly on the partner site.`}

${buildWhatToLookFor(breed, item.commerceCluster, item.family)}

${buildMiniFAQ(breed, item.commerceCluster, item.family)}

${careTipsSection ? `${careTipsSection}\n` : ''}
${costSection ? `${costSection}\n` : ''}
## Related PupWiki guides

${item.internalLinkTargets.map((href) => `- [${titleCase(href.replace(/^\//, '').replace(/\//g, ' > '))}](${href})`).join('\n')}
`;
  const wordCount = estimateWordCount(body);
  return `---
title: ${quote(title)}
seoTitle: ${quote(title)}
displayTitle: ${quote(displayTitle)}
description: ${quote(description)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: ${quote(titleCase(item.cluster))}
tags: ${yamlList(tags)}
postType: ${quote(postType)}
contentTier: "money"
cluster: ${quote(item.cluster)}
commerceCluster: ${quote(item.commerceCluster)}
productFamilies: ${yamlList([item.family, item.cluster, item.commerceCluster])}
awinTopicTags: ${yamlList(tags)}
amazonQueries: ${yamlList(item.amazonQueries)}
internalLinkTargets: ${yamlList(item.internalLinkTargets)}
generated: true
indexInBlog: false
reviewMethod: ${quote(normalizeReviewMethod('product-data-comparison'))}
claimSensitivity: ${quote(item.monetization?.claimSensitivity || 'medium')}
monetizationIntent: ${quote(normalizeMonetizationIntent(item.family))}
affiliateDisclosure: true
medicalDisclaimer: ${item.monetization?.claimSensitivity === 'high' ? 'true' : 'false'}
breedSlug: ${quote(breed.slug)}
breedName: ${quote(breed.name)}
wordCountEstimate: ${wordCount}
canonicalUrl: ${quote(`https://pupwiki.com/blog/${item.suggestedSlug}`)}
---

${body}`;
}

const clusters = getClusters().sort((a, b) => b.priorityScore - a.priorityScore);
const breedPages = getBreedPages(clusters).sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0));

const filteredClusters = (MODE === 'clusters' || MODE === 'all' ? clusters : [])
  .filter((item) => INCLUDE_EXISTING || !existing.has(item.suggestedSlug || item.slug))
  .slice(0, CLUSTER_LIMIT);

const filteredBreeds = (MODE === 'breed-pages' || MODE === 'all' ? breedPages : [])
  .filter((item) => INCLUDE_EXISTING || !existing.has(item.suggestedSlug || item.slug))
  .slice(0, BREED_LIMIT);

const selected = [...filteredClusters, ...filteredBreeds];

fs.mkdirSync(BLOG_DIR, { recursive: true });
const generated = [];
const skipped = [];
for (const item of selected) {
  try {
    const slug = item.suggestedSlug || item.slug;
    const markdown = sanitizePublicDogCopy(item.kind === 'breed' ? renderBreedPage(item) : renderCluster(item));
    if (APPLY) fs.writeFileSync(path.join(BLOG_DIR, `${slug}.md`), markdown, 'utf8');
    generated.push({ kind: item.kind || 'cluster', slug, path: `/blog/${slug}`, priorityScore: item.priorityScore, programmes: item.programs?.map((program) => program.name) || item.programmes || [] });
  } catch (error) {
    skipped.push({ slug: item.suggestedSlug || item.slug, reason: error.message });
  }
}
const summary = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  mode: MODE,
  limit: LIMIT,
  minPrograms: MIN_PROGRAMS,
  activeProgramCount: programs.length,
  commerceClusterCount: clusters.length,
  breedPageOpportunityCount: breedPages.length,
  generatedCount: generated.length,
  skippedCount: skipped.length,
  generated,
  skipped,
  topClusters: clusters.slice(0, 10).map((cluster) => ({ slug: cluster.slug, score: cluster.priorityScore, programmes: cluster.programs.map((program) => program.name), products: cluster.products.length })),
};
writeJson(APPLY ? 'src/data/pseo-generation-summary.json' : 'src/data/pseo-generation-summary.preview.json', summary);
console.log(JSON.stringify(summary, null, 2));

