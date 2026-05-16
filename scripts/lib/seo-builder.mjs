/**
 * scripts/lib/seo-builder.mjs
 *
 * Generates per-breed SEO title and meta description.
 *
 * Uses the `seo_angle` field from deriveProfile() to select one of six
 * angle templates. This eliminates the near-duplicate title problem where
 * every large active breed gets "Large Active Dog Breed Guide".
 *
 * All templates are ≤ 60 characters for title and ≤ 160 for description.
 */

/**
 * Title templates keyed by seo_angle.
 * Placeholders: {{name}}, {{origin_country}}, {{akc_group_short}},
 *               {{size_category}}, {{coat_type}}, {{lifespan_str}}, {{weight_str}}
 *
 * All templates produce ≤60 chars for typical values.
 */
const TITLE_TEMPLATES = {
  intelligence:
    '{{name}}: One of the World\'s Most Intelligent Dogs',

  intelligence_b:
    '{{name}} Training Guide: Smart Breed, High Standards',

  health:
    '{{name}} Health Guide: What Every Owner Must Know',

  health_b:
    '{{name}} Lifespan, Health Issues & Vet Cost Guide',

  coat:
    '{{name}} Grooming Guide: {{coat_type}} Coat Care',

  coat_b:
    '{{name}} Shedding & Grooming: What Owners Need to Know',

  giant:
    '{{name}}: Giant Breed Care, Costs & Lifespan',

  giant_b:
    '{{name}} Owner Guide: Size, Diet & Joint Health',

  working:
    '{{name}}: {{akc_group_short}} Breed — Training & Energy Guide',

  working_b:
    '{{name}}: Working Dog Care, Exercise & Mental Stimulation',

  origin:
    '{{name}}: A Dog Breed from {{origin_country}}',

  origin_b:
    '{{name}} — {{origin_country}} Heritage, Traits & Modern Care',

  herding:
    '{{name}} Herding Dog Guide: Energy, Training & Routines',

  athletic:
    '{{name}} Athletic Breed Guide: Exercise, Training & Stamina',

  toy:
    '{{name}} Small Breed Guide: Personality, Care & Costs',

  toy_b:
    '{{name}}: Compact, Loyal & Full of Character — Owner Guide',

  size:
    '{{name}} Breed Guide: Traits, Care & Costs',

  size_b:
    '{{name}}: Complete Breed Overview for New & Experienced Owners',

  size_c:
    'Is a {{name}} Right for You? Traits, Costs & Care Needs',
};

/**
 * Description templates keyed by seo_angle.
 * Each ≤ 160 characters when filled with typical values.
 * Placeholders match TITLE_TEMPLATES plus any field from deriveProfile().
 */
const DESC_TEMPLATES = {
  intelligence:
    'The {{name}} ranks in the elite tier for working intelligence. Discover training tips, exercise needs, and care advice for this exceptionally responsive {{size_category}} breed.',

  intelligence_b:
    'Smart and driven, the {{name}} excels with consistent positive training. Breed guide covering learning style, daily mental stimulation, and common handler mistakes.',

  health:
    'Everything you need to know about {{name}} health: lifespan of {{lifespan_str}}, key conditions to screen for, and how to keep your {{size_category}} dog thriving for years.',

  health_b:
    '{{name}} owners should know about these health conditions, typical vet costs, and how lifespan of {{lifespan_str}} compares to similar breeds. Full health and care guide.',

  coat:
    '{{name}} has a {{coat_type}} coat requiring {{coat_care_label}}. Full grooming guide, shedding management, and pro vs home-care cost breakdown.',

  coat_b:
    'Managing a {{name}}\'s {{coat_type}} coat doesn\'t have to be hard. Grooming frequency, tool recommendations, and shedding advice for {{name}} owners.',

  giant:
    'The {{name}} is a gentle giant weighing {{weight_or_size}}. Complete guide to giant-breed nutrition, joint health, exercise, and typical lifespan of {{lifespan_str}}.',

  giant_b:
    'Owning a {{name}} means planning for size. Joint health, food costs, vet bills, and exercise needs for this {{weight_or_size}} breed — fully explained.',

  working:
    'As a {{historic_role}}, the {{name}} needs purpose and structure. Training guide, daily exercise requirements, and suitability advice for active families.',

  working_b:
    'The {{name}} is built to work — and needs an outlet. Energy management, training structure, and care needs for this driven {{akc_group_short}} breed.',

  origin:
    'The {{name}} comes from {{origin_country}} — and its heritage shapes everything about its temperament. Breed guide covering traits, care, and what to expect as an owner.',

  origin_b:
    'Bred in {{origin_country}}, the {{name}} carries centuries of purpose in its genes. Modern care guide covering temperament, exercise, and owner fit.',

  herding:
    'The {{name}} is a herding breed that needs a job. Daily exercise requirements, mental stimulation ideas, and owner-fit checklist for this high-drive {{size_category}} dog.',

  athletic:
    'Athletic and tireless, the {{name}} thrives with structured activity. Exercise guide, training tips, and nutrition notes for performance-ready {{name}} owners.',

  toy:
    'Small in size but big in character, the {{name}} is a rewarding companion for the right owner. Personality, care needs, health profile, and true costs explained.',

  toy_b:
    'The {{name}} packs a lot into a small frame — loyalty, energy, and personality. What new {{name}} owners need to know about care, training, and daily life.',

  size:
    'Complete {{name}} breed guide: temperament, exercise needs, grooming, health, and true ownership costs. Everything to know before bringing one home.',

  size_b:
    '{{name}} breed overview: what they\'re like to live with, how much they cost to own, and whether they suit your home, family, and lifestyle.',

  size_c:
    'Thinking about a {{name}}? Read this first. Realistic guide to {{name}} temperament, training, grooming, health, and monthly ownership costs.',
};

