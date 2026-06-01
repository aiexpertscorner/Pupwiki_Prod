export const MEDICAL_TAGS = [
 'anaphylaxis', 'shock',
];

const BLOCKED_CLAIM_PATTERNS = [
  /\boverdose\b/i,
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
