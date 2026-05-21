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
      { label: 'Estimate Costs',  href: '/cost-calculator' },
      { label: 'Take Breed Quiz', href: '/breed-quiz' },
    ],
  },
  {
    label: 'Learn',
    links: [
      { label: 'Guides',          href: '/guides' },
      { label: 'Food & Nutrition', href: '/categories/dog-food' },
      { label: 'Training',        href: '/categories/training' },
      { label: 'Health',          href: '/categories/health' },
      { label: 'Grooming',        href: '/categories/grooming' },
    ],
  },
  {
    label: 'Tools',
    links: [
      { label: 'Dog Names', href: '/dog-names' },
      { label: 'Reviews',   href: '/reviews' },
      { label: 'FAQ',       href: '/faq' },
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
  label: 'Cost & Insurance',
  href: '/cost-calculator',
} as const;
