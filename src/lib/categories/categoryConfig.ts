/**
 * src/lib/categories/categoryConfig.ts
 *
 * Central configuration for PupWiki category hub pages.
 * Keeps src/pages/categories/[category].astro short and avoids giant inline maps.
 */

export type CategoryCta = {
  label: string;
  href: string;
};

export type CategoryMeta = {
  title: string;
  shortTitle: string;
  desc: string;
  emoji: string;
  theme: string;
  updatedLabel: string;
  heroLabel: string;
  seoTitle: string;
  seoDescription: string;
  primaryCta: CategoryCta;
  secondaryCta: CategoryCta;
};

export type CategoryLink = {
  title: string;
  desc: string;
  href: string;
  icon: string;
};

export type CategoryAwinTags = {
  primary: string[];
  secondary: string[];
};

export const CATEGORY_META = {
  'dog-food': {
    title: 'Dog Food',
    shortTitle: 'Food',
    desc: 'Breed-specific dog food guides, feeding resources, nutrition considerations, and owner-friendly product research for smarter feeding decisions.',
    emoji: '🍖',
    theme: 'food',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Nutrition & feeding hub',
    seoTitle: 'Dog Food Guides 2026 — Breed-Specific Feeding & Owner Resources | PupWiki',
    seoDescription:
      'Explore PupWiki dog food guides by breed, nutrition need, life stage and owner intent. Includes breed-specific food guides, feeding resources and affiliate-supported recommendations.',
    primaryCta: { label: 'Browse breed food guides', href: '#breed-guides' },
    secondaryCta: { label: 'Compare breed costs', href: '/cost-calculator' },
  },
  toys: {
    title: 'Toys & Gear',
    shortTitle: 'Toys',
    desc: 'Enrichment ideas, chew toys, puzzles, active-dog gear and breed-specific play resources for different sizes, energy levels and temperaments.',
    emoji: '🎾',
    theme: 'toys',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Enrichment & play hub',
    seoTitle: 'Dog Toy & Gear Guides 2026 — Enrichment, Chew Toys & Breed Resources | PupWiki',
    seoDescription:
      'Find dog toy and gear guides by breed, energy level and enrichment need. Explore PupWiki resources for chew toys, puzzles, active dogs and owner-friendly product research.',
    primaryCta: { label: 'Explore toy guides', href: '#breed-guides' },
    secondaryCta: { label: 'Browse training guides', href: '/categories/training' },
  },
  health: {
    title: 'Dog Health',
    shortTitle: 'Health',
    desc: 'Breed health context, preventive care topics, owner planning resources and product categories such as supplements, insurance and wellness tools.',
    emoji: '🩺',
    theme: 'health',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Breed health resource hub',
    seoTitle: 'Dog Health Guides — Breed Health Risks, Vet Care Planning & Preventive Health | PupWiki',
    seoDescription:
      'Understand dog health by breed. Covers breed-linked conditions, preventive care, vet visit frequency, and practical health planning — from puppy to senior.',
    primaryCta: { label: 'Browse health guides', href: '#breed-guides' },
    secondaryCta: { label: 'Estimate ownership costs', href: '/cost-calculator' },
  },
  training: {
    title: 'Training',
    shortTitle: 'Training',
    desc: 'Breed-specific training guides, walking tools, behavior resources and gear research for dogs with different energy, size and owner-difficulty profiles.',
    emoji: '🦮',
    theme: 'training',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Training & behavior hub',
    seoTitle: 'Dog Training Guides — Breed Trainability, Positive Reinforcement & Walking Gear | PupWiki',
    seoDescription:
      'Find dog training guides by breed temperament and difficulty. Covers positive reinforcement, puppy vs adult training, no-pull gear, and breed-specific behavior resources.',
    primaryCta: { label: 'Browse training guides', href: '#breed-guides' },
    secondaryCta: { label: 'Find a breed match', href: '/tools/breed-match' },
  },
  grooming: {
    title: 'Grooming',
    shortTitle: 'Grooming',
    desc: 'Coat-care guidance, grooming routines, brushes, shampoos and breed-specific grooming resources for short, long, curly, double and high-maintenance coats.',
    emoji: '✂️',
    theme: 'grooming',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Coat care hub',
    seoTitle: 'Dog Grooming Guides — Coat Types, Brushing Schedules & Breed Grooming Needs | PupWiki',
    seoDescription:
      'Find dog grooming guides by breed and coat type. Covers shedding levels, professional grooming frequency, tools by coat type, and DIY vs salon planning.',
    primaryCta: { label: 'Browse grooming guides', href: '#breed-guides' },
    secondaryCta: { label: 'Compare breed coats', href: '/breeds' },
  },
  beds: {
    title: 'Beds & Sleep',
    shortTitle: 'Beds',
    desc: 'Sleep, comfort, orthopedic support and breed-size resources for puppies, senior dogs, large breeds and dogs that need better rest.',
    emoji: '🛏️',
    theme: 'beds',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Comfort & sleep hub',
    seoTitle: 'Dog Bed Guides — Breed Size Fit, Orthopedic Support & Sleep Setup | PupWiki',
    seoDescription:
      'Find the right dog bed by breed size, age, and sleep style. Covers orthopedic foam, washable covers, crate pads, and sizing guidance for every breed.',
    primaryCta: { label: 'Browse bed guides', href: '#breed-guides' },
    secondaryCta: { label: 'View breed sizes', href: '/breeds' },
  },
  supplements: {
    title: 'Supplements',
    shortTitle: 'Supplements',
    desc: 'Joint, probiotic, omega, calming and wellness supplement topics, linked to breed health context and owner planning resources.',
    emoji: '💊',
    theme: 'health',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Supplement research hub',
    seoTitle: 'Dog Supplement Guides 2026 — Joint, Probiotic, Omega & Breed Resources | PupWiki',
    seoDescription:
      'Explore dog supplement guides and breed health resources. Learn about supplement categories, wellness planning and owner-friendly product research.',
    primaryCta: { label: 'Browse supplement guides', href: '#breed-guides' },
    secondaryCta: { label: 'Read health guides', href: '/categories/health' },
  },
  'smart-tech': {
    title: 'Smart Tech',
    shortTitle: 'Smart Tech',
    desc: 'GPS trackers, smart feeders, pet cameras, health collars and connected tools for data-minded dog owners.',
    emoji: '📡',
    theme: 'tech',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Connected pet tech hub',
    seoTitle: 'Smart Dog Tech Guides 2026 — GPS Trackers, Cameras & Connected Gear | PupWiki',
    seoDescription:
      'Explore smart dog tech guides for GPS trackers, pet cameras, smart feeders, connected collars and dog-owner technology resources.',
    primaryCta: { label: 'Explore smart tech', href: '#owner-resources' },
    secondaryCta: { label: 'Browse active breeds', href: '/breeds' },
  },
  travel: {
    title: 'Travel',
    shortTitle: 'Travel',
    desc: 'Dog travel resources for carriers, crates, car protection, portable bowls, road trips and breed-size planning.',
    emoji: '✈️',
    theme: 'travel',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Travel-ready dog hub',
    seoTitle: 'Dog Travel Guides 2026 — Carriers, Crates, Road Trips & Owner Resources | PupWiki',
    seoDescription:
      'Explore dog travel guides for carriers, crates, car gear, road trips and breed-size planning. Find owner-friendly travel resources on PupWiki.',
    primaryCta: { label: 'Explore travel resources', href: '#owner-resources' },
    secondaryCta: { label: 'Browse breeds by size', href: '/breeds' },
  },
  lifestyle: {
    title: 'Lifestyle',
    shortTitle: 'Lifestyle',
    desc: 'Dog-owner lifestyle resources, gifts, home accessories, custom pet ideas and practical products for modern dog families.',
    emoji: '🎨',
    theme: 'lifestyle',
    updatedLabel: 'Updated 2026',
    heroLabel: 'Dog parent lifestyle hub',
    seoTitle: 'Dog Lifestyle & Gear Guides — Harnesses, Walking Gear, Travel & Enrichment | PupWiki',
    seoDescription:
      'Browse lifestyle and gear guides by breed. Covers walking harnesses, no-pull tools, travel planning, daily enrichment routines, and activity-matched gear.',
    primaryCta: { label: 'Explore lifestyle guides', href: '#owner-resources' },
    secondaryCta: { label: 'Browse dog breeds', href: '/breeds' },
  },
} as const satisfies Record<string, CategoryMeta>;

