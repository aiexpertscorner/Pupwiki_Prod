export type BreedResourceItem = {
  href?: string;
  icon: string;
  label: string;
  description: string;
  badge?: string;
  available?: boolean;
  featured?: boolean;
};

export type BreedPartnerClusterLink = {
  href: string;
  label: string;
  description: string;
  icon: string;
  tags: string[];
};

type BreedLike = {
  name: string;
  slug: string;
  size_category?: string;
  energy_level?: string;
  training_level?: string;
  coat_type?: string;
};

type BreedLinks = Record<string, string | undefined>;
type ContentStatus = Record<string, boolean | undefined>;

function titleCase(value?: string | null) {
  if (!value) return '';
  return String(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildBreedResourceItems(breed: BreedLike, links: BreedLinks = {}, status: ContentStatus = {}): BreedResourceItem[] {
  const base      = `/breeds/${breed.slug}`;
  const costHref  = `/cost-calculator/${breed.slug}`;
  const namesHref = `/dog-names/${breed.slug}`;

  return [
    {
      href: costHref,
      icon: 'calculator',
      label: `${breed.name} cost calculator`,
      description: 'Estimate puppy, annual, food, care and lifetime ownership costs.',
      badge: 'Tool',
      featured: true,
    },
    {
      href: `${base}/food`,
      icon: 'food',
      label: 'Food & nutrition guide',
      description: 'Feeding style, food questions, storage and partner nutrition resources.',
      badge: 'Guide',
      available: true,
      featured: true,
    },
    {
      href: `${base}/training`,
      icon: 'training',
      label: 'Training guide',
      description: 'Owner routines, leash work, enrichment and safety gear context.',
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/health`,
      icon: 'health',
      label: 'Health context',
      description: 'General breed health context and safer veterinary planning questions.',
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/grooming`,
      icon: 'grooming',
      label: 'Grooming guide',
      description: `${titleCase(breed.coat_type) || 'Coat'} care, shedding and owner maintenance planning.`,
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/beds`,
      icon: 'beds',
      label: 'Beds & sleep setup',
      description: 'Size, comfort, crate fit, orthopedic and home setup considerations.',
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/toys`,
      icon: 'toys',
      label: 'Toys & enrichment',
      description: `${titleCase(breed.energy_level) || 'Energy'}-matched play, puzzles and chew planning.`,
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/supplements`,
      icon: 'supplements',
      label: 'Supplements guide',
      description: 'Joint, skin, digestive and breed-specific supplement context.',
      badge: 'Guide',
      available: true,
    },
    {
      href: `${base}/puppy`,
      icon: 'puppy',
      label: 'Puppy essentials',
      description: 'Starter setup, crate, food, training and first-year owner checklist.',
      badge: 'Guide',
      available: true,
    },
    {
      href: '/categories/insurance',
      icon: 'insurance',
      label: 'Insurance planning',
      description: 'Breed risk questions, coverage timing and policy-comparison reminders.',
      badge: 'Service',
    },
    {
      href: namesHref,
      icon: 'names',
      label: `${breed.name} names`,
      description: 'Name ideas, filters and exportable favorites for this breed.',
      badge: 'Tool',
    },
  ];
}

export function buildBreedPartnerClusterLinks(breed: BreedLike): BreedPartnerClusterLink[] {
  const baseTags = [breed.slug, breed.size_category, breed.energy_level, breed.training_level, breed.coat_type].filter(Boolean) as string[];

  return [
    {
      href: '/guides/dog-food-nutrition-partners',
      icon: 'food',
      label: 'Food & nutrition partners',
      description: 'Fresh food, broth, raw/freeze-dried signals and feeding tools from current partner data.',
      tags: [...baseTags, 'food', 'nutrition', 'feeding'],
    },
    {
      href: '/guides/dog-training-gear-safety-partners',
      icon: 'training',
      label: 'Training & safety partners',
      description: 'Harnesses, recall, obedience, containment and active-dog gear clusters.',
      tags: [...baseTags, 'training', 'gear', 'safety'],
    },
    {
      href: '/guides/personalized-dog-gifts-lifestyle-partners',
      icon: 'heart',
      label: 'Gifts & lifestyle partners',
      description: 'Portraits, memorials, ID-style resources and breed-inspired owner gifts.',
      tags: [...baseTags, 'gift', 'lifestyle', 'dog-owner'],
    },
    {
      href: '/guides/dog-beds-comfort-home-partners',
      icon: 'beds',
      label: 'Beds & comfort partners',
      description: 'Beds, crate fit, orthopedic comfort and home setup planning.',
      tags: [...baseTags, 'beds', 'comfort', 'home'],
    },
    {
      href: '/guides/dog-health-wellness-adjacent-partners',
      icon: 'health',
      label: 'Health-adjacent resources',
      description: 'Conservative planning resources for wellness, care and vet-adjacent decisions.',
      tags: [...baseTags, 'health', 'wellness', 'care'],
    },
  ];
}

export function buildBreedDecisionItems(breed: BreedLike, profile: any = {}, rank: any = {}) {
  const difficulty = Number(profile.owner_difficulty || 5);
  const difficultyTone = difficulty <= 3 ? 'good' : difficulty >= 7 ? 'warn' : 'neutral';

  return [
    {
      label: 'Owner difficulty',
      value: `${difficulty}/10`,
      note: difficulty <= 3 ? 'Beginner-friendly with routine.' : difficulty >= 7 ? 'Best for experienced owners.' : 'Works best with preparation.',
      tone: difficultyTone,
    },
    {
      label: 'Energy',
      value: titleCase(breed.energy_level) || 'Moderate',
      note: 'Plan exercise and enrichment before choosing this breed.',
      tone: breed.energy_level === 'active' ? 'warn' : 'neutral',
    },
    {
      label: 'Training profile',
      value: titleCase(breed.training_level) || 'Moderate',
      note: profile.is_working_heritage ? 'Working heritage benefits from structure.' : 'Consistency matters more than intensity.',
      tone: profile.is_working_heritage ? 'accent' : 'neutral',
    },
    {
      label: 'Cost planning',
      value: rank.lifetime_cost_usd ? `$${Math.round(rank.lifetime_cost_usd / 1000)}K+` : 'Plan ahead',
      note: 'Use the calculator for food, care and lifetime estimates.',
      tone: 'accent',
    },
  ];
}
