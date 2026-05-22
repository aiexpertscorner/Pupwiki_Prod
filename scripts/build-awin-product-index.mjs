#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'src/data/awin-products.json');
const normalizedPath = path.join(root, 'src/data/awin-products.normalized.json');
const statsPath = path.join(root, 'src/data/awin-product-stats.json');
const programConfigPath = path.join(root, 'src/data/awin-program-config.json');
const manualRulesPath = path.join(root, 'src/data/awin-manual-rules.json');

// --- Utilities ---

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstString(product, keys) {
  for (const key of keys) {
    const value = product[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// --- Taxonomy ---

const productTypeKeywords = {
  food: ['food', 'meal', 'kibble', 'broth', 'topper', 'recipe', 'fresh food'],
  treats: ['treat', 'chew', 'jerky', 'biscuit', 'cookie'],
  supplement: ['supplement', 'joint', 'probiotic', 'omega', 'vitamin', 'hip', 'mobility', 'calming'],
  toy: ['toy', 'ball', 'rope', 'plush', 'squeaky', 'puzzle', 'enrichment'],
  grooming: ['grooming', 'brush', 'comb', 'shampoo', 'conditioner', 'nail', 'dryer', 'deshedding'],
  bed: ['bed', 'mattress', 'blanket', 'orthopedic'],
  crate: ['crate', 'kennel', 'pen', 'gate'],
  training: ['training', 'clicker', 'whistle', 'reward', 'muzzle'],
  walking: ['leash', 'harness', 'collar', 'lead', 'poop bag'],
  travel: ['carrier', 'travel', 'car seat', 'seat belt', 'backpack'],
  cleaning: ['cleaner', 'odor', 'stain', 'pee', 'wipes', 'waste'],
  'health-care': ['health', 'care', 'wound', 'dental', 'toothbrush', 'ear cleaner'],
  'brand-merch': ['cap', 'hat', 'trucker', 'shirt', 't-shirt', 'tee', 'hoodie', 'sweatshirt', 'mug', 'sticker', 'tote', 'poster', 'beanie'],
  service: ['subscription', 'membership', 'service', 'insurance'],
};

const typeToContentFit = {
  food: ['nutrition', 'food', 'feeding', 'puppy', 'senior', 'hydration'],
  treats: ['training', 'treats', 'enrichment', 'puppy'],
  supplement: ['joint-health', 'senior', 'recovery', 'calming', 'digestion'],
  toy: ['enrichment', 'training', 'exercise', 'puppy'],
  grooming: ['grooming', 'coat-care', 'shedding', 'hygiene'],
  bed: ['comfort', 'sleep', 'large-dog', 'senior'],
  crate: ['puppy', 'training', 'home-setup', 'travel'],
  training: ['training', 'behavior', 'puppy'],
  walking: ['walking', 'outdoor', 'training', 'safety'],
  travel: ['travel', 'outdoor', 'safety'],
  cleaning: ['cleaning', 'puppy', 'home-care'],
  'health-care': ['health', 'care', 'hygiene'],
  'brand-merch': ['brand', 'merch'],
  service: ['services', 'insurance', 'membership'],
  unknown: [],
};

const ALL_PLACEMENTS = [
  'homepage-rail', 'category-primary', 'category-secondary',
  'article-inline', 'article-end', 'breed-care', 'brand-grid',
  'brand-page-secondary', 'review-rail', 'tool-context',
];

const MERCH_EXCLUDED = [
  'homepage-rail', 'category-primary', 'category-secondary',
  'article-inline', 'article-end', 'breed-care', 'review-rail', 'tool-context',
];

const MERCH_ALLOWED = ['brand-grid', 'brand-page-secondary'];

function containsAny(text, keywords) {
  const norm = normalizeText(text);
  const wordSet = new Set(norm.split(' '));
  return keywords.some((kw) => {
    const normKw = normalizeText(kw);
    // Multi-word keywords use substring; single words require whole-word match
    if (normKw.includes(' ')) return norm.includes(normKw);
    return wordSet.has(normKw);
  });
}

function detectType(product) {
  // Merch check runs on name only to avoid false positives from descriptions
  const nameOnly = normalizeText(product.name || '');
  if (containsAny(nameOnly, productTypeKeywords['brand-merch'])) return 'brand-merch';

  const text = normalizeText(
    `${product.name || ''} ${product.description || ''} ${product.category || ''} ${Array.isArray(product.topicTags) ? product.topicTags.join(' ') : ''}`,
  );
  for (const type of Object.keys(productTypeKeywords)) {
    if (type === 'brand-merch') continue;
    if (containsAny(text, productTypeKeywords[type])) return type;
  }
  return 'unknown';
}

function commercialIntent(type, hasImage, hasUrl) {
  if (!hasUrl) return 'low';
  if (type === 'brand-merch' || type === 'unknown') return 'low';
  if (!hasImage) return 'medium';
  if (['food', 'treats', 'toy', 'grooming', 'bed', 'crate', 'training', 'walking', 'travel', 'cleaning'].includes(type)) return 'high';
  return 'medium';
}

function qualityScore({ url, image, name, description, price, currency, merchant, syncedAt }) {
  let score = 0;
  if (url) score += 25;
  if (image) score += 25;
  if (name.length >= 4) score += 10;
  if (description.length >= 20) score += 10;
  if (typeof price === 'number') score += 10;
  if (currency) score += 5;
  if (merchant) score += 10;
  if (syncedAt) score += 5;
  return Math.min(score, 100);
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeText).filter(Boolean))];
}