export type CategorySlug = keyof typeof CATEGORY_META;

export const CATEGORY_SLUGS = [
  'dog-food',
  'toys',
  'health',
  'training',
  'grooming',
  'beds',
  'supplements',
  'smart-tech',
  'travel',
  'lifestyle',
] as const satisfies readonly CategorySlug[];

export const CATEGORY_TO_LINK_KEY: Record<CategorySlug, string | null> = {
  'dog-food': 'food_post',
  toys: 'toy_post',
  health: 'health_post',
  training: 'training_post',
  grooming: 'grooming_post',
  beds: 'bed_post',
  supplements: 'supplement_post',
  'smart-tech': null,
  travel: null,
  lifestyle: null,
};

export const CATEGORY_AWIN_TAGS: Record<CategorySlug, CategoryAwinTags> = {
  'dog-food': {
    primary: ['food', 'nutrition', 'fresh-food', 'feeding', 'dog-food'],
    secondary: ['meal-prep', 'healthy-food', 'breed', 'puppy', 'senior-dog'],
  },
  toys: {
    primary: ['toy', 'toys', 'enrichment', 'chew', 'puzzle', 'active'],
    secondary: ['training', 'gear', 'behavior', 'high-energy', 'dog-owner'],
  },
  health: {
    primary: ['health', 'wellness', 'insurance', 'supplements', 'preventive-care'],
    secondary: ['vet', 'breed-health', 'care', 'nutrition', 'senior-dog'],
  },
  training: {
    primary: ['training', 'behavior', 'leash', 'harness', 'walking', 'obedience'],
    secondary: ['active', 'gear', 'puppy-training', 'recall', 'dog-owner'],
  },
  grooming: {
    primary: ['grooming', 'care', 'coat', 'brush', 'shampoo'],
    secondary: ['nail-trim', 'shedding', 'curly-coat', 'long-coat', 'dog-owner'],
  },
  beds: {
    primary: ['bed', 'beds', 'sleep', 'orthopedic', 'comfort'],
    secondary: ['senior-dog', 'large-dog', 'puppy', 'calming', 'home'],
  },
  supplements: {
    primary: ['supplements', 'joint', 'probiotic', 'omega', 'calming'],
    secondary: ['health', 'wellness', 'senior-dog', 'nutrition', 'breed-health'],
  },
  'smart-tech': {
    primary: ['gps', 'tracker', 'camera', 'smart-feeder', 'smart-tech'],
    secondary: ['training', 'active', 'connected', 'monitoring', 'dog-owner'],
  },
  travel: {
    primary: ['travel', 'carrier', 'crate', 'car', 'road-trip'],
    secondary: ['bowl', 'portable', 'gear', 'safety', 'dog-owner'],
  },
  lifestyle: {
    primary: ['gift', 'lifestyle', 'custom-pet', 'portrait', 'dog-owner'],
    secondary: ['home', 'accessory', 'premium', 'personalized', 'family'],
  },
};

