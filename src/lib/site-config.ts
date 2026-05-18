/**
 * src/lib/site-config.ts
 * Global site and brand configuration for PupWiki.
 *
 * Brand direction:
 * PupWiki is a warm, editorial dog decision-support platform:
 * breed research, mixed-breed discovery, ownership cost planning,
 * dog name tools, care guidance, training context, and practical resources.
 */

export const SITE_URL = 'https://pupwiki.com';
export const SITE_NAME = 'PupWiki';
export const SITE_ORG = 'PupWiki';
export const SITE_AUTHOR = 'The PupWiki Team';
export const SITE_EMAIL = 'hello@pupwiki.com';

/**
 * Brand assets
 *
 * Recommended with the new media pack:
 * - /assets/brand/svg/logo-primary.svg
 * - /assets/brand/svg/logo-mark.svg
 * - /assets/brand/social/og-default-1200x630.png
 *
 * If the new media pack has not been copied into /public yet,
 * temporarily switch SITE_LOGO back to /Logo-pupwiki.png.
 */
export const SITE_LOGO = '/Logo-pupwiki.png';
export const SITE_LOGO_MARK = '/assets/brand/svg/logo-mark.svg';
export const SITE_LOGO_REVERSE = '/assets/brand/svg/logo-primary-reverse.svg';
export const SITE_FAVICON = '/assets/brand/favicons/favicon.svg';
export const SITE_APP_ICON = '/assets/brand/favicons/apple-touch-icon.png';
export const SITE_DEFAULT_OG_IMAGE = '/assets/brand/social/og-default-1200x630.png';

export const SITE_LANGUAGE = 'en';
export const SITE_LOCALE = 'en_US';
export const SITE_COUNTRY = 'US';

/**
 * Core positioning copy
 * Avoids “dog parents” and keeps the brand broader, cleaner, and more professional.
 */
export const SITE_TAGLINE = 'Clear dog guidance for real-life decisions.';

export const SITE_NAV_TAGLINE = 'Research breeds, compare costs, and care smarter.';

export const SITE_SHORT_DESCRIPTION =
  'Breed research, cost planning, care guides, training help, and dog name tools for people choosing and caring for dogs.';

export const SITE_DESCRIPTION =
  'PupWiki helps people research purebred and mixed-breed dogs, compare ownership costs, understand health and care needs, explore training and lifestyle guidance, find breed-aware dog names, and use practical tools before and after bringing a dog home.';

export const SITE_MISSION =
  'To make dog research and ownership planning clearer, more practical, and easier to trust.';

export const SITE_AUDIENCE =
  'US dog owners, future dog owners, families, and researchers comparing breeds, mixed breeds, costs, care needs, training expectations, names, and practical dog resources.';

export const SITE_POSITIONING =
  'An editorial dog decision-support platform combining breed data, mixed-breed discovery, ownership cost tools, care guidance, dog-name tools, product context, and practical planning resources.';

export const SITE_EDITORIAL_PROMISE =
  'PupWiki aims to provide practical, transparent, and reader-first guidance for breed research, care decisions, cost planning, and everyday dog ownership.';

export const SITE_VALUE_PROPOSITION =
  'Compare dogs, estimate real costs, understand care needs, and move from research to confident decisions.';

export const SITE_HOMEPAGE_EYEBROW =
  'Dog breeds, costs, names and care';

export const SITE_HOMEPAGE_HEADLINE =
  'Dog care, gear & tools. All in one place.';

export const SITE_HOMEPAGE_DESCRIPTION =
  'Explore breeds and mixes, estimate costs, find names, compare care needs, and get practical help with health, training, food, grooming, products, and services.';

export const SITE_SEO_TITLE =
  'PupWiki | Dog Breed Research, Cost Tools, Care Guides & Dog Names';

export const SITE_SEO_DESCRIPTION =
  'Research dog breeds and mixes, compare ownership costs, find dog names, explore care and training guides, and use practical tools for smarter dog decisions.';

