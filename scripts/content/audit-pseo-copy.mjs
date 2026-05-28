import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getPseoFamilyFromFilename } from '../lib/pseo-copy-engine.mjs';

const ROOT = process.cwd();
const GUIDES_DIR = resolve(ROOT, 'src/content/guides');
const BREEDS_PATH = resolve(ROOT, 'src/data/master-breeds.json');

const breeds = existsSync(BREEDS_PATH)
  ? JSON.parse(readFileSync(BREEDS_PATH, 'utf8')).sort((a, b) => b.name.length - a.name.length)
  : [];

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const start = text.startsWith('---\r\n') ? 5 : 4;
  const end = text.indexOf('\n---', start);
  if (end === -1) return null;

  const data = {};
  for (const line of text.slice(start, end).split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return data;
}

function normalizeTitle(title) {
  let normalized = String(title || '');
  for (const breed of breeds) {
    normalized = normalized.split(breed.name).join('{Breed}');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

const stats = {};
const descriptions = new Map();

for (const filename of readdirSync(GUIDES_DIR).filter((file) => file.endsWith('.md'))) {
  const match = getPseoFamilyFromFilename(filename);
  if (!match) continue;

  const fm = parseFrontmatter(readFileSync(join(GUIDES_DIR, filename), 'utf8'));
  if (!fm) continue;

  const family = match.familyKey;
  stats[family] ??= {
    pages: 0,
    startsBest: 0,
    missingSeoTitle: 0,
    missingDisplayTitle: 0,
    missingTitlePattern: 0,
    templates: new Map(),
  };

  const group = stats[family];
  group.pages++;
  if (/^Best\b/i.test(fm.seoTitle || fm.title || '')) group.startsBest++;
  if (!fm.seoTitle) group.missingSeoTitle++;
  if (!fm.displayTitle) group.missingDisplayTitle++;
  if (!fm.titlePattern) group.missingTitlePattern++;

  const templateKey = fm.titlePattern || normalizeTitle(fm.seoTitle || fm.title);
  group.templates.set(templateKey, (group.templates.get(templateKey) || 0) + 1);

  const descKey = String(fm.description || '').trim();
  if (descKey) {
    descriptions.set(descKey, (descriptions.get(descKey) || 0) + 1);
  }
}

const report = {};
for (const [family, group] of Object.entries(stats)) {
  const templateEntries = [...group.templates.entries()].sort((a, b) => b[1] - a[1]);
  report[family] = {
    pages: group.pages,
    startsBest: group.startsBest,
    startsBestPct: Number(((group.startsBest / group.pages) * 100).toFixed(1)),
    missingSeoTitle: group.missingSeoTitle,
    missingDisplayTitle: group.missingDisplayTitle,
    missingTitlePattern: group.missingTitlePattern,
    uniqueTitlePatterns: templateEntries.length,
    largestPatternPct: Number(((templateEntries[0]?.[1] || 0) / group.pages * 100).toFixed(1)),
    topPatterns: templateEntries.slice(0, 6).map(([pattern, count]) => ({ pattern, count })),
  };
}

const duplicateDescriptions = [...descriptions.values()].filter((count) => count > 1).length;

console.log(JSON.stringify({
  families: report,
  duplicateDescriptionGroups: duplicateDescriptions,
}, null, 2));

