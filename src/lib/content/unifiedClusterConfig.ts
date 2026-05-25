/**
 * src/lib/content/unifiedClusterConfig.ts
 *
 * Single source of truth for all content clusters and category hubs.
 * Merges categoryConfig.ts (UI / category pages) and contentClusterConfig.ts
 * (pSEO / commerce / keyword data) into one record.
 *
 * Both legacy configs re-export from here for backward compatibility.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClusterType = 'lifecycle' | 'product' | 'service' | 'partner' | 'support';
export type ClaimSensitivity = 'low' | 'medium' | 'high';

export interface AmazonSearch {
  id: string;
  query: string;
  label: string;
  intent?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface ClusterLink {
  title: string;
  desc: string;
  href: string;
  icon: string;
}

export interface ClusterCta {
  label: string;
  href: string;
}

export interface UnifiedCluster {
  // Identity
  slug: string;
  type: ClusterType;
  title: string;
  shortTitle: string;
  icon: string;

  // UI display (category pages)
  description: string;
  theme: string;
  heroLabel: string;
  seoTitle: string;
  seoDescription: string;
  updatedLabel: string;
  primaryCta: ClusterCta;
  secondaryCta: ClusterCta;

  // Routing
  categoryPath: string;       // canonical URL for this cluster hub
  clusterKey: string | null;  // key in content-status.json (e.g. 'food_post')
  hasDynamicRoute: boolean;   // true = rendered by /categories/[category].astro

  // Commerce — AWIN
  awinTags: { primary: string[]; secondary: string[] };
  preferredAwinPartners: string[];  // AWIN partner slugs ordered by EPC

  // Commerce — Amazon
  amazonSearches: AmazonSearch[];

  // Content
  primaryKeywords: string[];
  secondaryKeywords: string[];
  claimSensitivity: ClaimSensitivity;
  monetizationAllowed: boolean;
  pseoFamilies: string[];

  // Page modules
  preferredModules: string[];
  relatedClusters: string[];
  linkBlocks: ClusterLink[];
}

// ─── Cluster Definitions ──────────────────────────────────────────────────────

export const CLUSTERS: Record<string, UnifiedCluster> = {

  'dog-food': {
    slug: 'dog-food',
    type: 'product',
    title: 'Dog Food',
    shortTitle: 'Food',
    icon: '🍖',
    description: 'Breed-specific dog food guides, feeding resources, nutrition considerations, and owner-friendly product research for smarter feeding decisions.',
    theme: 'food',
    heroLabel: 'Nutrition & feeding hub',
    seoTitle: 'Dog Food Guides 2026 — Breed-Specific Feeding & Owner Resources | PupWiki',
    seoDescription: 'Explore PupWiki dog food guides by breed, nutrition need, life stage and owner intent. Includes breed-specific food guides, feeding resources and affiliate-supported recommendations.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse breed food guides', href: '#breed-guides' },
    secondaryCta: { label: 'Compare breed costs', href: '/cost-calculator' },
    categoryPath: '/categories/dog-food',
    clusterKey: 'food_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['food', 'nutrition', 'fresh-food', 'feeding', 'dog-food'],
      secondary: ['meal-prep', 'healthy-food', 'breed', 'puppy', 'senior-dog'],
    },
    preferredAwinPartners: ['chef-paw-us', 'raw-wild-llc', 'brutus-broth'],
    amazonSearches: [
      { id: 'dog-food-storage', query: 'airtight dog food storage container', label: 'Food storage', intent: 'medium', tags: ['food', 'storage'] },
      { id: 'slow-feeder', query: 'slow feeder dog bowl', label: 'Slow feeders', intent: 'medium', tags: ['feeding', 'bowls'] },
      { id: 'puppy-food', query: 'puppy food small breed large breed', label: 'Puppy food options', intent: 'high', tags: ['puppy', 'food'] },
      { id: 'senior-food', query: 'senior dog food', label: 'Senior dog food', intent: 'high', tags: ['senior-dog', 'food'] },
    ],
    primaryKeywords: ['dog food', 'best dog food', 'dog nutrition', 'breed-specific dog food'],
    secondaryKeywords: ['puppy food', 'senior dog food', 'fresh dog food', 'sensitive stomach dog food'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    pseoFamilies: ['food', 'dog-food-nutrition-partners'],
    preferredModules: ['health-note', 'awin-partners', 'amazon-searches', 'breed-food-links', 'faq-block'],
    relatedClusters: ['supplements', 'health', 'puppy', 'senior-dogs'],
    linkBlocks: [
      { title: 'Breed food guides', desc: 'Find feeding resources matched to breed size, coat, activity and common owner needs.', href: '#breed-guides', icon: '🍖' },
      { title: 'Dog cost calculator', desc: 'Estimate annual food, care, vet and lifetime ownership costs by breed.', href: '/cost-calculator', icon: '💰' },
      { title: 'Health considerations', desc: 'Connect nutrition planning with common breed health context.', href: '/categories/health', icon: '🩺' },
    ],
  },

  toys: {
    slug: 'toys',
    type: 'product',
    title: 'Toys & Gear',
    shortTitle: 'Toys',
    icon: '🎾',
    description: 'Enrichment ideas, chew toys, puzzles, active-dog gear and breed-specific play resources for different sizes, energy levels and temperaments.',
    theme: 'toys',
    heroLabel: 'Enrichment & play hub',
    seoTitle: 'Dog Toy & Gear Guides 2026 — Enrichment, Chew Toys & Breed Resources | PupWiki',
    seoDescription: 'Find dog toy and gear guides by breed, energy level and enrichment need. Explore PupWiki resources for chew toys, puzzles, active dogs and owner-friendly product research.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Explore toy guides', href: '#breed-guides' },
    secondaryCta: { label: 'Browse training guides', href: '/categories/training' },
    categoryPath: '/categories/toys',
    clusterKey: 'toy_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['toy', 'toys', 'enrichment', 'chew', 'puzzle', 'active'],
      secondary: ['training', 'gear', 'behavior', 'high-energy', 'dog-owner'],
    },
    preferredAwinPartners: ['jugbow'],
    amazonSearches: [
      { id: 'puzzle-toys', query: 'dog puzzle toys enrichment', label: 'Puzzle toys', intent: 'medium', tags: ['toys', 'puzzle'] },
      { id: 'durable-chew', query: 'durable dog chew toys', label: 'Durable chew toys', intent: 'high', tags: ['toys', 'chew'] },
      { id: 'fetch-toys', query: 'dog fetch toys', label: 'Fetch toys', intent: 'medium', tags: ['toys', 'fetch'] },
    ],
    primaryKeywords: ['dog toys', 'best dog toys', 'dog enrichment toys'],
    secondaryKeywords: ['puppy chew toys', 'puzzle toys', 'durable dog toys', 'fetch toys'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: ['toys'],
    preferredModules: ['amazon-searches', 'safety-note', 'breed-energy-links', 'faq-block'],
    relatedClusters: ['training', 'smart-tech', 'travel', 'puppy'],
    linkBlocks: [
      { title: 'Breed toy guides', desc: 'Match enrichment ideas to breed energy, mouth strength and play style.', href: '#breed-guides', icon: '🎾' },
      { title: 'Training resources', desc: 'Pair toys and enrichment with better walking, recall and structure.', href: '/categories/training', icon: '🦮' },
      { title: 'Browse active breeds', desc: 'Explore high-energy breeds that need more mental stimulation.', href: '/breeds', icon: '🐕' },
    ],
  },

  health: {
    slug: 'health',
    type: 'support',
    title: 'Dog Health',
    shortTitle: 'Health',
    icon: '🩺',
    description: 'Breed health context, preventive care topics, owner planning resources and product categories such as supplements, insurance and wellness tools.',
    theme: 'health',
    heroLabel: 'Breed health resource hub',
    seoTitle: 'Dog Health Guides 2026 — Breed Risks, Care Planning & Owner Resources | PupWiki',
    seoDescription: 'Explore dog health guides by breed, care topic and owner intent. Includes breed health context, wellness resources, insurance planning and general educational information.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse health guides', href: '#breed-guides' },
    secondaryCta: { label: 'Estimate ownership costs', href: '/cost-calculator' },
    categoryPath: '/categories/health',
    clusterKey: 'health_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['health', 'wellness', 'insurance', 'supplements', 'preventive-care'],
      secondary: ['vet', 'breed-health', 'care', 'nutrition', 'senior-dog'],
    },
    preferredAwinPartners: [],
    amazonSearches: [
      { id: 'dog-first-aid', query: 'dog first aid kit', label: 'First aid basics', intent: 'medium', tags: ['first-aid', 'health'] },
      { id: 'dog-dental-care', query: 'dog dental care kit', label: 'Dental care basics', intent: 'medium', tags: ['dental-care', 'health'] },
      { id: 'dog-wellness-supplies', query: 'dog wellness supplies', label: 'Wellness supplies', intent: 'low', tags: ['wellness'] },
    ],
    primaryKeywords: ['dog health', 'dog health problems', 'breed health', 'preventive dog care'],
    secondaryKeywords: ['vet care', 'preventive dog care', 'dog symptoms', 'breed health risks'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    pseoFamilies: ['health'],
    preferredModules: ['vet-note', 'care-checklist', 'insurance-timing', 'safe-product-searches', 'faq-block'],
    relatedClusters: ['supplements', 'dog-food', 'insurance', 'senior-dogs'],
    linkBlocks: [
      { title: 'Breed health guides', desc: 'Browse common breed health considerations and owner planning resources.', href: '#breed-guides', icon: '🩺' },
      { title: 'Insurance estimates', desc: 'Use breed-specific cost calculators to understand insurance and care planning.', href: '/cost-calculator', icon: '🛡️' },
      { title: 'Supplements hub', desc: 'Explore supplement categories linked to wellness and owner research.', href: '/categories/supplements', icon: '💊' },
    ],
  },

  training: {
    slug: 'training',
    type: 'product',
    title: 'Training',
    shortTitle: 'Training',
    icon: '🦮',
    description: 'Breed-specific training guides, walking tools, behavior resources and gear research for dogs with different energy, size and owner-difficulty profiles.',
    theme: 'training',
    heroLabel: 'Training & behavior hub',
    seoTitle: 'Dog Training Guides 2026 — Breed-Specific Training, Walking Gear & Behavior | PupWiki',
    seoDescription: 'Explore PupWiki dog training guides by breed and behavior need. Find training resources, walking gear ideas, breed-specific advice and owner planning tools.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse training guides', href: '#breed-guides' },
    secondaryCta: { label: 'Find a breed match', href: '/tools/breed-match' },
    categoryPath: '/categories/training',
    clusterKey: 'training_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['training', 'behavior', 'leash', 'harness', 'walking', 'obedience'],
      secondary: ['active', 'gear', 'puppy-training', 'recall', 'dog-owner'],
    },
    preferredAwinPartners: ['jugbow'],
    amazonSearches: [
      { id: 'training-treats', query: 'dog training treats', label: 'Training treats', intent: 'medium', tags: ['training', 'treats'] },
      { id: 'no-pull-harness', query: 'no pull dog harness', label: 'No-pull harnesses', intent: 'high', tags: ['harness', 'leash'] },
      { id: 'long-leash-recall', query: 'long leash for dog recall training', label: 'Recall training leads', intent: 'medium', tags: ['recall', 'leash'] },
      { id: 'crate-training', query: 'dog crate training essentials', label: 'Crate training essentials', intent: 'medium', tags: ['crate-training'] },
    ],
    primaryKeywords: ['dog training', 'dog training gear', 'puppy training', 'breed-specific training'],
    secondaryKeywords: ['leash training', 'recall training', 'dog harness', 'training treats', 'crate training'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: ['training'],
    preferredModules: ['amazon-searches', 'awin-partners', 'training-plan', 'faq-block'],
    relatedClusters: ['toys', 'smart-tech', 'travel', 'puppy'],
    linkBlocks: [
      { title: 'Breed training guides', desc: 'Find training resources matched to temperament, energy and owner difficulty.', href: '#breed-guides', icon: '🦮' },
      { title: 'Breed match tool', desc: 'Compare your lifestyle with breed traits to find options that may fit.', href: '/tools/breed-match', icon: '🐾' },
      { title: 'Toys & enrichment', desc: 'Support training routines with enrichment and structured play.', href: '/categories/toys', icon: '🎾' },
    ],
  },

  grooming: {
    slug: 'grooming',
    type: 'product',
    title: 'Grooming',
    shortTitle: 'Grooming',
    icon: '✂️',
    description: 'Coat-care guidance, grooming routines, brushes, shampoos and breed-specific grooming resources for short, long, curly, double and high-maintenance coats.',
    theme: 'grooming',
    heroLabel: 'Coat care hub',
    seoTitle: 'Dog Grooming Guides 2026 — Breed Coat Care, Tools & Owner Resources | PupWiki',
    seoDescription: 'Browse dog grooming guides by breed and coat type. Find owner-friendly resources for brushes, shampoos, coat care routines and grooming cost planning.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse grooming guides', href: '#breed-guides' },
    secondaryCta: { label: 'Compare breed coats', href: '/breeds' },
    categoryPath: '/categories/grooming',
    clusterKey: 'grooming_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['grooming', 'coat-care', 'shampoo', 'brush', 'nail-care'],
      secondary: ['nail-trim', 'shedding', 'curly-coat', 'long-coat', 'dog-owner'],
    },
    preferredAwinPartners: ['jugbow'],
    amazonSearches: [
      { id: 'dog-brush', query: 'dog brush for shedding coat', label: 'Brushes and combs', intent: 'high', tags: ['brush', 'coat-care'] },
      { id: 'dog-shampoo', query: 'gentle dog shampoo', label: 'Gentle shampoo', intent: 'medium', tags: ['shampoo', 'grooming'] },
      { id: 'dog-nail-tools', query: 'dog nail grinder clippers', label: 'Nail tools', intent: 'medium', tags: ['nail-care'] },
    ],
    primaryKeywords: ['dog grooming', 'dog brushes', 'dog shampoo', 'breed grooming guide'],
    secondaryKeywords: ['coat care', 'nail trimming', 'shedding tools', 'sensitive skin shampoo'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: ['grooming'],
    preferredModules: ['coat-checklist', 'amazon-searches', 'brand-guides', 'faq-block'],
    relatedClusters: ['health', 'supplements', 'beds', 'dog-food'],
    linkBlocks: [
      { title: 'Breed grooming guides', desc: 'Find grooming advice by coat type, shedding level and maintenance needs.', href: '#breed-guides', icon: '✂️' },
      { title: 'Breed profiles', desc: 'Compare coat types, size and grooming needs across breeds.', href: '/breeds', icon: '🐕' },
      { title: 'Cost planning', desc: 'Estimate grooming and lifetime ownership costs by breed.', href: '/cost-calculator', icon: '💰' },
    ],
  },

  beds: {
    slug: 'beds',
    type: 'product',
    title: 'Beds & Sleep',
    shortTitle: 'Beds',
    icon: '🛏️',
    description: 'Sleep, comfort, orthopedic support and breed-size resources for puppies, senior dogs, large breeds and dogs that need better rest.',
    theme: 'beds',
    heroLabel: 'Comfort & sleep hub',
    seoTitle: 'Dog Bed Guides 2026 — Breed Size, Sleep Comfort & Owner Resources | PupWiki',
    seoDescription: 'Explore dog bed and sleep guides by breed size, comfort need and life stage. Find PupWiki resources for orthopedic beds, calming beds and owner planning.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse bed guides', href: '#breed-guides' },
    secondaryCta: { label: 'View breed sizes', href: '/breeds' },
    categoryPath: '/categories/beds',
    clusterKey: 'bed_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['bed', 'beds', 'sleep', 'orthopedic', 'comfort'],
      secondary: ['senior-dog', 'large-dog', 'puppy', 'calming', 'home'],
    },
    preferredAwinPartners: [],
    amazonSearches: [
      { id: 'orthopedic-bed', query: 'orthopedic dog bed washable cover', label: 'Orthopedic beds', intent: 'high', tags: ['beds', 'orthopedic'] },
      { id: 'crate-bed', query: 'washable dog crate bed', label: 'Crate beds', intent: 'medium', tags: ['beds', 'crate'] },
      { id: 'cooling-bed', query: 'cooling dog bed', label: 'Cooling beds', intent: 'medium', tags: ['beds', 'cooling'] },
    ],
    primaryKeywords: ['dog beds', 'best dog beds', 'orthopedic dog bed', 'breed dog bed'],
    secondaryKeywords: ['senior dog bed', 'washable dog bed', 'crate bed', 'cooling dog bed'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: ['beds'],
    preferredModules: ['amazon-searches', 'awin-partners', 'size-guide', 'faq-block'],
    relatedClusters: ['health', 'lifestyle', 'travel', 'senior-dogs'],
    linkBlocks: [
      { title: 'Breed bed guides', desc: 'Match bed size, support and comfort needs to specific dog breeds.', href: '#breed-guides', icon: '🛏️' },
      { title: 'Large breed planning', desc: 'Explore breed size profiles and care considerations.', href: '/breeds', icon: '📏' },
      { title: 'Senior dog comfort', desc: 'Connect sleep support with health and long-term care planning.', href: '/categories/health', icon: '🩺' },
    ],
  },

  supplements: {
    slug: 'supplements',
    type: 'product',
    title: 'Supplements',
    shortTitle: 'Supplements',
    icon: '💊',
    description: 'Joint, probiotic, omega, calming and wellness supplement topics, linked to breed health context and owner planning resources.',
    theme: 'health',
    heroLabel: 'Supplement research hub',
    seoTitle: 'Dog Supplement Guides 2026 — Joint, Probiotic, Omega & Breed Resources | PupWiki',
    seoDescription: 'Explore dog supplement guides and breed health resources. Learn about supplement categories, wellness planning and owner-friendly product research.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse supplement guides', href: '#breed-guides' },
    secondaryCta: { label: 'Read health guides', href: '/categories/health' },
    categoryPath: '/categories/supplements',
    clusterKey: 'supplement_post',
    hasDynamicRoute: true,
    awinTags: {
      primary: ['supplements', 'joint', 'probiotic', 'omega', 'calming'],
      secondary: ['health', 'wellness', 'senior-dog', 'nutrition', 'breed-health'],
    },
    preferredAwinPartners: [],
    amazonSearches: [
      { id: 'joint-supplements', query: 'dog joint supplement', label: 'Joint support options', intent: 'high', tags: ['joint', 'supplements'] },
      { id: 'dog-probiotics', query: 'dog probiotic supplement', label: 'Gut support options', intent: 'medium', tags: ['gut-health', 'supplements'] },
      { id: 'skin-coat-supplements', query: 'dog skin and coat supplement', label: 'Skin and coat support', intent: 'medium', tags: ['skin', 'coat'] },
    ],
    primaryKeywords: ['dog supplements', 'joint supplements for dogs', 'dog probiotics'],
    secondaryKeywords: ['skin supplements', 'senior dog supplements', 'supplement safety', 'vet questions'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    pseoFamilies: ['supplements'],
    preferredModules: ['vet-note', 'ingredient-checklist', 'amazon-searches', 'faq-block'],
    relatedClusters: ['health', 'dog-food', 'senior-dogs'],
    linkBlocks: [
      { title: 'Breed supplement guides', desc: 'Explore supplement topics connected to common breed wellness considerations.', href: '#breed-guides', icon: '💊' },
      { title: 'Health hub', desc: 'Read broader breed health and preventive care resources.', href: '/categories/health', icon: '🩺' },
      { title: 'Cost calculator', desc: 'Plan supplement, food and care costs across a dog\'s lifetime.', href: '/cost-calculator', icon: '💰' },
    ],
  },

  'smart-tech': {
    slug: 'smart-tech',
    type: 'product',
    title: 'Smart Tech',
    shortTitle: 'Smart Tech',
    icon: '📡',
    description: 'GPS trackers, smart feeders, pet cameras, health collars and connected tools for data-minded dog owners.',
    theme: 'tech',
    heroLabel: 'Connected pet tech hub',
    seoTitle: 'Smart Dog Tech Guides 2026 — GPS Trackers, Cameras & Connected Gear | PupWiki',
    seoDescription: 'Explore smart dog tech guides for GPS trackers, pet cameras, smart feeders, connected collars and dog-owner technology resources.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Explore smart tech', href: '#owner-resources' },
    secondaryCta: { label: 'Browse active breeds', href: '/breeds' },
    categoryPath: '/categories/smart-tech',
    clusterKey: null,
    hasDynamicRoute: true,
    awinTags: {
      primary: ['gps', 'tracker', 'camera', 'smart-feeder', 'smart-tech'],
      secondary: ['training', 'active', 'connected', 'monitoring', 'dog-owner'],
    },
    preferredAwinPartners: [],
    amazonSearches: [
      { id: 'gps-tracker', query: 'dog gps tracker collar', label: 'GPS trackers', intent: 'high', tags: ['gps', 'smart-tech'] },
      { id: 'pet-camera', query: 'pet camera dog monitor', label: 'Pet cameras', intent: 'medium', tags: ['camera', 'smart-tech'] },
      { id: 'smart-feeder', query: 'automatic dog feeder smart', label: 'Smart feeders', intent: 'medium', tags: ['smart-feeder', 'feeding'] },
    ],
    primaryKeywords: ['dog gps tracker', 'pet camera', 'smart dog feeder', 'connected dog gear'],
    secondaryKeywords: ['dog activity tracker', 'pet monitor', 'smart collar', 'connected pet tech'],
    claimSensitivity: 'low',
    monetizationAllowed: true,
    pseoFamilies: [],
    preferredModules: ['amazon-searches', 'brand-guides', 'faq-block'],
    relatedClusters: ['training', 'travel', 'toys', 'health'],
    linkBlocks: [
      { title: 'Tracking & monitoring', desc: 'Explore technology for active dogs, routines and owner peace of mind.', href: '#owner-resources', icon: '📡' },
      { title: 'Training tools', desc: 'Pair connected gear with structured training and behavior resources.', href: '/categories/training', icon: '🦮' },
      { title: 'Browse active breeds', desc: 'Find breeds that may benefit from more activity tracking and enrichment.', href: '/breeds', icon: '🐕' },
    ],
  },

  travel: {
    slug: 'travel',
    type: 'product',
    title: 'Travel',
    shortTitle: 'Travel',
    icon: '✈️',
    description: 'Dog travel resources for carriers, crates, car protection, portable bowls, road trips and breed-size planning.',
    theme: 'travel',
    heroLabel: 'Travel-ready dog hub',
    seoTitle: 'Dog Travel Guides 2026 — Carriers, Crates, Road Trips & Owner Resources | PupWiki',
    seoDescription: 'Explore dog travel guides for carriers, crates, car gear, road trips and breed-size planning. Find owner-friendly travel resources on PupWiki.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Explore travel resources', href: '#owner-resources' },
    secondaryCta: { label: 'Browse breeds by size', href: '/breeds' },
    categoryPath: '/categories/travel',
    clusterKey: null,
    hasDynamicRoute: true,
    awinTags: {
      primary: ['travel', 'carrier', 'crate', 'car', 'road-trip'],
      secondary: ['bowl', 'portable', 'gear', 'safety', 'dog-owner'],
    },
    preferredAwinPartners: [],
    amazonSearches: [
      { id: 'dog-car-cover', query: 'dog car seat cover', label: 'Car seat covers', intent: 'high', tags: ['car', 'travel'] },
      { id: 'dog-carrier', query: 'dog travel carrier', label: 'Travel carriers', intent: 'high', tags: ['carrier', 'travel'] },
      { id: 'travel-bowls', query: 'collapsible dog travel bowl', label: 'Travel bowls', intent: 'medium', tags: ['travel', 'feeding'] },
    ],
    primaryKeywords: ['dog travel', 'dog car seat cover', 'dog carrier', 'dog travel supplies'],
    secondaryKeywords: ['dog travel supplies', 'dog harness', 'travel crate', 'dog walking gear'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: [],
    preferredModules: ['safety-note', 'amazon-searches', 'size-guide', 'faq-block'],
    relatedClusters: ['training', 'beds', 'lifestyle', 'smart-tech'],
    linkBlocks: [
      { title: 'Travel resources', desc: 'Plan carriers, crates, bowls and road-trip gear around breed size.', href: '#owner-resources', icon: '✈️' },
      { title: 'Breed size profiles', desc: 'Compare size and weight before choosing travel products.', href: '/breeds', icon: '📏' },
      { title: 'Training before travel', desc: 'Build calmer routines before crates, cars and trips.', href: '/categories/training', icon: '🦮' },
    ],
  },

  lifestyle: {
    slug: 'lifestyle',
    type: 'product',
    title: 'Lifestyle',
    shortTitle: 'Lifestyle',
    icon: '🎨',
    description: 'Dog-owner lifestyle resources, gifts, home accessories, custom pet ideas and practical products for modern dog families.',
    theme: 'lifestyle',
    heroLabel: 'Dog parent lifestyle hub',
    seoTitle: 'Dog Lifestyle Guides 2026 — Gifts, Home Accessories & Owner Resources | PupWiki',
    seoDescription: 'Explore PupWiki dog lifestyle guides for gifts, home accessories, custom pet ideas and owner-friendly resources for modern dog families.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Explore lifestyle guides', href: '#owner-resources' },
    secondaryCta: { label: 'Browse dog breeds', href: '/breeds' },
    categoryPath: '/categories/lifestyle',
    clusterKey: null,
    hasDynamicRoute: true,
    awinTags: {
      primary: ['gift', 'lifestyle', 'portrait', 'id', 'accessories'],
      secondary: ['home', 'accessory', 'premium', 'personalized', 'family'],
    },
    preferredAwinPartners: ['crown-paw'],
    amazonSearches: [
      { id: 'personalized-dog-gifts', query: 'personalized dog gifts', label: 'Personalized gifts', intent: 'medium', tags: ['gift', 'personalized'] },
      { id: 'dog-id-tags', query: 'personalized dog id tag', label: 'Dog ID tags', intent: 'high', tags: ['id', 'safety'] },
      { id: 'dog-owner-gifts', query: 'dog owner gifts', label: 'Dog owner gifts', intent: 'low', tags: ['gift'] },
    ],
    primaryKeywords: ['dog gifts', 'personalized dog gifts', 'dog owner gifts', 'dog accessories'],
    secondaryKeywords: ['custom dog portrait', 'dog id tag', 'dog accessories', 'dog memorial gifts'],
    claimSensitivity: 'low',
    monetizationAllowed: true,
    pseoFamilies: ['lifestyle'],
    preferredModules: ['gift-guide', 'brand-guides', 'amazon-searches', 'faq-block'],
    relatedClusters: ['travel', 'beds', 'toys', 'pupwiki-partners'],
    linkBlocks: [
      { title: 'Dog parent gifts', desc: 'Explore custom, personal and home-friendly resources for dog owners.', href: '#owner-resources', icon: '🎁' },
      { title: 'Breed inspiration', desc: 'Browse breed profiles for personality, care needs and owner fit.', href: '/breeds', icon: '🐾' },
      { title: 'Home comfort', desc: 'Explore sleep, bed and home accessory resources.', href: '/categories/beds', icon: '🛏️' },
    ],
  },

  // ── Non-dynamic-route clusters (static pages / special routes) ────────────

  puppy: {
    slug: 'puppy',
    type: 'lifecycle',
    title: 'Puppy Essentials',
    shortTitle: 'Puppy',
    icon: '🐶',
    description: 'Starter guides, training setup, food, crates, cleanup, toys and first-year dog-owner planning.',
    theme: 'puppy',
    heroLabel: 'New puppy planning hub',
    seoTitle: 'Puppy Essentials 2026 — First-Year Care, Training & Supplies | PupWiki',
    seoDescription: 'Find puppy care guides, first-year planning resources and breed-specific starter kits. PupWiki covers puppy food, crate training, toys and new owner checklists.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Puppy care guides', href: '#guides' },
    secondaryCta: { label: 'Browse breeds', href: '/breeds' },
    categoryPath: '/categories/puppy',
    clusterKey: null,
    hasDynamicRoute: false,
    awinTags: {
      primary: ['puppy', 'training', 'food', 'nutrition', 'gear', 'crate-training'],
      secondary: ['home-setup', 'cleanup', 'puppy-food', 'first-year'],
    },
    preferredAwinPartners: ['chef-paw-us'],
    amazonSearches: [
      { id: 'puppy-starter-kit', query: 'puppy starter kit essentials', label: 'Puppy starter kit', intent: 'high', tags: ['puppy', 'home-setup'] },
      { id: 'puppy-crate-training', query: 'puppy crate training essentials', label: 'Crate training essentials', intent: 'high', tags: ['puppy', 'crate-training'] },
      { id: 'puppy-cleanup', query: 'puppy potty training cleanup supplies', label: 'Potty training cleanup', intent: 'medium', tags: ['puppy', 'cleanup'] },
      { id: 'puppy-chew-toys', query: 'safe puppy chew toys', label: 'Puppy chew toys', intent: 'medium', tags: ['puppy', 'toys'] },
    ],
    primaryKeywords: ['puppy essentials', 'puppy starter kit', 'new puppy checklist', 'puppy supplies'],
    secondaryKeywords: ['crate training', 'house training', 'puppy food', 'puppy toys', 'puppy gates'],
    claimSensitivity: 'medium',
    monetizationAllowed: true,
    pseoFamilies: ['puppy', 'training', 'food', 'toys'],
    preferredModules: ['amazon-searches', 'awin-partners', 'breed-links', 'checklist', 'faq-block'],
    relatedClusters: ['training', 'dog-food', 'toys', 'insurance'],
    linkBlocks: [
      { title: 'Puppy training', desc: 'Early training, crate setup and recall resources for new dog owners.', href: '/categories/training', icon: '🦮' },
      { title: 'Puppy food guides', desc: 'Nutrition and feeding resources matched to breed size and life stage.', href: '/categories/dog-food', icon: '🍖' },
      { title: 'Cost calculator', desc: 'Estimate first-year and lifetime costs for any breed.', href: '/cost-calculator', icon: '💰' },
    ],
  },

  'senior-dogs': {
    slug: 'senior-dogs',
    type: 'lifecycle',
    title: 'Senior Dog Care',
    shortTitle: 'Senior Dogs',
    icon: '🐕‍🦺',
    description: 'Comfort, orthopedic beds, food questions, mobility, vet planning and safer buying guidance for older dogs.',
    theme: 'senior',
    heroLabel: 'Senior dog care hub',
    seoTitle: 'Senior Dog Care 2026 — Comfort, Health Planning & Owner Resources | PupWiki',
    seoDescription: 'Explore senior dog care guides covering orthopedic beds, nutrition, mobility aids, vet planning and breed-specific aging resources for older dogs.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Senior dog guides', href: '#guides' },
    secondaryCta: { label: 'Cost calculator', href: '/cost-calculator' },
    categoryPath: '/categories/senior-dogs',
    clusterKey: null,
    hasDynamicRoute: false,
    awinTags: {
      primary: ['senior-dog', 'beds', 'health', 'nutrition', 'food', 'care'],
      secondary: ['wellness', 'orthopedic', 'mobility', 'joint', 'comfort'],
    },
    preferredAwinPartners: ['raw-wild-llc'],
    amazonSearches: [
      { id: 'senior-orthopedic-bed', query: 'orthopedic dog bed for senior dogs', label: 'Orthopedic dog beds', intent: 'high', tags: ['senior-dog', 'beds'] },
      { id: 'senior-ramps', query: 'dog ramp for senior dogs', label: 'Ramps and mobility aids', intent: 'medium', tags: ['senior-dog', 'mobility'] },
      { id: 'senior-dog-bowls', query: 'raised dog bowls for senior dogs', label: 'Raised bowls', intent: 'medium', tags: ['senior-dog', 'feeding'] },
      { id: 'senior-comfort', query: 'senior dog comfort supplies', label: 'Senior comfort supplies', intent: 'medium', tags: ['senior-dog', 'comfort'] },
    ],
    primaryKeywords: ['senior dog care', 'senior dog products', 'older dog comfort', 'senior dog supplies'],
    secondaryKeywords: ['orthopedic dog beds', 'joint support', 'senior dog food', 'mobility support'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    pseoFamilies: ['senior-dogs', 'beds', 'health', 'supplements'],
    preferredModules: ['health-note', 'amazon-searches', 'awin-partners', 'vet-questions', 'faq-block'],
    relatedClusters: ['beds', 'health', 'supplements', 'dog-food', 'insurance'],
    linkBlocks: [
      { title: 'Senior bed guides', desc: 'Orthopedic and comfort resources matched to older dog needs.', href: '/categories/beds', icon: '🛏️' },
      { title: 'Senior health guides', desc: 'Preventive care planning and breed health context for aging dogs.', href: '/categories/health', icon: '🩺' },
      { title: 'Cost calculator', desc: 'Estimate senior care, vet and lifetime ownership costs.', href: '/cost-calculator', icon: '💰' },
    ],
  },

  insurance: {
    slug: 'insurance',
    type: 'service',
    title: 'Pet Insurance',
    shortTitle: 'Insurance',
    icon: '🛡️',
    description: 'Insurance timing, breed risk planning, vet cost questions and policy-comparison reminders.',
    theme: 'insurance',
    heroLabel: 'Pet insurance planning hub',
    seoTitle: 'Pet Insurance Guides 2026 — Breed Risk Planning, Costs & Owner Advice | PupWiki',
    seoDescription: 'Explore pet insurance guides by breed, health risk and owner intent. PupWiki covers insurance timing, cost planning, policy questions and breed-specific vet cost data.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Insurance guides', href: '#guides' },
    secondaryCta: { label: 'Cost calculator', href: '/cost-calculator' },
    categoryPath: '/pet-insurance',
    clusterKey: null,
    hasDynamicRoute: false,
    awinTags: {
      primary: ['insurance', 'health', 'vet-care', 'puppy', 'senior-dog'],
      secondary: ['cost', 'planning', 'breed-health', 'accident-illness'],
    },
    preferredAwinPartners: [],
    amazonSearches: [],
    primaryKeywords: ['pet insurance', 'dog insurance', 'puppy insurance', 'breed health insurance'],
    secondaryKeywords: ['breed health risks', 'vet costs', 'accident illness coverage', 'senior dog insurance'],
    claimSensitivity: 'high',
    monetizationAllowed: true,
    pseoFamilies: ['insurance'],
    preferredModules: ['service-partners', 'vet-questions', 'cost-calculator', 'faq-block'],
    relatedClusters: ['health', 'puppy', 'senior-dogs', 'dog-food'],
    linkBlocks: [
      { title: 'Pet insurance planning', desc: 'Compare coverage options and understand breed-specific health costs.', href: '/pet-insurance', icon: '🛡️' },
      { title: 'Cost calculator', desc: 'Estimate breed-specific insurance and vet care costs.', href: '/cost-calculator', icon: '💰' },
      { title: 'Health guides', desc: 'Connect insurance planning with breed health context.', href: '/categories/health', icon: '🩺' },
    ],
  },

  'pupwiki-partners': {
    slug: 'pupwiki-partners',
    type: 'partner',
    title: 'PupWiki Partners',
    shortTitle: 'Brand Guides',
    icon: '🤝',
    description: 'Dog-focused brand and service guides for owners comparing care resources, supplies, services and everyday routines.',
    theme: 'partners',
    heroLabel: 'Partner brand guides',
    seoTitle: 'PupWiki Partner Guides — Dog Brand & Service Comparisons | PupWiki',
    seoDescription: 'Browse PupWiki partner brand and service guides. Compare dog food brands, gear companies, health services and care products for informed owner decisions.',
    updatedLabel: 'Updated 2026',
    primaryCta: { label: 'Browse partner guides', href: '#guides' },
    secondaryCta: { label: 'Browse breeds', href: '/breeds' },
    categoryPath: '/categories/pupwiki-partners',
    clusterKey: null,
    hasDynamicRoute: false,
    awinTags: {
      primary: ['brand-guide', 'dog-care', 'service', 'product'],
      secondary: ['partner', 'comparison', 'dog-owner'],
    },
    preferredAwinPartners: ['chef-paw-us', 'raw-wild-llc', 'crown-paw', 'jugbow'],
    amazonSearches: [],
    primaryKeywords: ['dog brand guides', 'dog service guides', 'dog owner resources'],
    secondaryKeywords: ['dog food brands', 'dog gear brands', 'dog care services'],
    claimSensitivity: 'low',
    monetizationAllowed: true,
    pseoFamilies: ['partners'],
    preferredModules: ['brand-directory', 'service-directory', 'brand-guides', 'reader-support-note'],
    relatedClusters: ['dog-food', 'training', 'beds', 'health', 'insurance'],
    linkBlocks: [
      { title: 'Partner brands', desc: 'Explore our vetted partner brands and service providers.', href: '/categories/pupwiki-partners', icon: '🤝' },
      { title: 'Breed profiles', desc: 'Match partner products to your breed\'s specific needs.', href: '/breeds', icon: '🐕' },
      { title: 'Disclosure', desc: 'How PupWiki earns from reader-supported links.', href: '/disclosure', icon: '📋' },
    ],
  },
};

// ─── Derived arrays / lookup helpers ─────────────────────────────────────────

/** All cluster slugs */
export const CLUSTER_SLUGS = Object.keys(CLUSTERS) as (keyof typeof CLUSTERS)[];

/** Slugs for /categories/[category] dynamic route only */
export const DYNAMIC_CATEGORY_SLUGS = CLUSTER_SLUGS.filter(
  (s) => CLUSTERS[s].hasDynamicRoute
) as string[];

/** Global preferred breed slugs used across category breed guides */
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

export function getCluster(slug?: string | null): UnifiedCluster | null {
  if (!slug) return null;
  return CLUSTERS[String(slug).toLowerCase()] ?? null;
}

export function isDynamicCategorySlug(value: string): boolean {
  return Boolean(CLUSTERS[value]?.hasDynamicRoute);
}

export function getClusterAmazonSearches(slug?: string | null): AmazonSearch[] {
  return getCluster(slug)?.amazonSearches ?? [];
}

export function getClusterAwinTags(slug?: string | null): { primary: string[]; secondary: string[] } {
  return getCluster(slug)?.awinTags ?? { primary: [], secondary: [] };
}

export function getRelatedClusters(slug?: string | null): UnifiedCluster[] {
  const cluster = getCluster(slug);
  if (!cluster) return [];
  return cluster.relatedClusters
    .map((s) => CLUSTERS[s])
    .filter(Boolean) as UnifiedCluster[];
}