/**
 * Affiliate / monetization
 */
export const AFFILIATE_TAG =
  import.meta.env.PUBLIC_AMAZON_TAG || 'aiexpertscorn-20';

export const ENABLE_AMAZON_BUTTONS =
  import.meta.env.PUBLIC_ENABLE_AMAZON_BUTTONS !== 'false';

export const ENABLE_COMMERCE_SECTIONS =
  import.meta.env.PUBLIC_ENABLE_COMMERCE_SECTIONS !== 'false';

export const AFFILIATE_DISCLOSURE_SHORT =
  'PupWiki may earn commissions from qualifying purchases, affiliate links, or selected partner referrals. These relationships do not determine our editorial coverage. As an Amazon Associate, PupWiki may earn from qualifying purchases.';

export const AFFILIATE_DISCLOSURE_LONG =
  'PupWiki may earn commissions from qualifying purchases, Amazon Associate links, affiliate links, or selected partner referrals. Editorial coverage, comparisons, and recommendations are created to be useful, transparent, and reader-first. Affiliate relationships do not guarantee placement, favorable coverage, or a recommendation.';

export const PRODUCT_DISCLOSURE =
  'Product availability, prices, formulas, and service details can change. Always review current product details, policies, and suitability before purchasing.';

export const HEALTH_CONTENT_DISCLAIMER =
  'PupWiki content is for educational and informational purposes only and does not replace professional veterinary, behavioral, legal, or financial advice.';

export const REVIEW_METHOD_SUMMARY =
  'We combine structured breed data, ownership-cost modeling, practical care research, product and service context, and editorial review standards to create useful dog guidance.';

export const CORRECTION_PROMPT =
  'Spotted outdated information? Send us the page URL and the specific detail we should review.';

/**
 * Core paths
 */
export const HOME_PAGE_PATH = '/';
export const CONTACT_PAGE_PATH = '/contact';
export const ABOUT_PAGE_PATH = '/about';
export const METHODOLOGY_PAGE_PATH = '/methodology';
export const DISCLOSURE_PAGE_PATH = '/disclosure';
export const PRIVACY_PAGE_PATH = '/privacy';

export const BREEDS_PAGE_PATH = '/breeds';
export const MIXED_BREEDS_PAGE_PATH = '/breeds#mixed-breeds';
export const DOG_NAMES_PAGE_PATH = '/dog-names';
export const COST_CALCULATOR_PAGE_PATH = '/cost-calculator';
export const BREED_QUIZ_PAGE_PATH = '/breed-quiz';
export const BLOG_PAGE_PATH = '/blog';
export const REVIEWS_PAGE_PATH = '/reviews';
export const GUIDES_PAGE_PATH = '/guides';
export const FAQ_PAGE_PATH = '/faq';
export const SEARCH_PATH = '/search';

/**
 * Category / hub paths
 */
export const HEALTH_PAGE_PATH = '/categories/health';
export const TRAINING_PAGE_PATH = '/categories/training';
export const FOOD_PAGE_PATH = '/categories/food';
export const GROOMING_PAGE_PATH = '/categories/grooming';
export const SUPPLEMENTS_PAGE_PATH = '/categories/supplements';
export const PUPPY_ESSENTIALS_PAGE_PATH = '/categories/puppy-essentials';
export const SENIOR_DOGS_PAGE_PATH = '/categories/senior-dogs';
export const PET_INSURANCE_PAGE_PATH = '/categories/pet-insurance';
export const PRODUCTS_PAGE_PATH = '/categories/products';
export const SERVICES_PAGE_PATH = '/categories/services';

/**
 * Absolute asset URLs
 */