export const CATEGORY_LINK_BLOCKS: Record<CategorySlug, CategoryLink[]> = {
  'dog-food': [
    { title: 'Breed food guides', desc: 'Find feeding resources matched to breed size, coat, activity and common owner needs.', href: '#breed-guides', icon: '🍖' },
    { title: 'Dog cost calculator', desc: 'Estimate annual food, care, vet and lifetime ownership costs by breed.', href: '/cost-calculator', icon: '💰' },
    { title: 'Health considerations', desc: 'Connect nutrition planning with common breed health context.', href: '/categories/health', icon: '🩺' },
  ],
  toys: [
    { title: 'Breed toy guides', desc: 'Match enrichment ideas to breed energy, mouth strength and play style.', href: '#breed-guides', icon: '🎾' },
    { title: 'Training resources', desc: 'Pair toys and enrichment with better walking, recall and structure.', href: '/categories/training', icon: '🦮' },
    { title: 'Browse active breeds', desc: 'Explore high-energy breeds that need more mental stimulation.', href: '/breeds', icon: '🐕' },
  ],
  health: [
    { title: 'Breed health guides', desc: 'Browse common breed health considerations and owner planning resources.', href: '#breed-guides', icon: '🩺' },
    { title: 'Insurance estimates', desc: 'Use breed-specific cost calculators to understand insurance and care planning.', href: '/cost-calculator', icon: '🛡️' },
    { title: 'Supplements hub', desc: 'Explore supplement categories linked to wellness and owner research.', href: '/categories/supplements', icon: '💊' },
  ],
  training: [
    { title: 'Breed training guides', desc: 'Find training resources matched to temperament, energy and owner difficulty.', href: '#breed-guides', icon: '🦮' },
    { title: 'Breed match tool', desc: 'Compare your lifestyle with breed traits to find options that may fit.', href: '/tools/breed-match', icon: '🐾' },
    { title: 'Toys & enrichment', desc: 'Support training routines with enrichment and structured play.', href: '/categories/toys', icon: '🎾' },
  ],
  grooming: [
    { title: 'Breed grooming guides', desc: 'Find grooming advice by coat type, shedding level and maintenance needs.', href: '#breed-guides', icon: '✂️' },
    { title: 'Breed profiles', desc: 'Compare coat types, size and grooming needs across breeds.', href: '/breeds', icon: '🐕' },
    { title: 'Cost planning', desc: 'Estimate grooming and lifetime ownership costs by breed.', href: '/cost-calculator', icon: '💰' },
  ],
  beds: [
    { title: 'Breed bed guides', desc: 'Match bed size, support and comfort needs to specific dog breeds.', href: '#breed-guides', icon: '🛏️' },
    { title: 'Large breed planning', desc: 'Explore breed size profiles and care considerations.', href: '/breeds', icon: '📏' },
    { title: 'Senior dog comfort', desc: 'Connect sleep support with health and long-term care planning.', href: '/categories/health', icon: '🩺' },
  ],
  supplements: [
    { title: 'Breed supplement guides', desc: 'Explore supplement topics connected to common breed wellness considerations.', href: '#breed-guides', icon: '💊' },
    { title: 'Health hub', desc: 'Read broader breed health and preventive care resources.', href: '/categories/health', icon: '🩺' },
    { title: 'Cost calculator', desc: 'Plan supplement, food and care costs across a dog’s lifetime.', href: '/cost-calculator', icon: '💰' },
  ],
  'smart-tech': [
    { title: 'Tracking & monitoring', desc: 'Explore technology for active dogs, routines and owner peace of mind.', href: '#owner-resources', icon: '📡' },
    { title: 'Training tools', desc: 'Pair connected gear with structured training and behavior resources.', href: '/categories/training', icon: '🦮' },
    { title: 'Browse active breeds', desc: 'Find breeds that may benefit from more activity tracking and enrichment.', href: '/breeds', icon: '🐕' },
  ],
  travel: [
    { title: 'Travel resources', desc: 'Plan carriers, crates, bowls and road-trip gear around breed size.', href: '#owner-resources', icon: '✈️' },
    { title: 'Breed size profiles', desc: 'Compare size and weight before choosing travel products.', href: '/breeds', icon: '📏' },
    { title: 'Training before travel', desc: 'Build calmer routines before crates, cars and trips.', href: '/categories/training', icon: '🦮' },
  ],
  lifestyle: [
    { title: 'Dog parent gifts', desc: 'Explore custom, personal and home-friendly resources for dog owners.', href: '#owner-resources', icon: '🎁' },
    { title: 'Breed inspiration', desc: 'Browse breed profiles for personality, care needs and owner fit.', href: '/breeds', icon: '🐾' },
    { title: 'Home comfort', desc: 'Explore sleep, bed and home accessory resources.', href: '/categories/beds', icon: '🛏️' },
  ],
};

