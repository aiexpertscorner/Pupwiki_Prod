/**
 * src/lib/site-config.ts
 * Global site and brand configuration for PupWiki.
 */

export const SITE_URL = 'https://pupwiki.com';
export const SITE_NAME = 'PupWiki';
export const SITE_ORG = 'PupWiki';
export const SITE_AUTHOR = 'The PupWiki Team';
export const SITE_EMAIL = 'hello@pupwiki.com';

export const SITE_LOGO = '/Logo-pupwiki.png';
export const SITE_DEFAULT_OG_IMAGE = '/og-default.jpg';

export const SITE_LANGUAGE = 'en';
export const SITE_LOCALE = 'en_US';
export const SITE_COUNTRY = 'US';

export const SITE_TAGLINE = 'Trusted guidance for dog parents.';

export const SITE_SHORT_DESCRIPTION =
  'Trusted dog breed, care, cost, and training guidance for modern dog parents.';

export const SITE_DESCRIPTION =
  'PupWiki helps dog parents research breeds and mixed breeds, compare dog ownership costs, understand health and care needs, explore training and lifestyle guidance, and discover practical resources for every stage of dog ownership.';

export const SITE_MISSION =
  'To help dog parents make smarter, more confident decisions with clear, practical, and trustworthy guidance.';

export const SITE_AUDIENCE =
  'US dog owners, prospective dog owners, and families researching breeds, care, costs, health, training, and dog-related services.';

export const SITE_POSITIONING =
  'An editorial dog decision-support platform combining breed data, care guidance, cost planning, and practical discovery tools.';

export const AFFILIATE_TAG =
  import.meta.env.PUBLIC_AMAZON_TAG || 'aiexpertscorn-20';

export const ENABLE_CHEWY =
  import.meta.env.PUBLIC_ENABLE_CHEWY === 'true';

export const ENABLE_AMAZON_BUTTONS =
  import.meta.env.PUBLIC_ENABLE_AMAZON_BUTTONS !== 'false';

export const AFFILIATE_DISCLOSURE_SHORT =
  'PupWiki may earn commissions from qualifying purchases or partner referrals. These relationships do not determine our editorial recommendations. As an Amazon Associate, PupWiki may earn from qualifying purchases.';

export const AFFILIATE_DISCLOSURE_LONG =
  'PupWiki may earn commissions from qualifying purchases, affiliate links, Amazon Associate links, or selected partner referrals. Our editorial decisions, comparisons, and recommendations are made independently and are intended to be useful, transparent, and reader-first.';

export const REVIEW_METHOD_SUMMARY =
  'We combine structured breed data, practical product and care research, and editorial review standards to create useful, transparent guidance for dog parents.';

export const CONTACT_PAGE_PATH = '/contact';
export const ABOUT_PAGE_PATH = '/about';
export const METHODOLOGY_PAGE_PATH = '/methodology';
export const DISCLOSURE_PAGE_PATH = '/disclosure';
export const PRIVACY_PAGE_PATH = '/privacy';
export const BREEDS_PAGE_PATH = '/breeds';
export const MIXED_BREEDS_PAGE_PATH = '/mixed-breeds';
export const DOG_NAMES_PAGE_PATH = '/dog-names';
export const COST_CALCULATOR_PAGE_PATH = '/cost-calculator';

export const SEARCH_PATH = '/search';

export const SITE_LOGO_ABSOLUTE = `${SITE_URL}${SITE_LOGO}`;
export const SITE_DEFAULT_OG_IMAGE_ABSOLUTE = `${SITE_URL}${SITE_DEFAULT_OG_IMAGE}`;

export const ORGANIZATION_SAME_AS: string[] = [
  // Add official brand/social URLs here when ready.
];

export const SITE_SOCIALS = {
  pinterest: '',
  x: '',
  instagram: '',
  facebook: '',
  youtube: '',
};

export const SITE_STATS = {
  breedCount: 277,
  mixedBreedCount: 75,
  dogNameCount: 5000,
};

export const SITE_PRIMARY_JOURNEYS = [
  'Find the right breed',
  'Research mixed breeds',
  'Plan dog ownership costs',
  'Understand health and care needs',
  'Explore training and lifestyle guidance',
] as const;

export const SITE_TOPICS = [
  'Dog Breeds',
  'Mixed Breeds',
  'Dog Names',
  'Dog Costs',
  'Dog Health',
  'Dog Training',
  'Dog Nutrition',
  'Dog Grooming',
  'Dog Gear',
  'Dog Services',
] as const;

export const SITE_CONFIG = {
  url: SITE_URL,
  name: SITE_NAME,
  org: SITE_ORG,
  author: SITE_AUTHOR,
  email: SITE_EMAIL,
  logo: SITE_LOGO,
  logoAbsolute: SITE_LOGO_ABSOLUTE,
  defaultOgImage: SITE_DEFAULT_OG_IMAGE,
  defaultOgImageAbsolute: SITE_DEFAULT_OG_IMAGE_ABSOLUTE,
  language: SITE_LANGUAGE,
  locale: SITE_LOCALE,
  country: SITE_COUNTRY,
  tagline: SITE_TAGLINE,
  shortDescription: SITE_SHORT_DESCRIPTION,
  description: SITE_DESCRIPTION,
  mission: SITE_MISSION,
  audience: SITE_AUDIENCE,
  positioning: SITE_POSITIONING,
  affiliateTag: AFFILIATE_TAG,
  affiliateDisclosureShort: AFFILIATE_DISCLOSURE_SHORT,
  affiliateDisclosureLong: AFFILIATE_DISCLOSURE_LONG,
  reviewMethodSummary: REVIEW_METHOD_SUMMARY,
  paths: {
    contact: CONTACT_PAGE_PATH,
    about: ABOUT_PAGE_PATH,
    methodology: METHODOLOGY_PAGE_PATH,
    disclosure: DISCLOSURE_PAGE_PATH,
    privacy: PRIVACY_PAGE_PATH,
    breeds: BREEDS_PAGE_PATH,
    mixedBreeds: MIXED_BREEDS_PAGE_PATH,
    dogNames: DOG_NAMES_PAGE_PATH,
    costCalculator: COST_CALCULATOR_PAGE_PATH,
    search: SEARCH_PATH,
  },
  socials: SITE_SOCIALS,
  sameAs: ORGANIZATION_SAME_AS,
  stats: SITE_STATS,
  journeys: SITE_PRIMARY_JOURNEYS,
  topics: SITE_TOPICS,
} as const;