export const SITE_LOGO_ABSOLUTE = `${SITE_URL}${SITE_LOGO}`;
export const SITE_LOGO_MARK_ABSOLUTE = `${SITE_URL}${SITE_LOGO_MARK}`;
export const SITE_DEFAULT_OG_IMAGE_ABSOLUTE = `${SITE_URL}${SITE_DEFAULT_OG_IMAGE}`;
export const SITE_FAVICON_ABSOLUTE = `${SITE_URL}${SITE_FAVICON}`;

/**
 * Social / structured data
 */
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

/**
 * Public site stats
 *
 * Keep both exact-ish values and display labels.
 * dogNameEntryCount is based on the current dog-name page count.
 */
export const SITE_STATS = {
  breedCount: 277,
  mixedBreedCount: 75,
  breedAndMixGuideCount: 352,
  dogNameGuideCount: 277,
  dogNameCount: 6980,
  dogNameEntryCount: 6980,
  nameStyleCount: 5,
  nameInspirationTypeCount: 10,
  stateInsuranceFactorCount: 51,

  labels: {
    breedCount: '277 breed guides',
    mixedBreedCount: '75 mixed-breed guides',
    breedAndMixGuideCount: '352 breed & mix guides',
    dogNameCount: '6,980+ dog name entries',
    careTools: 'Cost and care tools',
  },
} as const;

/**
 * Primary user journeys
 */
export const SITE_PRIMARY_JOURNEYS = [
  'Find the right dog breed',
  'Research mixed breeds',
  'Compare ownership costs',
  'Estimate insurance by breed, age, and state',
  'Find dog name ideas',
  'Understand health and care needs',
  'Explore training expectations',
  'Compare food, grooming, gear, and service resources',
] as const;

/**
 * Core feature areas
 */
export const SITE_FEATURES = [
  {
    label: 'Breed Explorer',
    description:
      'Research purebred and mixed-breed dogs by size, temperament, care needs, grooming, trainability, and owner fit.',
    path: BREEDS_PAGE_PATH,
  },
  {
    label: 'Cost Calculator',
    description:
      'Estimate puppy, annual, monthly, lifetime, and insurance costs by breed, age, and US state.',
    path: COST_CALCULATOR_PAGE_PATH,
  },
  {
    label: 'Dog Name Generator',
    description:
      'Find breed-aware dog name ideas by style, sound, inspiration, and everyday usability.',
    path: DOG_NAMES_PAGE_PATH,
  },
  {
    label: 'Breed Match Quiz',
    description:
      'Answer a few lifestyle questions and get practical breed matches to continue researching.',
    path: BREED_QUIZ_PAGE_PATH,
  },
  {
    label: 'Care Guides',
    description:
      'Explore health, training, food, grooming, puppy, senior dog, and practical care topics.',
    path: HEALTH_PAGE_PATH,
  },
  {
    label: 'Product & Service Context',
    description:
      'Use reader-first product and partner context as a supporting layer within broader dog research.',
    path: BLOG_PAGE_PATH,
  },
] as const;

/**
 * Topic taxonomy
 */
export const SITE_TOPICS = [
  'Dog Breeds',
  'Mixed Breeds',
  'Dog Names',
  'Dog Costs',
  'Dog Insurance',
  'Dog Health',
  'Dog Training',
  'Dog Nutrition',
  'Dog Grooming',
  'Dog Gear',
  'Dog Products',
  'Dog Services',
  'Puppy Essentials',
  'Senior Dogs',
] as const;

/**
 * Navigation model
 */
export const SITE_NAV = {
  primary: [
    { label: 'All Breeds', href: BREEDS_PAGE_PATH },
    { label: 'Dog Names', href: DOG_NAMES_PAGE_PATH },
    { label: 'Guides', href: GUIDES_PAGE_PATH },
    { label: 'Reviews', href: REVIEWS_PAGE_PATH },
    { label: 'FAQ', href: FAQ_PAGE_PATH },
    { label: 'Breed Quiz', href: BREED_QUIZ_PAGE_PATH },
  ],
  utility: [
    { label: 'Methodology', href: METHODOLOGY_PAGE_PATH },
    { label: 'About', href: ABOUT_PAGE_PATH },
    { label: 'Cost & Insurance', href: COST_CALCULATOR_PAGE_PATH },
  ],
  legal: [
    { label: 'Disclosure', href: DISCLOSURE_PAGE_PATH },
    { label: 'Privacy', href: PRIVACY_PAGE_PATH },
    { label: 'Methodology', href: METHODOLOGY_PAGE_PATH },
  ],
} as const;