// ── Helper: strip " Group" from AKC group string ──────────────────
function shortGroup(akc_group = '') {
  return akc_group.replace(' Group', '').replace(' Class', '').replace(' Service', '');
}

/**
 * Build SEO title and description for one breed.
 *
 * @param {object} profile - enriched breed from deriveProfile()
 * @returns {{ title: string, description: string }}
 */
// Sub-angle variants for each base angle. Used to spread breeds across more templates.
const ANGLE_VARIANTS = {
  intelligence: ['intelligence', 'intelligence_b'],
  health:       ['health', 'health_b'],
  coat:         ['coat', 'coat_b'],
  giant:        ['giant', 'giant_b'],
  working:      ['working', 'working_b'],
  origin:       ['origin', 'origin_b'],
  herding:      ['herding'],
  athletic:     ['athletic'],
  toy:          ['toy', 'toy_b'],
  size:         ['size', 'size_b', 'size_c'],
};

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}

export function buildSEO(profile) {
  const baseAngle = profile.seo_angle || 'size';
  const variants = ANGLE_VARIANTS[baseAngle] || ANGLE_VARIANTS.size;
  // Use breed slug to pick a stable variant — different for each breed
  const angle = variants[djb2(profile.slug || profile.name || '') % variants.length];

  const ctx = {
    ...profile,
    akc_group_short:  shortGroup(profile.akc_group),
    weight_or_size:   profile.weight_str ?? `${profile.size_category}-sized`,
    country_or_group: profile.origin_country ?? shortGroup(profile.akc_group),
    // Extract the care action from the label (e.g. "high — hand-stripping required" → "hand-stripping")
    coat_care_label:  (() => {
      const raw = profile.coat_care_label ?? 'regular brushing';
      const parts = raw.split('—');
      const desc = parts.length > 1 ? parts[1].trim() : raw;
      // Truncate to first clause; strip trailing "required" participle
      return desc.split(/[,;]/)[0].trim().replace(/\s+required\s*$/i, '');
    })(),
    coat_type:        profile.coat_type ? profile.coat_type.charAt(0).toUpperCase() + profile.coat_type.slice(1) : 'Standard',
    lifespan_str:     profile.lifespan_str ?? '10–13 years',
    historic_role:    profile.historic_role ?? 'companion dog',
  };

  const title = fill(TITLE_TEMPLATES[angle] ?? TITLE_TEMPLATES.size, ctx);
  const description = fill(DESC_TEMPLATES[angle] ?? DESC_TEMPLATES.size, ctx);

  return { title: truncate(title, 60), description: truncate(description, 160) };
}

/**
 * Build SEO for every breed in an array and return keyed map.
 * @param {object[]} profiles - array of deriveProfile() results
 * @returns {Map<string, {title:string, description:string}>} keyed by breed.slug
 */
export function buildSEOMap(profiles) {
  const map = new Map();
  for (const p of profiles) {
    map.set(p.slug, buildSEO(p));
  }
  return map;
}

// ── Internal helpers ──────────────────────────────────────────────

function fill(template, ctx) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : `{{${key}}}`
  );
}

function truncate(str, max) {
  if (str.length <= max) return str;
  // Cut at last word boundary before max
  return str.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// ── CLI usage: node scripts/lib/seo-builder.mjs [slug] ───────────
if (process.argv[1].endsWith('seo-builder.mjs')) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { deriveProfile } = await import('./breed-profile.mjs');
  const breeds = require('../../src/data/master-breeds.json');
  const slug = process.argv[2];

  if (slug) {
    const b = breeds.find(x => x.slug === slug);
    if (!b) { console.error(`Breed not found: ${slug}`); process.exit(1); }
    const p = deriveProfile(b);
    const seo = buildSEO(p);
    console.log(`Angle : ${p.seo_angle}`);
    console.log(`Title : ${seo.title}`);
    console.log(`Desc  : ${seo.description}`);
  } else {
    // Preview distribution across all breeds
    const profiles = breeds.map(deriveProfile);
    const angleCounts = {};
    for (const p of profiles) {
      angleCounts[p.seo_angle] = (angleCounts[p.seo_angle] || 0) + 1;
    }
    console.log('SEO angle distribution across all breeds:');
    for (const [angle, count] of Object.entries(angleCounts).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${angle.padEnd(14)} ${count}`);
    }
    // Show 3 sample titles per angle
    console.log('\nSample titles by angle:');
    const shown = {};
    for (const p of profiles) {
      if (!shown[p.seo_angle] || shown[p.seo_angle] < 3) {
        const seo = buildSEO(p);
        console.log(`  [${p.seo_angle}] ${seo.title}`);
        shown[p.seo_angle] = (shown[p.seo_angle] || 0) + 1;
      }
    }
  }
}
