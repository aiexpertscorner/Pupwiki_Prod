export const MEDICAL_TAGS = [
  'emergency', 'poisoning', 'symptoms', 'illness', 'injury', 'pain',
  'medication', 'bloat', 'seizure', 'end-of-life', 'vet-emergency',
  'toxic', 'overdose', 'anaphylaxis', 'shock',
];

const BLOCKED_CLAIM_PATTERNS = [
  /\bguaranteed\b/i,
  /\bvet[- ]?approved\b/i,
  /\bscientifically proven\b/i,
  /\bcure[sd]?\b/i,
  /\btreats anxiety\b/i,
  /\bstops aggression\b/i,
  /\bmiracle\b/i,
  /\bclinically proven\b/i,
  /\bfda[- ]?approved\b/i,
];

const normalize = (s: string) => s.toLowerCase().trim();

export function isMedicalContext(topicTags: string[]): boolean {
  const tags = topicTags.map(normalize);
  return MEDICAL_TAGS.some((t) => tags.includes(normalize(t)));
}

export function isSafeOffer(offer: { title: string; description?: string }): boolean {
  const text = `${offer.title} ${offer.description ?? ''}`;
  return !BLOCKED_CLAIM_PATTERNS.some((re) => re.test(text));
}
