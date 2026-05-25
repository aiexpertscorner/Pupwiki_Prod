/**
 * src/lib/faq/breedFaqLoader.ts
 *
 * Server-only FAQ data loading. Uses node:fs.
 * Wraps the existsSync/readFileSync pattern from [breed].astro.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { NormalizedBreed } from '../breeds/normalizeBreed';
import type { BreedDecisionSignals } from '../breeds/breedSignals';
import type { BreedHealthProfile } from '../breeds/breedDataAdapter';

export interface BreedFaqEntry {
  q: string;
  a: string;
}

export interface BreedFaqTopic {
  label: string;
  slug: string;
  faqs: BreedFaqEntry[];
}

export interface BreedFaqData {
  breedSlug: string;
  breedName: string;
  generatedAt?: string;
  topics: Record<string, BreedFaqTopic>;
}

const FAQ_DIR = join(process.cwd(), 'src/data/faq');

export function loadBreedFaq(slug: string): BreedFaqData | null {
  try {
    const path = join(FAQ_DIR, `${slug}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as BreedFaqData;
  } catch {
    return null;
  }
}

export function listAllFaqSlugs(): string[] {
  try {
    return readdirSync(FAQ_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

const TOPIC_PRIORITY = [
  'suitability',
  'behavior',
  'health',
  'cost',
  'grooming',
  'training',
  'exercise',
  'feeding',
] as const;

export function selectBreedFaqItems(
  faqData: BreedFaqData | null,
  breed: NormalizedBreed,
  healthProfile: BreedHealthProfile | null,
  signals: BreedDecisionSignals,
): BreedFaqEntry[] {
  const items: BreedFaqEntry[] = [];

  if (!faqData?.topics) {
    // Fall back to minimal synthetic items if no FAQ data exists
    return buildSyntheticFaqs(breed, healthProfile, signals);
  }

  // Pull from prioritized topics
  for (const topicKey of TOPIC_PRIORITY) {
    const topic = faqData.topics[topicKey];
    if (!topic?.faqs?.length) continue;
    const entry = topic.faqs[0];
    if (entry?.q && entry?.a) {
      items.push({ q: entry.q, a: entry.a });
    }
    if (items.length >= 8) break;
  }

  // Fill remaining slots from secondary topic entries
  if (items.length < 6) {
    for (const topicKey of TOPIC_PRIORITY) {
      const topic = faqData.topics[topicKey];
      if (!topic?.faqs?.length) continue;
      for (const entry of topic.faqs.slice(1, 3)) {
        if (items.length >= 8) break;
        if (entry?.q && entry?.a && !items.some((i) => i.q === entry.q)) {
          items.push({ q: entry.q, a: entry.a });
        }
      }
      if (items.length >= 8) break;
    }
  }

  return items.slice(0, 10);
}

function buildSyntheticFaqs(
  breed: NormalizedBreed,
  healthProfile: BreedHealthProfile | null,
  signals: BreedDecisionSignals,
): BreedFaqEntry[] {
  const name = breed.name;
  const items: BreedFaqEntry[] = [];

  items.push({
    q: `Is the ${name} good for first-time owners?`,
    a: signals.firstTimeOwnerFit === 'strong'
      ? `${name}s can be a manageable choice for first-time owners who invest in consistent training and early socialisation. Individual temperament varies, so research the breed thoroughly before committing.`
      : signals.firstTimeOwnerFit === 'possible'
        ? `${name}s can work for prepared first-time owners, but benefit from consistent training routines and early socialisation. Some prior dog experience is helpful.`
        : `${name}s tend to suit owners with prior dog experience. Their temperament and care needs are best managed by owners who understand breed-specific requirements.`,
  });

  items.push({
    q: `How much exercise does a ${name} need daily?`,
    a: signals.activityLoad === 'high'
      ? `${name}s are an active breed and generally need 60–90 minutes of meaningful daily exercise, plus mental enrichment. Under-stimulation can contribute to problem behaviours.`
      : signals.activityLoad === 'low'
        ? `${name}s have moderate energy and typically do well with 30–45 minutes of daily activity, though they still benefit from regular outdoor time.`
        : `${name}s need regular daily exercise — typically 45–60 minutes — to stay healthy and well-behaved.`,
  });

  if (healthProfile?.common_issues?.length) {
    const issues = healthProfile.common_issues
      .slice(0, 3)
      .map((i: any) => i.name || i)
      .join(', ');
    items.push({
      q: `What health issues are common in ${name}s?`,
      a: `${name}s may be associated with conditions including ${issues}. This is general breed information, not veterinary advice. Regular veterinary check-ups and breed-specific health screening are recommended. Contact a veterinarian for guidance specific to your dog.`,
    });
  }

  items.push({
    q: `How much does it cost to own a ${name}?`,
    a: `Ownership costs for a ${name} vary by location, care choices, and individual health. Use the PupWiki cost calculator for a planning estimate covering food, vet care, grooming, and supplies. Planning estimates only — actual costs vary.`,
  });

  return items;
}