/**
 * Footer link groups
 */
export const SITE_FOOTER_GROUPS = [
  {
    title: 'Discover',
    links: [
      { label: 'All Breeds', href: BREEDS_PAGE_PATH },
      { label: 'Mixed Breeds', href: MIXED_BREEDS_PAGE_PATH },
      { label: 'Dog Names', href: DOG_NAMES_PAGE_PATH },
      { label: 'Guides', href: GUIDES_PAGE_PATH },
      { label: 'Reviews', href: REVIEWS_PAGE_PATH },
      { label: 'FAQ', href: FAQ_PAGE_PATH },
    ],
  },
  {
    title: 'Care & Planning',
    links: [
      { label: 'Health & Care', href: HEALTH_PAGE_PATH },
      { label: 'Training', href: TRAINING_PAGE_PATH },
      { label: 'Supplements', href: SUPPLEMENTS_PAGE_PATH },
      { label: 'Puppy Essentials', href: PUPPY_ESSENTIALS_PAGE_PATH },
      { label: 'Senior Dogs', href: SENIOR_DOGS_PAGE_PATH },
      { label: 'Pet Insurance', href: PET_INSURANCE_PAGE_PATH },
      { label: 'Cost Calculator', href: COST_CALCULATOR_PAGE_PATH },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: ABOUT_PAGE_PATH },
      { label: 'Methodology', href: METHODOLOGY_PAGE_PATH },
      { label: 'Disclosure', href: DISCLOSURE_PAGE_PATH },
      { label: 'Privacy', href: PRIVACY_PAGE_PATH },
      { label: 'Contact', href: CONTACT_PAGE_PATH },
    ],
  },
] as const;

/**
 * Reusable trust / editorial messaging
 */
export const SITE_TRUST_POINTS = [
  'Structured breed and mixed-breed research',
  'Cost tools for practical planning',
  'Clear affiliate and partner disclosures',
  'Educational content with professional-care disclaimers where relevant',
] as const;

export const SITE_TOOL_CARDS = [
  {
    title: 'Explore dog breeds',
    description: 'Compare traits, size, temperament, grooming, training, and care needs.',
    href: BREEDS_PAGE_PATH,
  },
  {
    title: 'Estimate ownership costs',
    description: 'Plan puppy, annual, monthly, lifetime, and insurance costs by breed.',
    href: COST_CALCULATOR_PAGE_PATH,
  },
  {
    title: 'Find dog name ideas',
    description: 'Generate, save, export, and share breed-aware name ideas locally.',
    href: DOG_NAMES_PAGE_PATH,
  },
  {
    title: 'Take the breed quiz',
    description: 'Answer quick lifestyle questions and get practical breed matches.',
    href: BREED_QUIZ_PAGE_PATH,
  },
] as const;

/**
 * Main config object
 */
