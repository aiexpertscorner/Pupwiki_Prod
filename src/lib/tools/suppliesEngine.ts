// src/lib/tools/suppliesEngine.ts
// Personalized puppy supplies checklist generator. Pure functions.

import type { ToolBreed, BudgetMode, HomeType, PuppyChecklistItem, ToolNextAction, PuppyChecklistCategory } from './toolTypes';
import { getSizeCostTier } from './costEngine';

export interface SuppliesChecklistInput {
  breed?: ToolBreed | null;
  budgetMode: BudgetMode;
  homeType: HomeType;
  needsTravelGear: boolean;
  groomingTolerance: 'low' | 'medium' | 'high';
  alreadyOwnedItemIds: string[];
}

export interface SuppliesCategory {
  key: PuppyChecklistCategory;
  label: string;
  description: string;
  items: PuppyChecklistItem[];
}

export interface SuppliesChecklistResult {
  title: string;
  summary: string[];
  categories: SuppliesCategory[];
  sizeNotes: string[];
  safetyNotes: string[];
  shoppingIntentTags: string[];
  nextActions: ToolNextAction[];
}

function item(
  id: string,
  label: string,
  category: PuppyChecklistCategory,
  priority: PuppyChecklistItem['priority'],
  why: string,
  opts: Partial<PuppyChecklistItem> = {}
): PuppyChecklistItem {
  return { id, label, category, priority, why, affiliateEligible: true, ...opts };
}