// --- Load configs ---

let programConfig = { programs: [] };
if (fs.existsSync(programConfigPath)) {
  programConfig = JSON.parse(fs.readFileSync(programConfigPath, 'utf8'));
}

let manualRules = { merchants: {}, productOverrides: {}, globalExcludeProductNameContains: [] };
if (fs.existsSync(manualRulesPath)) {
  manualRules = JSON.parse(fs.readFileSync(manualRulesPath, 'utf8'));
}

// Build programId → priority lookup
const programPriorityMap = new Map();
for (const program of programConfig.programs || []) {
  if (program.id && typeof program.priority === 'number') {
    programPriorityMap.set(program.id, program.priority);
  }
}

function getMerchantPriority(programId, merchant, manualMerchant) {
  // 1. Match by programId
  if (programId && programPriorityMap.has(programId)) {
    const base = programPriorityMap.get(programId);
    const boost = manualMerchant?.boost || 0;
    return Math.min(100, base + boost);
  }
  // 2. Try to match by normalized merchant name
  const normMerchant = normalizeText(merchant);
  for (const [id, priority] of programPriorityMap) {
    if (normMerchant.includes(normalizeText(id))) {
      const boost = manualMerchant?.boost || 0;
      return Math.min(100, priority + boost);
    }
  }
  return 50;
}

function shouldExcludeByManualRules(product, merchant) {
  const globalExcludes = manualRules.globalExcludeProductNameContains || [];
  const name = normalizeText(product.name || '');
  for (const kw of globalExcludes) {
    if (name.includes(normalizeText(kw))) return true;
  }

  const merchantRule = manualRules.merchants?.[merchant];
  if (!merchantRule) return false;

  const excludeKws = merchantRule.excludeProductNameContains || [];
  for (const kw of excludeKws) {
    if (name.includes(normalizeText(kw))) return true;
  }

  return false;
}

// --- Normalize ---

