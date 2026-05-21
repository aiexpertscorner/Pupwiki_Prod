
import { getCollection, type CollectionEntry } from 'astro:content';

import homepageConfig from '../../data/homepage-config.json';
import masterBreeds from '../../data/master-breeds.json';
import masterCrossbreeds from '../../data/master-crossbreeds.json';

type AnyRecord = Record<string, any>;

type HomepageConfig = typeof homepageConfig;
type BreedLike = AnyRecord;

export type HomepageHeroStat = {
  value: string;
  label: string;
};

export type HomepageBreedCard = {
  slug: string;
  href: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  tags: string[];
  size?: string;
  energy?: string;
  trainability?: string;
  popularity?: number | null;
};

export type HomepageCostBreed = {
  slug: string;
  href: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  annualFoodCost: number;
  lifetimeCost: number;
  size: string;
};

export type HomepageMixedBreedCard = {
  slug: string;
  href: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  parent1: string;
  parent2: string;
  size: string;
  energy: string;
  trainability: string;
  isPoodleMix: boolean;
};

export type HomepageEditorialCard = {
  category: string;
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
  imageAlt?: string;
  publishedAt?: string;
};

export type HomepageData = {
  seo: HomepageConfig['seo'];
  routes: HomepageConfig['routes'];
  featureFlags: HomepageConfig['featureFlags'];
  selection: HomepageConfig['selection'];
  hero: HomepageConfig['hero'] & {
    stats: HomepageHeroStat[];
    trustItems: string[];
  };
  primaryJourneys: HomepageConfig['primaryJourneys'];
  trustStrip: HomepageConfig['trustStrip'] & {
    items: HomepageHeroStat[];
  };
  breedDiscovery: HomepageConfig['breedDiscovery'] & {
    breeds: HomepageBreedCard[];
  };
  mixedBreedDiscovery: HomepageConfig['mixedBreedDiscovery'] & {
    items: HomepageMixedBreedCard[];
  };
  lifestyleFilters: HomepageConfig['lifestyleFilters'];
  quickCostTeaser: HomepageConfig['quickCostTeaser'] & {
    breeds: HomepageCostBreed[];
  };
  careDecisionLayer: HomepageConfig['careDecisionLayer'];
  editorialHighlights: HomepageConfig['editorialHighlights'] & {
    items: HomepageEditorialCard[];
  };
  methodologyTeaser: HomepageConfig['methodologyTeaser'];
  leadCapture: HomepageConfig['leadCapture'];
  stats: {
    breedCount: number;
    mixedBreedCount: number;
    dogNameCount: number;
  };
};

const config = homepageConfig as HomepageConfig;
const breeds = masterBreeds as BreedLike[];
const crossbreeds = masterCrossbreeds as BreedLike[];

function toArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toNumberValue(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function sentenceCase(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => sentenceCase(part))
    .join(' ');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function hasUsableImage(item: BreedLike): boolean {
  return typeof item?.image_url === 'string' && item.image_url.startsWith('http');
}

function breedDetailHref(slug: string): string {
  const prefix = config.routes.breedDetailPrefix || '/breeds';
  return `${prefix.replace(/\/$/, '')}/${slug}`;
}

function mixedBreedDetailHref(slug: string): string {
  const prefix = config.routes.mixedBreedDetailPrefix || '/breeds';
  return `${prefix.replace(/\/$/, '')}/${slug}`;
}

function getBreedSubtitle(breed: BreedLike): string {
  const temperament = toStringValue(breed.temperament);
  const group = toStringValue(breed.akc_group).replace(/\s+Group$/, '');
  const origin = toStringValue(breed.origin_country);

  if (temperament) return truncate(temperament, 90);
  if (group && origin) return `${group} breed from ${origin}`;
  if (group) return `${group} breed guide`;
  if (origin) return `Breed guide for this dog from ${origin}`;
  return 'Explore traits, care needs, and practical guidance';
}

function buildBreedTags(breed: BreedLike): string[] {
  const tags = new Set<string>();

  const size = toStringValue(breed.size_category);
  const energy = toStringValue(breed.energy_level);
  const training = toStringValue(breed.training_level);
  const coat = toStringValue(breed.coat_type);
  const popularity = toNumberValue(breed.akc_popularity);

  if (size) tags.add(sentenceCase(size));
  if (energy) tags.add(sentenceCase(energy));
  if (training) tags.add(`${sentenceCase(training)} training`);
  if (coat) tags.add(`${sentenceCase(coat)} coat`);
  if (popularity && popularity <= 10) tags.add('Popular');

  return Array.from(tags).slice(0, 3);
}

function normaliseBreedCard(breed: BreedLike): HomepageBreedCard {
  const slug = toStringValue(breed.slug);
  const name = toStringValue(breed.name, titleFromSlug(slug));

  return {
    slug,
    href: breedDetailHref(slug),
    name,
    subtitle: getBreedSubtitle(breed),
    imageUrl: hasUsableImage(breed) ? breed.image_url : '',
    imageAlt: `${name} dog`,
    tags: buildBreedTags(breed),
    size: toStringValue(breed.size_category),
    energy: toStringValue(breed.energy_level),
    trainability: toStringValue(breed.training_level),
    popularity: toNumberValue(breed.akc_popularity),
  };
}

function pickCostTeaserBreeds(): HomepageCostBreed[] {
  const limit = 3;
  const withCost = [...breeds].filter(
    (b) => b.ranking_data?.lifetime_cost_usd && hasUsableImage(b) && b.akc_popularity
  ).sort(compareBreedsForHomepage);

  // Prefer size variety: pick one large, one medium, one small if possible
  const selected: BreedLike[] = [];
  for (const size of ['large', 'medium', 'small']) {
    if (selected.length >= limit) break;
    const match = withCost.find((b) => b.size_category === size && !selected.includes(b));
    if (match) selected.push(match);
  }
  for (const b of withCost) {
    if (selected.length >= limit) break;
    if (!selected.includes(b)) selected.push(b);
  }

  return selected.slice(0, limit).map((b) => {
    const slug = toStringValue(b.slug);
    const name = toStringValue(b.name, titleFromSlug(slug));
    return {
      slug,
      href: `/cost-calculator/${slug}`,
      name,
      imageUrl: b.image_url,
      imageAlt: `${name} dog`,
      annualFoodCost: Number(b.ranking_data.annual_food_cost),
      lifetimeCost: Number(b.ranking_data.lifetime_cost_usd),
      size: toStringValue(b.size_category),
    };
  });
}

function normaliseMixedBreedCard(mix: BreedLike): HomepageMixedBreedCard {
  const slug = toStringValue(mix.slug);
  const name = toStringValue(mix.name, titleFromSlug(slug));
  const parent1 = toStringValue(mix.origin_breed_1_name);
  const parent2 = toStringValue(mix.origin_breed_2_name);

  return {
    slug,
    href: mixedBreedDetailHref(slug),
    name,
    imageUrl: hasUsableImage(mix) ? mix.image_url : '',
    imageAlt: `${name} mixed breed dog`,
    parent1,
    parent2,
    size: toStringValue(mix.size_category, 'mixed'),
    energy: toStringValue(mix.energy_level, 'regular'),
    trainability: toStringValue(mix.training_level, 'moderate'),
    isPoodleMix: Boolean(mix.is_poodle_mix),
  };
}

function compareBreedsForHomepage(a: BreedLike, b: BreedLike): number {
  const aPopularity = toNumberValue(a.akc_popularity, 9999) ?? 9999;
  const bPopularity = toNumberValue(b.akc_popularity, 9999) ?? 9999;

  if (aPopularity !== bPopularity) return aPopularity - bPopularity;

  if (hasUsableImage(a) !== hasUsableImage(b)) {
    return hasUsableImage(a) ? -1 : 1;
  }

  return toStringValue(a.name).localeCompare(toStringValue(b.name));
}

function compareMixedBreedsForHomepage(a: BreedLike, b: BreedLike): number {
  const aPoodle = a.is_poodle_mix ? 0 : 1;
  const bPoodle = b.is_poodle_mix ? 0 : 1;

  if (aPoodle !== bPoodle) return aPoodle - bPoodle;

  if (hasUsableImage(a) !== hasUsableImage(b)) {
    return hasUsableImage(a) ? -1 : 1;
  }

  return toStringValue(a.name).localeCompare(toStringValue(b.name));
}

function pickBreedCards(): HomepageBreedCard[] {
  const preferred = [...breeds].sort(compareBreedsForHomepage);
  const limit = config.selection.breedDiscoveryLimit || 6;
  const cards = preferred.slice(0, limit).map(normaliseBreedCard);

  if (cards.length > 0) return cards;

  return toArray(config.breedDiscovery.fallbackBreeds).map((item) => ({
    slug: item.slug,
    href: breedDetailHref(item.slug),
    name: item.name,
    subtitle: item.subtitle || 'Breed guide',
    imageUrl: '',
    imageAlt: `${item.name} dog`,
    tags: toArray(item.tags),
  }));
}

function pickMixedBreedCards(): HomepageMixedBreedCard[] {
  const limit = config.selection.mixedBreedDiscoveryLimit || 8;
  const sorted = [...crossbreeds].sort(compareMixedBreedsForHomepage);

  let selected = sorted.slice(0, limit);

  if (config.selection.preferPoodleMixVariety) {
    const poodleMixes = sorted.filter((item) => item.is_poodle_mix);
    const nonPoodleMixes = sorted.filter((item) => !item.is_poodle_mix);

    const blended = [...poodleMixes.slice(0, Math.ceil(limit / 2)), ...nonPoodleMixes.slice(0, limit)];
    const uniqueBySlug = new Map<string, BreedLike>();

    for (const item of blended) {
      if (!uniqueBySlug.has(item.slug)) uniqueBySlug.set(item.slug, item);
      if (uniqueBySlug.size >= limit) break;
    }

    selected = Array.from(uniqueBySlug.values());
  }

  if (selected.length > 0) {
    return selected.map(normaliseMixedBreedCard);
  }

  return toArray(config.mixedBreedDiscovery.fallbackItems).map((item) => ({
    slug: item.slug,
    href: mixedBreedDetailHref(item.slug),
    name: item.name,
    imageUrl: '',
    imageAlt: `${item.name} mixed breed dog`,
    parent1: item.parent1 || '',
    parent2: item.parent2 || '',
    size: item.size || 'mixed',
    energy: item.energy || 'regular',
    trainability: item.trainability || 'moderate',
    isPoodleMix: Boolean(item.isPoodleMix),
  }));
}

function buildEditorialDescription(post: CollectionEntry<'blog'>): string {
  const data = post.data as AnyRecord;

  const description =
    toStringValue(data.description) ||
    toStringValue(data.excerpt) ||
    toStringValue(data.summary) ||
    stripHtml(toStringValue(data.body));

  return truncate(description || 'Practical dog-parent guidance from PupWiki.', 140);
}

function buildEditorialCategory(post: CollectionEntry<'blog'>): string {
  const data = post.data as AnyRecord;

  if (toStringValue(data.category)) return toStringValue(data.category);
  if (toArray(data.tags).length > 0) return toStringValue(data.tags[0], 'Guide');

  return 'Guide';
}

function buildEditorialImage(post: CollectionEntry<'blog'>): { imageUrl?: string; imageAlt?: string } {
  const data = post.data as AnyRecord;
  const rawImage =
    toStringValue(data.image) ||
    toStringValue(data.heroImage) ||
    toStringValue(data.coverImage) ||
    toStringValue(data.ogImage);

  if (!rawImage) return {};

  return {
    imageUrl: rawImage,
    imageAlt: `${toStringValue(data.title, post.slug)} article image`,
  };
}

function sortPostsNewestFirst(a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>): number {
  const aDate = new Date((a.data as AnyRecord).pubDate || (a.data as AnyRecord).publishedAt || 0).getTime();
  const bDate = new Date((b.data as AnyRecord).pubDate || (b.data as AnyRecord).publishedAt || 0).getTime();

  return bDate - aDate;
}

async function pickEditorialHighlights(): Promise<HomepageEditorialCard[]> {
  try {
    const posts = await getCollection('blog');

    const dynamicItems = [...posts]
      .sort(sortPostsNewestFirst)
      .slice(0, config.selection.editorialLimit || 3)
      .map((post) => {
        const data = post.data as AnyRecord;
        const imageMeta = buildEditorialImage(post);

        return {
          category: buildEditorialCategory(post),
          title: toStringValue(data.title, titleFromSlug(post.slug)),
          description: buildEditorialDescription(post),
          href: `/guides/${post.slug}`,
          publishedAt: toStringValue(data.pubDate || data.publishedAt),
          ...imageMeta,
        } satisfies HomepageEditorialCard;
      });

    if (dynamicItems.length > 0) return dynamicItems;
  } catch {
    // Fall back to curated config items below if the blog collection is unavailable.
  }

  return toArray(config.editorialHighlights.fallbackItems).map((item) => ({
    category: item.category,
    title: item.title,
    description: item.description,
    href: item.href,
    imageUrl: item.imageUrl || undefined,
    imageAlt: item.imageAlt || undefined,
  }));
}

function buildStats() {
  return {
    breedCount: breeds.length,
    mixedBreedCount: crossbreeds.length,
    dogNameCount: Number(config.hero?.stats?.find((item) => item.label?.includes('dog names'))?.value?.replace(/[^\d]/g, '')) || 5000,
  };
}

function buildHeroStats(stats: ReturnType<typeof buildStats>): HomepageHeroStat[] {
  return [
    { value: String(stats.breedCount), label: 'breed guides' },
    { value: String(stats.mixedBreedCount), label: 'mixed breeds' },
    { value: `${stats.dogNameCount.toLocaleString()}+`, label: 'dog names' },
  ];
}

function buildTrustItems(stats: ReturnType<typeof buildStats>): string[] {
  return [
    `${stats.breedCount} breed guides`,
    `${stats.mixedBreedCount} mixed breeds`,
    `${stats.dogNameCount.toLocaleString()}+ dog names`,
    'Cost and care tools',
  ];
}

export async function getHomepageData(): Promise<HomepageData> {
  const stats = buildStats();
  const heroStats = buildHeroStats(stats);
  const trustItems = buildTrustItems(stats);

  const breedCards = pickBreedCards();
  const mixedBreedCards = pickMixedBreedCards();
  const costTeaserBreeds = pickCostTeaserBreeds();
  const editorialItems = await pickEditorialHighlights();

  return {
    seo: config.seo,
    routes: config.routes,
    featureFlags: config.featureFlags,
    selection: config.selection,
    hero: {
      ...config.hero,
      stats: heroStats,
      trustItems,
    },
    primaryJourneys: config.primaryJourneys,
    trustStrip: {
      ...config.trustStrip,
      items: heroStats,
    },
    breedDiscovery: {
      ...config.breedDiscovery,
      breeds: breedCards,
    },
    lifestyleFilters: config.lifestyleFilters,
    quickCostTeaser: {
      ...config.quickCostTeaser,
      breeds: costTeaserBreeds,
    },
    mixedBreedDiscovery: {
      ...config.mixedBreedDiscovery,
      items: mixedBreedCards,
    },
    careDecisionLayer: config.careDecisionLayer,
    editorialHighlights: {
      ...config.editorialHighlights,
      items: editorialItems,
    },
    methodologyTeaser: config.methodologyTeaser,
    leadCapture: config.leadCapture,
    stats,
  };
}

export default getHomepageData;
