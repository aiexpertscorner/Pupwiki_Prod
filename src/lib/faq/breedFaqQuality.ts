/**
 * src/lib/faq/breedFaqQuality.ts
 *
 * Validates FAQ answer quality. Used by the data quality audit script.
 */

const BANNED_ABSOLUTE = [
  'always',
  'never',
  'guaranteed',
  'safest',
  'safe for',
  'vet-approved',
  'vet approved',
  'perfect breed',
  'best breed',
];

const MEDICAL_WITHOUT_DISCLAIMER = [
  'diagnos',
  'prescri',
  'treat ',
  'cure ',
  'medication',
];

const DISCLAIMER_TERMS = [
  'veterinarian',
  'vet ',
  'consult',
  'not veterinary advice',
  'not medical advice',
  'planning estimate',
  'varies',
];

export interface FaqQualityIssue {
  field: 'q' | 'a';
  issue: string;
}

export function auditFaqEntry(entry: { q: string; a: string }): FaqQualityIssue[] {
  const issues: FaqQualityIssue[] = [];
  const answer = entry.a.toLowerCase();
  const question = entry.q.toLowerCase();

  if (entry.a.trim().length < 60) {
    issues.push({ field: 'a', issue: `Answer too short (${entry.a.trim().length} chars)` });
  }

  for (const banned of BANNED_ABSOLUTE) {
    if (answer.includes(banned)) {
      issues.push({ field: 'a', issue: `Contains banned term: "${banned}"` });
    }
    if (question.includes(banned)) {
      issues.push({ field: 'q', issue: `Contains banned term: "${banned}"` });
    }
  }

  const hasMedical = MEDICAL_WITHOUT_DISCLAIMER.some((t) => answer.includes(t));
  const hasDisclaimer = DISCLAIMER_TERMS.some((t) => answer.includes(t));
  if (hasMedical && !hasDisclaimer) {
    issues.push({ field: 'a', issue: 'Contains medical/diagnostic language without vet disclaimer' });
  }

  return issues;
}
