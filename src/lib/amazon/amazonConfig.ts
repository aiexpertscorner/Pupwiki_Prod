export const AMAZON_ASSOCIATE_TAG =
  import.meta.env.PUBLIC_AMAZON_TAG || 'aiexpertscorn-20';

export const ENABLE_AMAZON_BUTTONS =
  import.meta.env.PUBLIC_ENABLE_AMAZON_BUTTONS !== 'false';

export const AMAZON_DISCLOSURE =
  'As an Amazon Associate, PupWiki may earn from qualifying purchases. Product availability and listing details can change on Amazon.';

const CATEGORY_TAG_MAP: Record<string, string[]> = {
  'dog-food': [
    'food',
    'nutrition',
    'feeding',
    'treats',
    'bowls',
    'storage',
    'puppy',
    'senior-dog',
  ],
  toys: [
    'toys',
    'toy',
    'enrichment',
    'chew',
    'mental-stimulation',
    'puzzle',
    'high-energy',
    'fetch',
  ],
  health: [
    'health',
    'wellness',
    'dental',
    'joint',
    'supplements',
    'pill',
    'calming',
    'first-aid',
  ],
  training: [
    'training',
    'behavior',
    'leash',
    'harness',
    'crate-training',
    'recall',
    'obedience',
    'safety',
  ],
  grooming: [
    'grooming',
    'shedding',
    'coat-care',
    'brush',
    'bath',
    'shampoo',
    'nails',
  ],
  beds: [
    'bed',
    'beds',
    'sleep',
    'orthopedic',
    'comfort',
    'home',
    'senior-dog',
  ],
  supplements: [
    'supplements',
    'joint',
    'probiotic',
    'omega',
    'calming',
    'dental',
    'wellness',
  ],
  'smart-tech': [
    'gps',
    'tracker',
    'camera',
    'smart-tech',
    'monitoring',
    'feeder',
  ],
  travel: [
    'travel',
    'car',
    'carrier',
    'crate',
    'road-trip',
    'outdoor',
    'safety',
  ],
  lifestyle: [
    'gift',
    'lifestyle',
    'home',
    'accessory',
    'cleanup',
    'odor',
    'poop-bags',
  ],
  puppy: [
    'puppy',
    'crate-training',
    'house-training',
    'cleanup',
    'home-setup',
    'chew',
    'puppy-food',
  ],
  'senior-dogs': [
    'senior-dog',
    'orthopedic',
    'beds',
    'joint',
    'comfort',
    'mobility',
    'wellness',
  ],
  insurance: [
    'insurance',
    'health',
    'vet-care',
    'puppy',
    'senior-dog',
  ],
  'pupwiki-partners': [
    'partner',
    'awin',
    'affiliate',
    'dog-supplies',
    'dog-products',
  ],
  home: [
    'home',
    'cleanup',
    'odor',
    'gate',
    'crate',
    'bed',
    'storage',
  ],
  gear: [
    'gear',
    'harness',
    'leash',
    'collar',
    'safety',
    'travel',
  ],
};

export function normalizeAmazonTag(value?: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9/\[\]-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeAmazonPath(value?: unknown) {
  const path = String(value ?? '').trim();
  if (!path) return '';

  const withoutDomain = path.replace(/^https?:\/\/[^/]+/i, '');
  const normalized = withoutDomain.startsWith('/') ? withoutDomain : `/${withoutDomain}`;

  return normalized
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function uniqueAmazonTags(values: string[]) {
  const seen = new Set<string>();

  return values
    .map(normalizeAmazonTag)
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

export function getAmazonCategoryTags(category?: string, extraTags: Array<string | undefined> = []) {
  const normalized = normalizeAmazonTag(category);
  return uniqueAmazonTags([
    ...(CATEGORY_TAG_MAP[normalized] ?? []),
    normalized,
    ...extraTags.filter(Boolean).map(String),
  ]);
}

export function getAmazonCategoryLabel(category?: string) {
  const normalized = normalizeAmazonTag(category);
  return normalized
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
