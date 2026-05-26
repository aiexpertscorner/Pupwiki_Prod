/**
 * getProgramData.ts
 * Merges live AWIN program metadata (awin-programs.json) with
 * editorial config (awin-program-config.json) into a single rich object.
 * Shared by MerchantSpotlight, HomeAwinShowcase, and any future component.
 */

import programsRaw from '../../data/awin-programs.json';
import configRaw from '../../data/awin-program-config.json';

export type EnrichedProgram = {
  key: string;
  name: string;
  description: string;
  logoUrl: string;
  deeplink: string;
  cta: string;
  priority: number;
  epc: number;
  conversionRate: number;
  cookieDays: number;
  commission: string;
  topicTags: string[];
  pageTypes: string[];
  sector: string;
  hasFeed: boolean;
  isFeatured: boolean;
};

const normalize = (s?: string) =>
  (s ?? '').toLowerCase().trim().replace(/[-_\s]+/g, '-');

function formatCommission(range: { type: string; min?: number; max?: number }[]): string {
  if (!Array.isArray(range) || !range.length) return '';
  const pct = range.find((r) => r.type === 'percentage');
  if (!pct) return '';
  const max = Number(pct.max ?? pct.min ?? 0);
  const min = Number(pct.min ?? 0);
  if (max <= 0) return '';
  return min > 0 && min < max ? `${min}–${max}%` : `Up to ${max}%`;
}

function buildProgram(liveProgram: Record<string, unknown>, editorialConfig: Record<string, unknown>): EnrichedProgram {
  const sc = editorialConfig as Record<string, unknown>;
  const lp = liveProgram as Record<string, unknown>;

  const deeplink =
    (sc.deeplink as string) ||
    (lp.configuredDeeplink as string) ||
    (lp.deeplink as string) ||
    '#';

  const kpi = (lp.kpi as Record<string, unknown>) ?? {};
  const epc = Number((sc.epc as number) ?? (kpi.epc as number) ?? 0);
  const conversionRate = Number(
    (sc.conversionRate as number) ?? (kpi.conversionRate as number) ?? 0
  );

  return {
    key: (lp.key as string) || (sc.id as string) || '',
    name: ((sc.label as string) || (lp.name as string) || '').replace(/\s*-\s*The original.*$/i, ''),
    description:
      (sc.description as string) || `${lp.primarySector as string} partner`,
    logoUrl: (lp.logoUrl as string) || '',
    deeplink,
    cta: (sc.cta as string) || `Visit ${((sc.label as string) || (lp.name as string) || '').split(' ')[0]}`,
    priority: Number((sc.priority as number) ?? (lp.priority as number) ?? 50),
    epc,
    conversionRate,
    cookieDays: Number((sc.cookieDays as number) ?? 30),
    commission: formatCommission((lp.commissionRange as { type: string; min?: number; max?: number }[]) ?? []),
    topicTags: ((sc.topicTags as string[]) || (lp.topicTags as string[]) || []) as string[],
    pageTypes: ((sc.pageTypes as string[]) || []) as string[],
    sector: (lp.primarySector as string) || 'Pets & Pet Care',
    hasFeed: Boolean(sc.hasFeed),
    isFeatured: Boolean(deeplink.includes('tidd.ly')),
  };
}

// Build a map from key → editorial config
const scMap: Record<string, Record<string, unknown>> = {};
for (const p of (configRaw as { programs: Record<string, unknown>[] }).programs) {
  scMap[p.id as string] = p;
}

// Joined programs only
const joinedPrograms = (
  (programsRaw as { programs: Record<string, unknown>[] }).programs
).filter((p) => p.relationship === 'joined');

// Merge and sort by priority
const _allPrograms: EnrichedProgram[] = joinedPrograms
  .map((lp) => {
    const key = (lp.key as string) || '';
    const sc = scMap[key] || {};
    return buildProgram(lp, sc);
  })
  .sort((a, b) => b.priority - a.priority);

export function getAllPrograms(): EnrichedProgram[] {
  return _allPrograms;
}

export function getTopPrograms(limit = 8): EnrichedProgram[] {
  return _allPrograms.slice(0, limit);
}

export function getProgramByKey(key: string): EnrichedProgram | null {
  const nk = normalize(key);
  return (
    _allPrograms.find((p) => normalize(p.key) === nk || normalize(p.name) === nk) ?? null
  );
}

export function getProgramByMerchantName(merchantName: string): EnrichedProgram | null {
  const nm = normalize(merchantName);
  return (
    _allPrograms.find((p) => {
      const pName = normalize(p.name);
      return nm.startsWith(pName) || pName.startsWith(nm);
    }) ?? null
  );
}