export const SITE_CONFIG = {
  url: SITE_URL,
  name: SITE_NAME,
  org: SITE_ORG,
  author: SITE_AUTHOR,
  email: SITE_EMAIL,

  logo: SITE_LOGO,
  logoMark: SITE_LOGO_MARK,
  logoReverse: SITE_LOGO_REVERSE,
  favicon: SITE_FAVICON,
  appIcon: SITE_APP_ICON,
  logoAbsolute: SITE_LOGO_ABSOLUTE,
  logoMarkAbsolute: SITE_LOGO_MARK_ABSOLUTE,
  defaultOgImage: SITE_DEFAULT_OG_IMAGE,
  defaultOgImageAbsolute: SITE_DEFAULT_OG_IMAGE_ABSOLUTE,

  language: SITE_LANGUAGE,
  locale: SITE_LOCALE,
  country: SITE_COUNTRY,

  tagline: SITE_TAGLINE,
  navTagline: SITE_NAV_TAGLINE,
  shortDescription: SITE_SHORT_DESCRIPTION,
  description: SITE_DESCRIPTION,
  seoTitle: SITE_SEO_TITLE,
  seoDescription: SITE_SEO_DESCRIPTION,
  mission: SITE_MISSION,
  audience: SITE_AUDIENCE,
  positioning: SITE_POSITIONING,
  editorialPromise: SITE_EDITORIAL_PROMISE,
  valueProposition: SITE_VALUE_PROPOSITION,
  homepageEyebrow: SITE_HOMEPAGE_EYEBROW,
  homepageHeadline: SITE_HOMEPAGE_HEADLINE,
  homepageDescription: SITE_HOMEPAGE_DESCRIPTION,

  affiliateTag: AFFILIATE_TAG,
  affiliateDisclosureShort: AFFILIATE_DISCLOSURE_SHORT,
  affiliateDisclosureLong: AFFILIATE_DISCLOSURE_LONG,
  productDisclosure: PRODUCT_DISCLOSURE,
  healthContentDisclaimer: HEALTH_CONTENT_DISCLAIMER,
  reviewMethodSummary: REVIEW_METHOD_SUMMARY,
  correctionPrompt: CORRECTION_PROMPT,

  paths: {
    home: HOME_PAGE_PATH,
    contact: CONTACT_PAGE_PATH,
    about: ABOUT_PAGE_PATH,
    methodology: METHODOLOGY_PAGE_PATH,
    disclosure: DISCLOSURE_PAGE_PATH,
    privacy: PRIVACY_PAGE_PATH,
    breeds: BREEDS_PAGE_PATH,
    mixedBreeds: MIXED_BREEDS_PAGE_PATH,
    dogNames: DOG_NAMES_PAGE_PATH,
    costCalculator: COST_CALCULATOR_PAGE_PATH,
    breedQuiz: BREED_QUIZ_PAGE_PATH,
    blog: BLOG_PAGE_PATH,
    reviews: REVIEWS_PAGE_PATH,
    guides: GUIDES_PAGE_PATH,
    faq: FAQ_PAGE_PATH,
    search: SEARCH_PATH,
    health: HEALTH_PAGE_PATH,
    training: TRAINING_PAGE_PATH,
    food: FOOD_PAGE_PATH,
    grooming: GROOMING_PAGE_PATH,
    supplements: SUPPLEMENTS_PAGE_PATH,
    puppyEssentials: PUPPY_ESSENTIALS_PAGE_PATH,
    seniorDogs: SENIOR_DOGS_PAGE_PATH,
    petInsurance: PET_INSURANCE_PAGE_PATH,
    products: PRODUCTS_PAGE_PATH,
    services: SERVICES_PAGE_PATH,
  },

  nav: SITE_NAV,
  footerGroups: SITE_FOOTER_GROUPS,
  socials: SITE_SOCIALS,
  sameAs: ORGANIZATION_SAME_AS,
  stats: SITE_STATS,
  journeys: SITE_PRIMARY_JOURNEYS,
  features: SITE_FEATURES,
  topics: SITE_TOPICS,
  trustPoints: SITE_TRUST_POINTS,
  toolCards: SITE_TOOL_CARDS,
} as const;

export type SiteConfig = typeof SITE_CONFIG;
export type SitePathKey = keyof typeof SITE_CONFIG.paths;
export type SiteFeature = (typeof SITE_FEATURES)[number];
export type SiteTopic = (typeof SITE_TOPICS)[number];