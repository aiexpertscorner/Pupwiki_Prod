#!/usr/bin/env node
/**
 * FAQ Page Generator for PupWiki.
 *
 * Reads master-breeds.json and generates per-breed JSON files at
 * src/data/faq/[breed-slug].json. Each file contains 8 topic sections,
 * each with 3–5 breed-specific Q&A pairs.
 *
 * URL pattern: /faq/[breed-slug]-[topic]
 * Topics: cost, grooming, training, health, behavior, exercise, feeding, suitability
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FAQ_DIR = path.join(ROOT, 'src/data/faq');
const APPLY = process.argv.includes('--apply');
const LIMIT = Number((process.argv.find(a => a.startsWith('--limit=')) || '').slice('--limit='.length) || 0) || Infinity;

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}

const breeds = readJson('src/data/master-breeds.json', []);

// Deterministic hash for variant selection
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}
function pick(arr, seed) { return arr[djb2(seed) % arr.length]; }

// ── Trait normalisers ──────────────────────────────────────────────────────────

function size(b) { return (b.size_category || b.size || 'medium').toLowerCase(); }
function energy(b) { return (b.energy_level || b.traits?.energy_level || 'moderate').toLowerCase(); }
function training(b) { return (b.training_level || b.traits?.training_level || 'moderate').toLowerCase(); }
function coat(b) { return (b.coat_type || b.traits?.coat_type || 'short').toLowerCase(); }
function shedding(b) { return (b.shedding_level || b.traits?.shedding_level || 'moderate').toLowerCase(); }
function lifespan(b) {
  const l = b.life_expectancy || {};
  if (l.min && l.max) return `${l.min}–${l.max} years`;
  if (l.max) return `up to ${l.max} years`;
  const r = b.ranking_data || {};
  if (r.longevity_years) return `${r.longevity_years} years average`;
  return '10–13 years';
}
function weight(b) {
  const w = b.weight?.imperial || b.weight?.metric || b.weight;
  if (typeof w === 'object' && w !== null) {
    if (w.min && w.max) return `${w.min}–${w.max} lbs`;
    if (w.max) return `up to ${w.max} lbs`;
    if (w.min) return `${w.min}+ lbs`;
  }
  if (typeof w === 'string') return w;
  return null;
}

function isSmall(b) { return /toy|small/.test(size(b)); }
function isLarge(b) { return /large|giant/.test(size(b)); }
function isActive(b) { return /high|active|very active/.test(energy(b)); }
function isCalm(b) { return /low|calm|sedentary/.test(energy(b)); }
function isEasyTrain(b) { return /easy|eager|high/.test(training(b)); }
function isHardTrain(b) { return /independent|stubborn|challenging|hard|difficult/.test(training(b)); }
function isHeavyShed(b) { return /high|heavy/.test(shedding(b)); }
function isDoubleCt(b) { return /double/.test(coat(b)); }
function isLongCt(b) { return /long|curly|wavy|silky/.test(coat(b)); }

function healthConcern(b) {
  const ailments = b.ranking_data?.genetic_ailment_names;
  if (ailments && ailments !== 'none') {
    const list = ailments.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length) return list[0];
  }
  const groupMap = {
    'Sporting Group': 'hip dysplasia',
    'Herding Group': 'hip dysplasia',
    'Working Group': 'bloat (GDV)',
    'Hound Group': 'ear infections',
    'Terrier Group': 'skin allergies',
    'Toy Group': 'dental disease',
    'Non-Sporting Group': 'brachycephalic airway issues',
  };
  return groupMap[b.akc_group] || 'routine age-related conditions';
}

function monthlyCost(b) {
  if (isSmall(b)) return '$120–$200';
  if (isLarge(b)) return '$200–$400';
  return '$150–$300';
}

function yearOneCost(b) {
  if (isSmall(b)) return '$1,500–$3,000';
  if (isLarge(b)) return '$2,500–$5,000';
  return '$2,000–$4,000';
}

function puppyPriceRange(b) {
  const sz = size(b);
  if (sz === 'toy' || sz === 'small') return '$500–$2,000';
  if (sz === 'large' || sz === 'giant') return '$1,200–$4,000';
  return '$800–$3,000';
}

// ── Q&A generators by topic ────────────────────────────────────────────────────

function costQAs(b) {
  const n = b.name;
  const wt = weight(b);
  const wtNote = wt ? ` (${wt})` : '';
  return [
    {
      q: `How much does a ${n} cost to buy?`,
      a: `Reputable breeders typically charge ${puppyPriceRange(b)} for a ${n} puppy. Prices vary by breeder reputation, health testing, and lineage. Rescue adoption fees are typically $100–$500 and include vaccinations, neutering, and microchipping.`,
    },
    {
      q: `What is the monthly cost of owning a ${n}?`,
      a: `Budget ${monthlyCost(b)} per month for a ${n}${wtNote}, covering food, preventive vet care, insurance, grooming and supplies. ${isLarge(b) ? 'Large breeds cost more across every category — food portions, medication doses and professional services all scale with weight.' : isSmall(b) ? 'Small breeds often cost less on food and some products, but vet bills don\'t proportionally reduce — procedures cost similar amounts regardless of size.' : 'Mid-size breeds sit in the moderate cost range across most ownership categories.'}`,
    },
    {
      q: `What are the biggest ongoing costs for a ${n}?`,
      a: `The three largest annual expenses are food ($${isLarge(b) ? '800–1,200' : isSmall(b) ? '300–600' : '500–900'}), veterinary care ($400–$1,200 budgeted annually), and pet insurance ($${isLarge(b) ? '800–1,800' : '$400–$1,200'} per year). ${isHeavyShed(b) || isLongCt(b) ? `Grooming adds $400–$1,200 annually for ${n}s due to their coat type.` : 'Grooming costs are lower for short-coated breeds managed at home.'}`,
    },
    {
      q: `How much does a ${n} cost in the first year?`,
      a: `Year one costs for a ${n} are significantly higher than subsequent years, typically ${yearOneCost(b)}. This covers the purchase price or adoption fee, initial vet checks, vaccinations, spay/neuter, microchipping, crate, bedding, collar, leads and puppy training classes.`,
    },
  ];
}

function groomingQAs(b) {
  const n = b.name;
  const ct = coat(b);
  const sh = shedding(b);
  const freqText = isHeavyShed(b) || isDoubleCt(b)
    ? '3–5 times per week, daily during seasonal coat blows'
    : isLongCt(b)
    ? '3–4 times per week to prevent matting'
    : 'once or twice per week';
  const shedDesc = isHeavyShed(b)
    ? 'Yes — they are considered heavy shedders. Regular brushing is the most effective control tool.'
    : /seasonal|moderate/.test(sh)
    ? `${n}s have ${sh} shedding — manageable with a consistent brushing routine.`
    : `${n}s shed minimally. A weekly brush is usually sufficient.`;
  return [
    {
      q: `How often should I groom a ${n}?`,
      a: `${n}s need brushing ${freqText}. ${isDoubleCt(b) ? 'The dense undercoat requires a dedicated undercoat rake, not just a surface slicker brush.' : ''} Nails should be trimmed every 3–4 weeks. Ears should be checked and cleaned monthly.`,
    },
    {
      q: `Do ${n}s shed a lot?`,
      a: `${shedDesc} ${isHeavyShed(b) ? `A slicker brush and undercoat rake are both essential for ${n}s. Deshedding treatments from professional groomers can reduce seasonal shedding temporarily.` : ''}`,
    },
    {
      q: `What grooming tools does a ${n} need?`,
      a: isHeavyShed(b) || isDoubleCt(b)
        ? `A slicker brush for surface debris and an undercoat rake for the dense undercoat are both essential. A shedding blade or deshedding tool helps during heavy moult periods. A nail grinder is useful if your ${n} is sensitive to clippers.`
        : isLongCt(b)
        ? `A wide-tooth comb, pin brush, and detangling spray are the core tools for a ${n}'s ${ct} coat. Add a nail grinder and ear cleaner for complete at-home maintenance.`
        : `A rubber grooming glove or soft-bristle brush is sufficient for weekly maintenance on the ${n}'s ${ct} coat. Add a nail grinder and ear cleaner for a complete grooming kit.`,
    },
    {
      q: `How often should I bathe a ${n}?`,
      a: `Every 4–6 weeks is appropriate for most ${n}s that live indoors. More frequent bathing is needed if they swim or spend time in mud. Over-bathing strips natural skin oils — use a pH-balanced dog shampoo rather than human products.`,
    },
  ];
}

function trainingQAs(b) {
  const n = b.name;
  const easyText = isEasyTrain(b)
    ? `${n}s are considered easier to train than average — they respond quickly to reward-based methods and generalise cues well. Short 10–15 minute sessions outperform long correction-heavy drills.`
    : isHardTrain(b)
    ? `${n}s are independent thinkers and can be challenging to train. They respond best to high-value rewards and clear, consistent criteria. A structured puppy class from week one is strongly recommended.`
    : `${n}s are moderately easy to train. They respond well to positive reinforcement and benefit from early puppy classes. Consistency from all household members is key.`;
  return [
    {
      q: `Are ${n}s easy to train?`,
      a: easyText,
    },
    {
      q: `What training method works best for a ${n}?`,
      a: `Reward-based training using treats, praise and toy rewards is the most effective and well-researched approach for ${n}s. ${isHardTrain(b) ? 'Clicker training with precise timing works well to mark the exact moment of correct behaviour. Avoid aversive methods — they increase anxiety and often create secondary behavioural problems.' : 'Keep sessions short and positive, end on a success, and vary your rewards to maintain engagement.'}`,
    },
    {
      q: `At what age should I start training my ${n}?`,
      a: `Start training from the day your puppy arrives home, typically at 8 weeks. The 8–16 week window is the most sensitive socialisation period. Enrol in a puppy class within the first two weeks for structured socialisation alongside basic obedience foundations.`,
    },
    {
      q: `How long does it take to train a ${n}?`,
      a: isEasyTrain(b)
        ? `Most ${n}s learn basic obedience cues (sit, stay, come, down) within 2–4 weeks of daily practice. Reliable recall in distracting environments typically takes 2–3 months of consistent reinforcement.`
        : isHardTrain(b)
        ? `${n}s can take longer to reach reliable obedience than easier-to-train breeds — expect 3–6 months of consistent daily training for solid basics. Their independent nature means results compound slowly but durably with patience.`
        : `Most ${n}s reliably perform basic cues within 4–6 weeks of daily 10–15 minute sessions. Reliable recall off-lead typically takes 3–4 months of progressive distance and distraction training.`,
    },
  ];
}

function healthQAs(b) {
  const n = b.name;
  const concern = healthConcern(b);
  const ls = lifespan(b);
  return [
    {
      q: `What health problems do ${n}s commonly have?`,
      a: `${n}s are most commonly associated with ${concern}${b.ranking_data?.genetic_ailment_names && b.ranking_data.genetic_ailment_names !== 'none' ? ` and other breed-specific conditions` : ''}. Regular vet checks, appropriate weight management, and breed-specific screening tests help detect issues early. Ask any breeder for health test results before purchasing.`,
    },
    {
      q: `How long do ${n}s live?`,
      a: `${n}s have an average lifespan of ${ls}. ${isLarge(b) ? 'Larger breeds typically have shorter lifespans than smaller breeds. Maintaining a healthy weight and regular vet care are the most impactful factors for longevity.' : isSmall(b) ? 'Small breeds often live longer than large breeds. Dental care is particularly important for small dogs, as dental disease is a common longevity issue.' : 'Good nutrition, appropriate exercise, weight management and regular vet visits are the key factors in achieving the upper end of this range.'}`,
    },
    {
      q: `Are ${n}s prone to hip dysplasia?`,
      a: isLarge(b) || /sporting|herding|working/i.test(b.akc_group || '')
        ? `${n}s have a moderate-to-elevated risk of hip dysplasia, particularly for large or active breeds. Ask for OFA or PennHIP hip evaluation certificates when buying from a breeder. Weight control and avoiding high-impact exercise during bone growth (under 18 months) reduces risk.`
        : `Hip dysplasia is less common in ${n}s than in large working breeds, but it can still occur. Responsible breeders screen breeding stock. Keeping your ${n} at a healthy weight is the most effective preventive measure.`,
    },
    {
      q: `What health tests should a ${n} puppy have?`,
      a: `At minimum, your ${n} puppy should have a vet health check, first vaccinations, deworming, and microchipping before coming home. Ask the breeder for parent health certificates relevant to ${n}-specific conditions. A vet check within 72 hours of bringing your puppy home is recommended to establish a baseline.`,
    },
  ];
}

function behaviorQAs(b) {
  const n = b.name;
  const isProtective = /protective|alert|watchful|guard/i.test(b.temperament || '');
  const isFriendly = /friendly|affectionate|loving|gentle/i.test(b.temperament || '');
  const isIndependent = /independent|aloof|reserved/i.test(b.temperament || '');
  return [
    {
      q: `Are ${n}s good with kids?`,
      a: isFriendly
        ? `${n}s are generally known for being friendly and patient, making them well-suited to family life with children. Supervision is always recommended with young children regardless of breed — interactions should be taught from both sides.`
        : isProtective
        ? `${n}s can be protective and may be cautious around unfamiliar children. Early socialisation with children from puppyhood significantly improves tolerance. Always supervise interactions between dogs and young children.`
        : `${n}s can do well with children when properly socialised from puppyhood. Every dog is an individual — early exposure to children's behaviour (noise, sudden movements) is the most effective preparation.`,
    },
    {
      q: `Do ${n}s get along with other dogs?`,
      a: isIndependent || isProtective
        ? `${n}s can be selective with other dogs due to their ${isProtective ? 'protective' : 'independent'} nature. Early socialisation in puppy classes and controlled on-lead introductions with other dogs help build positive associations.`
        : `${n}s are generally sociable with other dogs, particularly when well-socialised from puppyhood. Introduce new dogs on neutral territory and keep initial meetings brief and positive.`,
    },
    {
      q: `Do ${n}s bark a lot?`,
      a: isActive(b) || isProtective
        ? `${n}s tend to be vocal — they may bark at strangers, sounds, or when under-stimulated. Adequate daily exercise and mental enrichment (training sessions, puzzle feeders) significantly reduce nuisance barking. Teaching a "quiet" cue early is worthwhile.`
        : `${n}s are not considered excessive barkers. They may alert to strangers or unusual sounds, but are generally manageable with basic training. Consistent "quiet" reinforcement from puppyhood keeps this in check.`,
    },
    {
      q: `Are ${n}s good apartment dogs?`,
      a: isActive(b) && isLarge(b)
        ? `${n}s are not ideally suited to apartments — their size and energy level need outdoor space and significant daily exercise. If you do have an apartment, plan for 60–90 minutes of outdoor exercise daily and consider doggy daycare for additional stimulation.`
        : isCalm(b) || isSmall(b)
        ? `${n}s adapt reasonably well to apartment living, particularly if they receive consistent daily walks and indoor enrichment. Their ${isCalm(b) ? 'calm' : 'compact'} nature makes them less disruptive in confined spaces than high-energy large breeds.`
        : `${n}s can live in apartments if their exercise needs are met consistently. The key variable is owner commitment to daily walks and enrichment — breed size alone doesn't determine apartment suitability.`,
    },
  ];
}

function exerciseQAs(b) {
  const n = b.name;
  const minutes = isActive(b) ? '60–90 minutes' : isCalm(b) ? '30–45 minutes' : '45–60 minutes';
  const sessionsNote = isActive(b)
    ? 'Split across at least two sessions daily, with one higher-intensity session (running, fetch, swimming) and one loose-lead sniff walk.'
    : 'A structured morning walk and an evening sniff walk usually cover their needs.';
  return [
    {
      q: `How much exercise does a ${n} need per day?`,
      a: `${n}s need approximately ${minutes} of exercise daily. ${sessionsNote} Mental exercise (training sessions, puzzle feeders) counts toward overall stimulation needs and can reduce restless behaviour.`,
    },
    {
      q: `Are ${n}s good running partners?`,
      a: isActive(b)
        ? `Yes — ${n}s make excellent running partners once fully grown (typically 12–18 months for medium breeds, 18–24 months for large breeds). Start with shorter distances and build gradually to protect developing joints.`
        : isCalm(b)
        ? `${n}s are lower-energy dogs and are better suited to brisk walks or short jogs than distance running. Long runs can cause joint strain in lower-activity breeds — stick to 20–30 minute jogs rather than endurance runs.`
        : `${n}s can join you for moderate runs once fully grown. They're better suited to steady 3–5 mile runs than extended distance. Watch for signs of fatigue and always run in cooler hours during summer.`,
    },
    {
      q: `What happens if a ${n} doesn't get enough exercise?`,
      a: isActive(b)
        ? `Under-exercised ${n}s often develop destructive behaviours — chewing, digging, excessive barking, and hyperactivity indoors. These are symptoms of frustration, not bad temperament. Two missed exercise sessions back-to-back typically shows up as restlessness or nuisance behaviour.`
        : `${n}s are less demanding than high-energy breeds, but chronic under-exercise still leads to weight gain and low-level restlessness. Even lower-energy breeds benefit from a consistent daily walk for both physical health and mental stimulation.`,
    },
    {
      q: `Can a ${n} be off-lead?`,
      a: pick([
        `${n}s can be off-lead in secure areas once recall is reliable. Reliable recall typically takes 3–4 months of consistent training with progressive distance and distractions. Never trust off-lead recall in an unfenced area until it's been tested in controlled conditions first.`,
        `Off-lead freedom for a ${n} depends on recall reliability, not breed alone. Train recall from puppyhood using long-line sessions before progressing to full off-lead. A ${isHardTrain(b) ? 'long-line is recommended as an intermediate step for several months' : 'standard 20-foot long-line gives freedom while maintaining safety during the training phase'}.`,
      ], `${b.slug}-offleash`),
    },
  ];
}

function feedingQAs(b) {
  const n = b.name;
  const wt = weight(b);
  const cups = isSmall(b) ? '½–1½ cups' : isLarge(b) ? '3–5 cups' : '1½–3 cups';
  return [
    {
      q: `How much should I feed my ${n}?`,
      a: `A ${n}${wt ? ` (${wt})` : ''} needs approximately ${cups} of dry food per day for an adult, split across two meals. Always follow the feeding guide on your specific formula — calorie density varies significantly between brands. Adjust portions based on body condition: you should be able to feel (but not easily see) the ribs.`,
    },
    {
      q: `How many times a day should I feed a ${n}?`,
      a: `Adult ${n}s should eat twice daily. Puppies (under 6 months) need 3–4 smaller meals per day to support growth and prevent hypoglycaemia, particularly in small breeds. ${isLarge(b) ? 'For large and giant breeds, twice daily feeding also reduces the risk of bloat (GDV) compared to one large daily meal.' : ''}`,
    },
    {
      q: `What is the best food for a ${n}?`,
      a: `Look for a formula carrying an AAFCO adequacy statement for the correct life stage. A named protein source (chicken, turkey, beef, salmon) should appear first in the ingredient list. ${isActive(b) ? `Active ${n}s benefit from higher-protein formulas (26–30% crude protein) to support muscle maintenance.` : isCalm(b) ? `Lower-energy ${n}s are prone to weight gain — choose a formula with controlled fat content and avoid calorie-dense performance formulas.` : `Medium-energy ${n}s do well on standard adult maintenance formulas with named protein as the first ingredient.`}`,
    },
    {
      q: `When should I switch my ${n} from puppy to adult food?`,
      a: isSmall(b)
        ? `Small breeds typically transition to adult food around 12 months. Moving too late keeps them on higher-calorie puppy formulas that can cause weight gain in lower-activity adults.`
        : isLarge(b)
        ? `Large breeds should stay on a large-breed puppy formula until 18–24 months, then transition to an adult formula. Switching too early can disrupt joint development during the growth phase.`
        : `Most ${n}s can transition to adult food between 12 and 15 months. Transition gradually over 7–10 days — mix 25% new food with 75% old food and shift the ratio every 2 days to avoid digestive upset.`,
    },
  ];
}

function suitabilityQAs(b) {
  const n = b.name;
  const isFirstDog = isEasyTrain(b) && !isLarge(b) && !isActive(b);
  const isChallengingFirst = isHardTrain(b) || (isLarge(b) && isActive(b));
  return [
    {
      q: `Is a ${n} a good dog for first-time owners?`,
      a: isFirstDog
        ? `${n}s are generally considered suitable for first-time owners. They're responsive to training, manageable in size, and adaptable to different home environments. A puppy class is still recommended to build a strong foundation.`
        : isChallengingFirst
        ? `${n}s can be challenging for first-time owners due to their ${isHardTrain(b) ? 'independent temperament' : 'size and exercise demands'}. Prior dog experience or professional training classes from the start significantly improves outcomes. Research the breed thoroughly before committing.`
        : `${n}s are manageable for motivated first-time owners who research the breed, commit to early training, and have realistic expectations about time and cost.`,
    },
    {
      q: `Are ${n}s good family dogs?`,
      a: /friendly|affectionate|loving|gentle/i.test(b.temperament || '')
        ? `${n}s are typically affectionate family dogs that do well with children and adapt to household routines. Their sociable nature means they prefer company over isolation.`
        : isActive(b)
        ? `${n}s can be excellent family dogs for active households. They thrive with children who can match their energy level. A calm household with limited exercise may not suit this breed's temperament.`
        : `${n}s can be good family dogs when properly socialised. Their suitability depends more on individual temperament and upbringing than breed alone.`,
    },
    {
      q: `Do ${n}s do well when left alone?`,
      a: /independent|aloof/i.test(b.temperament || '')
        ? `${n}s are more independent than many breeds and generally tolerate alone time better than highly social dogs. Still, aim for no more than 4–6 hours alone for an adult dog, and less for puppies.`
        : `${n}s form strong bonds with their owners and do not do well with extended isolation. Aim for no more than 4–6 hours alone at a time. If your schedule requires longer absences, consider a dog walker, doggy daycare, or a companion dog.`,
    },
    {
      q: `How much time do you need for a ${n}?`,
      a: `Plan for ${isActive(b) ? '2–3 hours' : isCalm(b) ? '1–1.5 hours' : '1.5–2 hours'} per day dedicated to your ${n} — covering exercise, training, feeding and general interaction. ${isLongCt(b) || isHeavyShed(b) ? 'Add 15–30 minutes for grooming 3–4 times weekly.' : ''} The commitment is consistent year-round, not just when convenient.`,
    },
  ];
}

// ── Main generator ─────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const TOPICS = [
  { key: 'cost',        label: 'Cost',          genFn: costQAs },
  { key: 'grooming',    label: 'Grooming',       genFn: groomingQAs },
  { key: 'training',    label: 'Training',       genFn: trainingQAs },
  { key: 'health',      label: 'Health',         genFn: healthQAs },
  { key: 'behavior',    label: 'Behaviour',      genFn: behaviorQAs },
  { key: 'exercise',    label: 'Exercise',       genFn: exerciseQAs },
  { key: 'feeding',     label: 'Feeding',        genFn: feedingQAs },
  { key: 'suitability', label: 'Suitability',    genFn: suitabilityQAs },
];

let generated = 0;
let skipped = 0;
const processed = [];

const breedSubset = breeds.slice(0, LIMIT);

for (const breed of breedSubset) {
  if (!breed.slug || !breed.name) { skipped++; continue; }

  const topics = {};
  for (const { key, label, genFn } of TOPICS) {
    topics[key] = {
      label,
      slug: `${breed.slug}-${key}`,
      faqs: genFn(breed),
    };
  }

  const breedFaq = {
    breedSlug: breed.slug,
    breedName: breed.name,
    generatedAt: TODAY,
    topics,
  };

  if (APPLY) {
    fs.mkdirSync(FAQ_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(FAQ_DIR, `${breed.slug}.json`),
      `${JSON.stringify(breedFaq, null, 2)}\n`,
      'utf8',
    );
    generated++;
  } else {
    skipped++;
  }

  processed.push(breed.slug);
}

const result = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  limit: LIMIT === Infinity ? 'all' : LIMIT,
  totalBreeds: breeds.length,
  processed: processed.length,
  generatedCount: generated,
  skippedCount: skipped,
  topicCount: TOPICS.length,
  exampleFile: processed[0] ? `src/data/faq/${processed[0]}.json` : null,
};

console.log(JSON.stringify(result, null, 2));
