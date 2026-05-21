/**
 * src/lib/categories/categoryHelpers.ts
 *
 * Runtime/build-time helpers for category hub pages.
 * These helpers keep the Astro page thin and make the category system reusable.
 */

import {
  CATEGORY_AWIN_TAGS,
  CATEGORY_LINK_BLOCKS,
  CATEGORY_META,
  CATEGORY_TO_LINK_KEY,
  PREFERRED_BREED_SLUGS,
  RELATED_CATEGORIES,
  SPECIAL_RELATED_LINKS,
  type CategoryLink,
  type CategoryMeta,
  type CategorySlug,
} from './categoryConfig';

export type BlogLikeEntry = {
  slug: string;
  data: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    pubDate?: Date | string;
    indexInBlog?: boolean;
    noIndex?: boolean;
    noRoute?: boolean;
    generated?: boolean;
    internalOnly?: boolean;
  };
};

export type BreedLikeRecord = {
  name?: string;
  slug?: string;
  size_category?: string;
  size?: string;
  sizeCategory?: string;
  energy_level?: string;
  energy?: string;
  activity_level?: string;
};

export type CategoryBreedGuide = {
  name: string;
  slug: string;
  href: string;
  size?: string;
  energy?: string;
  type?: 'purebred' | 'mixed';
  label: string;
};

export type AwinTagSet = {
  primary: string[];
  secondary: string[];
};

const SITE = 'https://pupwiki.com';

export function isCategorySlug(value: string): value is CategorySlug {
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, value);
}

export function getCategoryMeta(slug: string): CategoryMeta | null {
  return isCategorySlug(slug) ? CATEGORY_META[slug] : null;
}

export function normalizeCategoryValue(value?: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function titleCase(value?: unknown) {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toDateValue(value: unknown) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function toIsoString(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function isPublicBlogEntry(post: BlogLikeEntry) {
  // Emergency publishing guard: content marked as not for blog/category surfaces
  // must not appear in public hubs. Direct article route applies the same rule.
  if (post.data.indexInBlog === false) return false;
  if (post.data.internalOnly === true) return false;
  if (post.data.noIndex === true) return false;
  return true;
}

export function isRoutableBlogEntry(post: BlogLikeEntry) {
  // Controls static page generation only. Use noRoute:true to suppress a page entirely.
  // indexInBlog:false only hides from feeds/hubs — the page still gets generated.
  if (post.data.noRoute === true) return false;
  if (post.data.internalOnly === true) return false;
  return true;
}

export function getCategoryPosts(posts: BlogLikeEntry[], categorySlug: CategorySlug, meta: CategoryMeta) {
  return posts
    .filter(isPublicBlogEntry)
    .filter((post) => {
      const postCategory = normalizeCategoryValue(post.data.category);
      const tags = Array.isArray(post.data.tags) ? post.data.tags.map(normalizeCategoryValue) : [];

      return postCategory === categorySlug || tags.includes(categorySlug) || tags.includes(meta.theme);
    })
    .sort((a, b) => toDateValue(b.data.pubDate) - toDateValue(a.data.pubDate));
}

export function getCategoryLinks(categorySlug: CategorySlug) {
  return CATEGORY_LINK_BLOCKS[categorySlug] ?? [];
}

export function getRelatedCategoryCards(categorySlug: CategorySlug): CategoryLink[] {
  return (RELATED_CATEGORIES[categorySlug] ?? [])
    .map((slug) => {
      if (SPECIAL_RELATED_LINKS[slug]) return SPECIAL_RELATED_LINKS[slug];

      if (!isCategorySlug(slug)) return null;
      const related = CATEGORY_META[slug];

      return {
        title: related.title,
        desc: related.desc,
        href: `/categories/${slug}`,
        icon: related.emoji,
      };
    })
    .filter(Boolean) as CategoryLink[];
}

export function getAwinTags(categorySlug: CategorySlug, meta: CategoryMeta): AwinTagSet {
  const tags = CATEGORY_AWIN_TAGS[categorySlug] ?? {
    primary: [categorySlug],
    secondary: [meta.theme],
  };

  return {
    primary: uniqueTags([...tags.primary, categorySlug, meta.theme, 'dog', 'dog-owner']),
    secondary: uniqueTags([...tags.secondary, categorySlug, meta.theme, 'dog-parent']),
  };
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();

  return tags
    .map((tag) => normalizeCategoryValue(tag))
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

function normalizedSize(breed: BreedLikeRecord) {
  return titleCase(breed.size_category || breed.size || breed.sizeCategory || '');
}

function normalizedEnergy(breed: BreedLikeRecord) {
  return titleCase(breed.energy_level || breed.energy || breed.activity_level || '');
}

function getPreferredBreedSortIndex(slug?: string) {
  const index = PREFERRED_BREED_SLUGS.indexOf(String(slug || '') as any);
  return index === -1 ? 9999 : index;
}

export function getCategoryBreedGuides({
  categorySlug,
  allBreeds,
  breedLinkMap,
  contentStatus,
  limit = 500,
}: {
  categorySlug: CategorySlug;
  allBreeds: BreedLikeRecord[];
  breedLinkMap: Record<string, Record<string, string> | undefined>;
  contentStatus: Record<string, Record<string, boolean> | undefined>;
  limit?: number;
}): CategoryBreedGuide[] {
  const linkKey = CATEGORY_TO_LINK_KEY[categorySlug];
  const meta = CATEGORY_META[categorySlug];

  const sortedBreeds = [...allBreeds]
    .filter((breed) => breed?.slug && breed?.name)
    .sort((a, b) => {
      const preferred = getPreferredBreedSortIndex(a.slug) - getPreferredBreedSortIndex(b.slug);
      if (preferred !== 0) return preferred;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const eligible = linkKey
    ? sortedBreeds.filter((breed) => Boolean(contentStatus[String(breed.slug)]?.[linkKey]))
    : sortedBreeds;

  return eligible.slice(0, limit).map((breed) => {
    const slug = String(breed.slug);
    const href = linkKey ? breedLinkMap[slug]?.[linkKey] ?? `/breeds/${slug}` : `/breeds/${slug}`;

    return {
      name: String(breed.name),
      slug,
      href,
      size: normalizedSize(breed),
      energy: normalizedEnergy(breed),
      type: (Array.isArray((breed as any).parent_breeds) && (breed as any).parent_breeds.length > 0) ? 'mixed' : 'purebred',
      label: linkKey ? `${meta.shortTitle} guide and owner resources` : 'Breed profile, care needs and owner fit',
    };
  });
}

export function buildBreadcrumbLd(meta: CategoryMeta, categorySlug: string) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: meta.title, item: `${SITE}/categories/${categorySlug}` },
    ],
  });
}

export function buildCollectionPageLd(meta: CategoryMeta, categorySlug: string) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${meta.title} Guides`,
    description: meta.seoDescription,
    url: `${SITE}/categories/${categorySlug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'PupWiki',
      url: SITE,
    },
  });
}

export function buildItemListLd({
  meta,
  breedGuides,
  posts,
}: {
  meta: CategoryMeta;
  breedGuides: CategoryBreedGuide[];
  posts: BlogLikeEntry[];
}) {
  const itemListElement = [
    ...breedGuides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${guide.name} ${meta.shortTitle} Guide`,
      url: `${SITE}${guide.href}`,
    })),
    ...posts.slice(0, 6).map((post, index) => ({
      '@type': 'ListItem',
      position: breedGuides.length + index + 1,
      name: post.data.title,
      url: `${SITE}/guides/${post.slug}`,
    })),
  ];

  if (!itemListElement.length) return null;

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement,
  });
}