function normalizeProduct(product, index) {
  const name = firstString(product, ['name']);
  const description = firstString(product, ['description']);
  const url = firstString(product, ['url', 'deepLink', 'clickUrl']);
  const image = firstString(product, ['image', 'imageUrl', 'image_url']);
  const merchant = firstString(product, ['merchant', 'advertiserName', 'programName']);
  const awProductId = firstString(product, ['awProductId', 'awProductld', 'awProductID', 'aw_product_id']);
  const merchantProductId = firstString(product, ['merchantProductId', 'merchantProductld', 'merchantProductID']);
  const advertiserId = firstString(product, ['advertiserId', 'advertiserld', 'advertiserID']);
  const programId = firstString(product, ['programId', 'programld', 'programID']);
  const category = firstString(product, ['category']);
  const topicTags = normalizeTags(product.topicTags);
  const price = parsePrice(product.price);
  const currency = firstString(product, ['currency']);
  const syncedAt = firstString(product, ['syncedAt']);
  const availability = firstString(product, ['availability']);
  const normalizedType = detectType(product);
  const warnings = [];

  if (!url) warnings.push('missing-url');
  if (!image) warnings.push('missing-image');
  if (!merchant) warnings.push('missing-merchant');
  if (!price) warnings.push('missing-price');
  if (!availability) warnings.push('unknown-availability');
  if (normalizedType === 'brand-merch') warnings.push('brand-merch');

  const manualMerchant = manualRules.merchants?.[merchant];
  const merchantPriority = getMerchantPriority(programId, merchant, manualMerchant);

  const allowedPlacements = normalizedType === 'brand-merch' ? MERCH_ALLOWED : ALL_PLACEMENTS;
  const excludedPlacements = normalizedType === 'brand-merch' ? MERCH_EXCLUDED : [];

  return {
    id: firstString(product, ['id']) || `${programId || merchant || 'awin'}-${awProductId || merchantProductId || index}`,
    awProductId,
    merchantProductId,
    name,
    description,
    price,
    currency,
    url,
    image,
    merchant,
    category,
    advertiserId,
    programId,
    topicTags,
    availability,
    source: firstString(product, ['source']),
    syncedAt,
    normalizedName: normalizeText(name),
    normalizedType,
    commercialIntent: commercialIntent(normalizedType, Boolean(image), Boolean(url)),
    contentFit: [...new Set([...(typeToContentFit[normalizedType] || []), ...topicTags])],
    allowedPlacements,
    excludedPlacements,
    qualityScore: qualityScore({ url, image, name, description, price, currency, merchant, syncedAt }),
    merchantPriority,
    warnings,
  };
}

function dedupe(products) {
  const seen = new Set();
  const output = [];
  for (const product of products) {
    const key = `${normalizeText(product.merchant)}|${product.normalizedName}|${normalizeText(product.merchantProductId || product.awProductId || product.image || '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(product);
  }
  return output;
}

// --- Main ---

if (!fs.existsSync(inputPath)) {
  console.error(`Missing ${inputPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(raw)) {
  console.error('Expected awin-products.json to be an array.');
  process.exit(1);
}

const allNormalized = raw.map(normalizeProduct);
const filtered = allNormalized.filter(
  (p) => !shouldExcludeByManualRules(raw[allNormalized.indexOf(p)] || {}, p.merchant),
);
const normalized = dedupe(filtered);

const stats = {
  generatedAt: new Date().toISOString(),
  totalRawProducts: raw.length,
  totalNormalizedProducts: normalized.length,
  removedDuplicates: raw.length - normalized.length,
  byType: {},
  byMerchant: {},
  byPriority: {},
  warnings: {},
};

for (const product of normalized) {
  stats.byType[product.normalizedType] = (stats.byType[product.normalizedType] || 0) + 1;
  stats.byMerchant[product.merchant || 'unknown'] = (stats.byMerchant[product.merchant || 'unknown'] || 0) + 1;
  const bucket = `priority-${product.merchantPriority}`;
  stats.byPriority[bucket] = (stats.byPriority[bucket] || 0) + 1;
  for (const warning of product.warnings) {
    stats.warnings[warning] = (stats.warnings[warning] || 0) + 1;
  }
}

fs.writeFileSync(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`);
fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);

console.log(`Wrote ${normalized.length} products to ${normalizedPath}`);
console.log(`Wrote stats to ${statsPath}`);
console.log(`Removed: ${raw.length - normalized.length} duplicates/excluded`);
console.log('Type breakdown:', JSON.stringify(stats.byType, null, 2));