export const RELATED_CATEGORIES: Record<CategorySlug, string[]> = {
  'dog-food': ['supplements', 'health', 'cost-calculator', 'training'],
  toys: ['training', 'smart-tech', 'travel', 'lifestyle'],
  health: ['supplements', 'dog-food', 'cost-calculator', 'grooming'],
  training: ['toys', 'smart-tech', 'travel', 'dog-food'],
  grooming: ['health', 'supplements', 'beds', 'dog-food'],
  beds: ['health', 'lifestyle', 'travel', 'grooming'],
  supplements: ['health', 'dog-food', 'cost-calculator', 'grooming'],
  'smart-tech': ['training', 'travel', 'toys', 'health'],
  travel: ['training', 'smart-tech', 'beds', 'lifestyle'],
  lifestyle: ['beds', 'travel', 'toys', 'dog-food'],
};

export const SPECIAL_RELATED_LINKS: Record<string, CategoryLink> = {
  'cost-calculator': {
    title: 'Cost Calculator',
    desc: 'Estimate breed-specific food, vet, grooming and lifetime costs.',
    href: '/cost-calculator',
    icon: '💰',
  },
};

export const PREFERRED_BREED_SLUGS = [
  'bulldog',
  'french-bulldog',
  'golden-retriever',
  'labrador-retriever',
  'german-shepherd',
  'beagle',
  'poodle-standard',
  'dachshund',
  'boxer',
  'border-collie',
  'cavalier-king-charles-spaniel',
  'goldendoodle',
] as const;

// ─── Unified cluster config re-exports ───────────────────────────────────────
// New code should import from unifiedClusterConfig directly. These re-exports
// make the unified API available from this module without migrating all callers.

export {
  CLUSTERS,
  DYNAMIC_CATEGORY_SLUGS,
  getCluster,
  getClusterAwinTags,
  getClusterAmazonSearches,
  getRelatedClusters,
  isDynamicCategorySlug,
  type UnifiedCluster,
  type AmazonSearch,
  type ClusterLink,
  type ClusterCta,
  type ClusterType,
} from '../content/unifiedClusterConfig';
