/**
 * src/lib/navigation/siteMap.ts
 * Single source of truth for all site navigation.
 * Header, Footer, and mobile menu import from here.
 */

export { SITE_NAV, SITE_FOOTER_GROUPS } from '../site-config';

export const MOBILE_NAV_GROUPS = [
  {
    label: 'Start',
    links: [
      { label: 'Find a Breed',    href: '/breeds' },
      { label: 'Breed Match',     href: '/tools/breed-match' },
      { label: 'First Dog Guide', href: '/guides/first-dog' },
    ],
  },
  {
    label: 'Tools',
    links: [
      { label: 'All Tools',             href: '/tools' },
      { label: 'Breed Match Quiz',      href: '/tools/breed-match' },
      { label: 'Compare Breeds',        href: '/tools/compare' },
      { label: 'Puppy Cost Planner',    href: '/tools/puppy-cost' },
      { label: 'Puppy Supplies',        href: '/tools/puppy-supplies' },
      { label: 'Cost Calculator',       href: '/cost-calculator' },
      { label: 'Dog Names',             href: '/dog-names' },
    ],
  },
  {
    label: 'Learn',
    links: [
      { label: 'Guides',           href: '/guides' },
      { label: 'Food & Nutrition', href: '/categories/dog-food' },
      { label: 'Training',         href: '/categories/training' },
      { label: 'Health',           href: '/categories/health' },
      { label: 'Grooming',         href: '/categories/grooming' },
      { label: 'Reviews',          href: '/reviews' },
      { label: 'FAQ',              href: '/faq' },
    ],
  },
  {
    label: 'Trust',
    links: [
      { label: 'Methodology', href: '/methodology' },
      { label: 'Disclosure',  href: '/disclosure' },
      { label: 'Contact',     href: '/contact' },
    ],
  },
] as const;

export const PRIMARY_CTA = {
  label: 'Find My Breed Match',
  href: '/tools/breed-match',
} as const;
