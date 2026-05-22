#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'src/data/awin-products.json');

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirst(product, keys) {
  for (const key of keys) {
    const value = product[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

const merchKeywords = [
  'cap', 'hat', 'trucker', 'shirt', 't-shirt', 'tee', 'hoodie',
  'sweatshirt', 'mug', 'sticker', 'tote', 'poster', 'beanie',
];

function isMerch(product) {
  const text = normalizeText(`${product.name || ''} ${product.description || ''}`);
  const wordSet = new Set(text.split(' '));
  return merchKeywords.some((kw) => {
    const normKw = normalizeText(kw);
    if (normKw.includes(' ')) return text.includes(normKw);
    return wordSet.has(normKw);
  });
}

if (!fs.existsSync(inputPath)) {
  console.error(`Missing ${inputPath}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`Invalid JSON in ${inputPath}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error('Expected awin-products.json to be an array.');
  process.exit(1);
}

const merchants = new Map();
const programs = new Map();
const fields = new Map();
const topicTags = new Map();
const missing = { url: 0, image: 0, price: 0, merchant: 0 };
let merchCount = 0;
let duplicateCount = 0;
const seen = new Set();

for (const product of data) {
  Object.keys(product).forEach((key) => fields.set(key, (fields.get(key) || 0) + 1));

  const merchant = getFirst(product, ['merchant', 'advertiserName', 'programName']) || 'unknown';
  const programId = getFirst(product, ['programId', 'programld', 'programID']) || 'unknown';
  const url = getFirst(product, ['url', 'deepLink', 'clickUrl']);
  const image = getFirst(product, ['image', 'imageUrl', 'image_url']);
  const name = getFirst(product, ['name']);
  const price = product.price;

  merchants.set(merchant, (merchants.get(merchant) || 0) + 1);
  programs.set(programId, (programs.get(programId) || 0) + 1);
  if (!url) missing.url += 1;
  if (!image) missing.image += 1;
  if (price === undefined || price === null || price === '') missing.price += 1;
  if (!merchant || merchant === 'unknown') missing.merchant += 1;
  if (isMerch(product)) merchCount += 1;

  if (Array.isArray(product.topicTags)) {
    for (const tag of product.topicTags) {
      const normalized = normalizeText(tag);
      if (normalized) topicTags.set(normalized, (topicTags.get(normalized) || 0) + 1);
    }
  }

  const dedupeKey = `${normalizeText(merchant)}|${normalizeText(name)}|${normalizeText(image)}`;
  if (seen.has(dedupeKey)) duplicateCount += 1;
  seen.add(dedupeKey);
}

function top(map, limit = 20) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

const report = {
  totalProducts: data.length,
  merchants: merchants.size,
  programs: programs.size,
  missing,
  suspectedMerchProducts: merchCount,
  suspectedDuplicates: duplicateCount,
  topMerchants: top(merchants, 20),
  topPrograms: top(programs, 20),
  topTopicTags: top(topicTags, 40),
  observedFields: top(fields, 100),
};

console.log(JSON.stringify(report, null, 2));