export function buildPuppySuppliesChecklist(
  input: SuppliesChecklistInput
): SuppliesChecklistResult {
  const { breed, budgetMode, homeType, needsTravelGear, groomingTolerance, alreadyOwnedItemIds } = input;
  const sizeKey = getSizeCostTier(breed);
  const isSmall = sizeKey === 'small';
  const isLargeOrGiant = sizeKey === 'large' || sizeKey === 'giant';
  const coatKey = breed?.coatKey ?? 'unknown';
  const needsGrooming = ['curly', 'long', 'corded', 'double', 'wiry', 'rough', 'wavy', 'silky'].includes(coatKey);
  const isApartment = homeType === 'apartment';
  const isPremium = budgetMode === 'premium';
  const isBudget = budgetMode === 'budget';

  const beforeArrival: PuppyChecklistItem[] = [
    item('crate', isLargeOrGiant ? 'Adjustable crate with divider' : 'Crate or safe sleeping space', 'before-arrival', 'must-have',
      'A crate helps with house training and gives your puppy a safe den.',
      { sizeHint: isLargeOrGiant ? 'Get an adjustable crate so it grows with them.' : undefined, shoppingIntentTag: 'dog-crates' }),
    item('bed', 'Dog bed or crate mat', 'before-arrival', 'must-have',
      'Puppies sleep a lot — a washable bed keeps them comfortable.',
      { budgetHint: isBudget ? 'A simple washable mat works great.' : undefined, shoppingIntentTag: 'dog-beds' }),
    item('bowls', isSmall ? 'Small food and water bowls' : 'Food and water bowls', 'before-arrival', 'must-have',
      'Separate bowls for food and water are a daily essential.',
      { sizeHint: isSmall ? 'Choose shallow bowls sized for a small breed.' : undefined, shoppingIntentTag: 'dog-bowls' }),
    item('collar', isSmall ? 'Lightweight harness' : 'Collar or harness', 'before-arrival', 'must-have',
      'Needed for ID tag and initial walks.',
      { sizeHint: isSmall ? 'A lightweight Y-harness is gentler on small breed necks.' : undefined, shoppingIntentTag: 'dog-harnesses' }),
    item('leash', 'Standard 6-foot leash', 'before-arrival', 'must-have',
      'Start with a non-retractable leash for better control during training.',
      { shoppingIntentTag: 'dog-leashes' }),
    item('id', 'ID tag + microchip plan', 'before-arrival', 'must-have',
      'ID tags and microchips dramatically improve reunion rates if a dog gets lost.',
      { affiliateEligible: false, safetyNote: 'Microchipping is typically done at the first vet visit.' }),
    item('puppyFood', 'Puppy-formulated food', 'before-arrival', 'must-have',
      'Puppies need life-stage appropriate nutrition — not adult formula.',
      { safetyNote: 'Ask your vet or breeder which food to start with.', shoppingIntentTag: 'dog-food' }),
    item('poop', 'Poop bags (bulk)', 'before-arrival', 'must-have',
      'You will go through these quickly.',
      { budgetHint: 'Buying in bulk is the best value here.', shoppingIntentTag: 'dog-cleanup' }),
    item('enzymeClean', 'Enzyme cleaner for accidents', 'before-arrival', 'must-have',
      'Essential for removing odors and discouraging repeat accidents.',
      { safetyNote: 'Standard household cleaners often leave odor traces dogs can still smell.', shoppingIntentTag: 'dog-cleanup' }),
    item('toys', 'Starter toy set (chew + tug + puzzle)', 'before-arrival', 'must-have',
      'Variety keeps puppies mentally and physically stimulated.',
      { shoppingIntentTag: 'dog-toys' }),
  ];

  const firstWeek: PuppyChecklistItem[] = [
    item('treats', 'High-value training treats', 'first-week', 'must-have',
      'Small, soft treats are critical for positive reinforcement in the first weeks.',
      { shoppingIntentTag: 'dog-treats' }),
    item('pupPads', 'Puppy pads', 'first-week', isApartment ? 'recommended' : 'optional',
      isApartment ? 'Useful for apartment training before outdoor access is established.' : 'Optional if you have yard access.',
      { shoppingIntentTag: 'dog-cleanup' }),
    item('foodStorage', 'Airtight food container', 'first-week', 'recommended',
      'Keeps kibble fresh and pest-free.',
      { shoppingIntentTag: 'dog-food' }),
    item('backupLeash', 'Backup leash or longer training line', 'first-week', 'recommended',
      'A long line (15–30 ft) is useful for recall training.',
      { shoppingIntentTag: 'dog-leashes' }),
  ];

  if (needsGrooming) {
    firstWeek.push(
      item('brush', 'Slicker brush and comb', 'first-week', 'must-have',
        `${coatKey === 'curly' ? 'Curly coats need daily detangling' : 'This coat type needs regular brushing'} — start early so your puppy gets used to it.`,
        { shoppingIntentTag: 'dog-grooming' })
    );
  }

  const firstMonth: PuppyChecklistItem[] = [
    item('trainingPouch', 'Training treat pouch', 'first-month', 'recommended',
      'Keeps treats accessible during training sessions.',
      { shoppingIntentTag: 'dog-training' }),
    item('nailTrimmer', 'Nail trimmer or grinder', 'first-month', 'recommended',
      'Regular nail care prevents discomfort and joint issues.',
      { safetyNote: 'Ask your vet to show you the safe trimming zone first.', shoppingIntentTag: 'dog-grooming' }),
    item('shampoo', 'Puppy-safe shampoo', 'first-month', 'recommended',
      'Adult shampoos can irritate puppy skin.',
      { safetyNote: 'Use puppy-specific formula — adult dog or human shampoo is not appropriate.', shoppingIntentTag: 'dog-grooming' }),
    item('dental', 'Dental starter kit (toothbrush + paste)', 'first-month', 'recommended',
      'Starting dental care early builds good habits. Dental disease is one of the most common and preventable dog health issues.',
      { safetyNote: 'Use dog-safe toothpaste only — human toothpaste contains xylitol which is toxic to dogs.', shoppingIntentTag: 'dog-grooming' }),
    item('enrichment', 'Enrichment/puzzle feeders', 'first-month', isLargeOrGiant || breed?.flags.isActive ? 'recommended' : 'optional',
      'Mental stimulation helps prevent boredom and destructive behavior.',
      { shoppingIntentTag: 'dog-toys' }),
  ];

  const later: PuppyChecklistItem[] = [];
  if (needsTravelGear) {
    later.push(
      item('travelCrate', 'Travel crate or car harness', 'later', 'recommended',
        'A crash-tested car harness or airline-approved crate keeps your dog safe during travel.',
        { safetyNote: 'Look for crash-tested car restraints specifically — not all harnesses are equally safe.', shoppingIntentTag: 'dog-travel' }),
      item('portableBowl', 'Portable collapsible water bowl', 'later', 'recommended',
        'Essential for trips, hikes, and outings.',
        { shoppingIntentTag: 'dog-travel' })
    );
  }
  if (isSmall) {
    later.push(
      item('stairs', 'Pet stairs or ramp', 'later', 'optional',
        'Helps small breeds access furniture safely without jumping.',
        { sizeHint: 'Jumping on and off furniture can stress small breed joints over time.', shoppingIntentTag: 'dog-beds' })
    );
  }
  if (isPremium) {
    later.push(
      item('camera', 'Pet camera', 'later', 'optional',
        'Monitor your puppy when you are away.',
        { affiliateEligible: false }),
      item('orthoBed', 'Orthopedic or memory foam bed', 'later', 'optional',
        'Worth the investment for large breeds or longer-term comfort.',
        { shoppingIntentTag: 'dog-beds' })
    );
  }

  const skipUnlessNeeded: PuppyChecklistItem[] = [
    item('supplements', 'Supplements', 'skip-unless-needed', 'conditional',
      'Generally not needed unless recommended by your vet for a specific condition.',
      { safetyNote: 'Do not give supplements without vet guidance — some can interfere with puppy development.', affiliateEligible: false }),
    item('smartDevices', 'Expensive smart devices or GPS trackers', 'skip-unless-needed', 'conditional',
      'Nice to have but not needed immediately — a microchip and ID tag are the essentials.',
      { affiliateEligible: false }),
    item('restrictiveGear', 'Prong collars, choke chains, or shock collars', 'skip-unless-needed', 'conditional',
      'Not appropriate for puppies. Positive reinforcement training is recommended for all dogs.',
      { safetyNote: 'If you are struggling with training, consult a certified professional trainer.', affiliateEligible: false }),
  ];

  // Filter out owned items
  const owned = new Set(alreadyOwnedItemIds);
  const filterOwned = (items: PuppyChecklistItem[]) =>
    items.filter((i) => !owned.has(i.id));

  const sizeNotes: string[] = [];
  if (isLargeOrGiant) {
    sizeNotes.push(
      'Large and giant breeds grow quickly — buy an adjustable crate that can expand.',
      'Durable, heavy-duty chew toys are important for strong chewers.',
      'A strong, well-fitted harness provides better control during leash training.',
    );
  }
  if (isSmall) {
    sizeNotes.push(
      'Small breeds can be more fragile — choose toys and chews sized appropriately.',
      'A lightweight Y-harness is usually gentler than a collar for small necks.',
    );
  }
  if (needsGrooming) {
    sizeNotes.push(
      `This coat type (${coatKey}) benefits from regular brushing — starting early makes grooming easier for both of you.`,
    );
  }

  const safetyNotes = [
    'Never leave a puppy unsupervised with chew toys, especially if pieces could be swallowed.',
    'Do not use human toothpaste — it contains xylitol, which is toxic to dogs.',
    'Only use supplements under veterinary guidance.',
    'A microchip and ID tag together give your dog the best chance of being returned if lost.',
  ];

  const shoppingIntentTags = [
    ...new Set(
      [...beforeArrival, ...firstWeek, ...firstMonth, ...later]
        .filter((i) => i.shoppingIntentTag)
        .map((i) => i.shoppingIntentTag!)
    ),
  ];

  const nextActions: ToolNextAction[] = [
    { label: 'Estimate first-year costs', href: '/tools/puppy-cost', type: 'tool', eventName: 'supplies_to_puppy_cost' },
    { label: 'Find your breed match', href: '/tools/breed-match', type: 'tool', eventName: 'supplies_to_breed_match' },
  ];
  if (breed) {
    nextActions.unshift({
      label: `${breed.name} breed guide`,
      href: `/breeds/${breed.slug}`,
      type: 'breed',
      eventName: 'supplies_to_breed',
    });
    if (breed.flags.hasTrainingGuide) {
      const trainingLink = breed.guideLinks.find((g) => g.key === 'training' && g.available);
      if (trainingLink) {
        nextActions.push({ label: `Training tips for ${breed.name}`, href: trainingLink.href, type: 'guide', eventName: 'supplies_to_training_guide' });
      }
    }
  }

  return {
    title: breed ? `Puppy Supplies Checklist for ${breed.name}` : 'Puppy Supplies Checklist',
    summary: [
      breed
        ? `Personalized supplies list for a ${breed.name} puppy.`
        : 'A practical supplies checklist for any new puppy.',
      'Items are organized by when you need them — before arrival, first week, first month, and later.',
      isBudget ? 'Budget-friendly essentials are prioritized.' : isPremium ? 'Premium options included where relevant.' : '',
    ].filter(Boolean),
    categories: [
      { key: 'before-arrival', label: 'Before arrival', description: 'Have these ready on day one.', items: filterOwned(beforeArrival) },
      { key: 'first-week', label: 'First week', description: 'Pick these up in the first few days.', items: filterOwned(firstWeek) },
      { key: 'first-month', label: 'First month', description: 'Build on the basics as your puppy settles in.', items: filterOwned(firstMonth) },
      { key: 'later', label: 'Later on', description: 'Nice additions once the basics are covered.', items: filterOwned(later) },
      { key: 'skip-unless-needed', label: 'Skip unless specifically needed', description: 'These items are conditional or not recommended without professional guidance.', items: skipUnlessNeeded },
    ],
    sizeNotes,
    safetyNotes,
    shoppingIntentTags,
    nextActions,
  };
}
