#!/usr/bin/env node
/**
 * Audit PupWiki content inventory and produce a prioritized PSEO opportunity backlog.
 * Outputs:
 * - src/data/content-inventory-summary.json
 * - src/data/pseo-opportunity-backlog.json
 * - src/data/internal-link-opportunities.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const TODAY = new Date().toISOString();

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
function walk(dir, suffixes = []) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full, suffixes));
    else if (!suffixes.length || suffixes.some((suffix) => item.name.endsWith(suffix))) out.push(full);
  }
  return out;
}
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const raw = text.slice(4, end);
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[match[1]] = value;
  }
  return data;
}
function postSlugFromFile(file) { return path.basename(file, '.md'); }
function loadContentClusters() {
  const file = path.join(ROOT, 'src/lib/content/contentClusterConfig.ts');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const matches = [...text.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((m) => m[1]);
  const fallback = ['puppy', 'senior-dogs', 'dog-food', 'training', 'beds', 'toys', 'pupwiki-partners', 'insurance'];
  return Array.from(new Set(matches.length ? matches : fallback)).filter((slug) => slug !== 'slug');
}
function routeFromPageFile(file) {
  const rel = path.relative(PAGES_DIR, file).replace(/\\/g, '/');
  const route = `/${rel}`.replace(/index\.astro$/, '').replace(/\.astro$/, '').replace(/\[([^\]]+)\]/g, ':$1').replace(/\/$/, '');
  return route || '/';
}

const breeds = readJson('src/data/master-breeds.json', []);
const crossbreeds = readJson('src/data/master-crossbreeds.json', []);
const status = readJson('src/data/content-status.json', {});
const awin = readJson('src/data/awin-programs.json', { programs: [], pendingPrograms: [] });
const amazonSummary = readJson('src/data/amazon-products-summary.json', {});
const partnerSummary = readJson('src/data/pupwiki-partners-summary.json', { partners: [] });
const clusters = loadContentClusters();
const allBreeds = [...breeds, ...crossbreeds];
const blogPosts = walk(BLOG_DIR, ['.md']).map((file) => ({ file, slug: postSlugFromFile(file), data: parseFrontmatter(fs.readFileSync(file, 'utf8')) }));
const astroPages = walk(PAGES_DIR, ['.astro']).map(routeFromPageFile);
const blogSlugs = new Set(blogPosts.map((post) => post.slug));
const pagePaths = new Set(astroPages);

const familyDefinitions = {
  food: { statusKey: 'food_post', slug: (b) => `best-food-for-${b.slug}`, priority: 86, cluster: 'dog-food', money: 92 },
  toys: { statusKey: 'toy_post', slug: (b) => `best-toys-for-${b.slug}`, priority: 74, cluster: 'toys', money: 78 },
  beds: { statusKey: 'bed_post', slug: (b) => `best-bed-for-${b.slug}`, priority: 78, cluster: 'beds', money: 84 },
  grooming: { statusKey: 'grooming_post', slug: (b) => `best-grooming-for-${b.slug}`, priority: 66, cluster: 'grooming', money: 72 },
  health: { statusKey: 'health_post', slug: (b) => `${b.slug}-health-problems`, priority: 72, cluster: 'health', money: 50, sensitive: true },
  supplements: { statusKey: 'supplement_post', slug: (b) => `best-supplements-for-${b.slug}`, priority: 58, cluster: 'supplements', money: 62, sensitive: true },
  training: { statusKey: 'training_post', slug: (b) => `training-a-${b.slug}`, priority: 70, cluster: 'training', money: 76 },
  puppy: { statusKey: 'puppy_post', slug: (b) => `${b.slug}-puppy-essentials`, priority: 92, cluster: 'puppy', money: 94 },
  'senior-dogs': { statusKey: 'senior_post', slug: (b) => `${b.slug}-senior-dog-care`, priority: 84, cluster: 'senior-dogs', money: 82, sensitive: true },
  insurance: { statusKey: 'insurance_post', slug: (b) => `${b.slug}-pet-insurance-planning`, priority: 82, cluster: 'insurance', money: 88, sensitive: true }
};

function breedWeight(breed) {
  const popularity = Number(breed.popularity_rank || breed.akc_rank || breed.rank || 999);
  if (Number.isFinite(popularity) && popularity > 0) return Math.max(0, 110 - Math.min(popularity, 100));
  const name = String(breed.name || '').toLowerCase();
  if (/labrador|golden|french bulldog|german shepherd|poodle|bulldog|beagle|rottweiler|dachshund|corgi/.test(name)) return 90;
  return 45;
}
function awinCoverage(cluster) {
  const programs = (awin.programs || []).filter((program) => {
    const tags = (program.topicTags || []).map(slugify);
    const blob = [program.name, program.primarySector, ...tags].join(' ').toLowerCase();
    return tags.includes(cluster) || blob.includes(cluster.replace(/-/g, ' ')) || blob.includes(cluster);
  });
  return { count: programs.length, programs: programs.map((p) => p.name) };
}
function amazonCoverage(cluster) {
  const groups = amazonSummary.categoryGroups || [];
  const blob = JSON.stringify(groups).toLowerCase();
  const hasValidated = blob.includes(cluster.replace(/-/g, '_')) || blob.includes(cluster.replace(/-/g, ' ')) || blob.includes(cluster);
  const searchFallback = ['puppy', 'senior-dogs', 'dog-food', 'training', 'beds', 'toys'].includes(cluster);
  return { validatedSeedLikely: hasValidated, searchFallback };
}
function familyCoverage(family) {
  const def = familyDefinitions[family];
  let existing = 0, missing = 0;
  for (const breed of allBreeds) {
    const s = status[breed.slug] || {};
    const expectedSlug = def.slug(breed);
    const exists = Boolean(s[def.statusKey]) || blogSlugs.has(expectedSlug);
    if (exists) existing += 1; else missing += 1;
  }
  return { family, existing, missing, total: existing + missing };
}
function opportunityForBreedFamily(breed, family) {
  const def = familyDefinitions[family];
  const expectedSlug = def.slug(breed);
  const s = status[breed.slug] || {};
  const exists = Boolean(s[def.statusKey]) || blogSlugs.has(expectedSlug);
  if (exists) return null;
  const aw = awinCoverage(def.cluster);
  const az = amazonCoverage(def.cluster);
  let score = def.priority + def.money * 0.35 + breedWeight(breed) * 0.45;
  if (aw.count) score += 8;
  if (az.validatedSeedLikely) score += 6;
  if (az.searchFallback) score += 5;
  if (def.sensitive) score -= 8;
  return {
    id: `${breed.slug}:${family}`,
    type: 'breed-family-page',
    priorityScore: Math.round(score),
    cluster: def.cluster,
    family,
    breedSlug: breed.slug,
    breedName: breed.name,
    suggestedSlug: expectedSlug,
    suggestedPath: `/guides/${expectedSlug}`,
    title: `${breed.name} ${titleCase(family)} Guide`,
    reason: `Missing ${family} support page for ${breed.name}.`,
    internalLinkTargets: [`/breeds/${breed.slug}`, `/categories/${def.cluster}`, '/guides'],
    sitemap: { include: true, priority: def.sensitive ? 0.62 : 0.72, changefreq: 'monthly' },
    monetization: { awinPrograms: aw.programs, amazonValidatedSeedLikely: az.validatedSeedLikely, amazonSearchFallback: az.searchFallback, claimSensitivity: def.sensitive ? 'high' : 'medium' }
  };
}

const opportunities = [];
for (const breed of allBreeds) {
  for (const family of Object.keys(familyDefinitions)) {
    const op = opportunityForBreedFamily(breed, family);
    if (op) opportunities.push(op);
  }
}

const clusterOpportunities = clusters.map((cluster) => {
  const route = `/categories/${cluster}`;
  const exists = pagePaths.has(route) || pagePaths.has(`/categories/${cluster}/index`);
  const aw = awinCoverage(cluster);
  const az = amazonCoverage(cluster);
  const score = (exists ? 40 : 82) + (aw.count ? 10 : 0) + (az.searchFallback ? 8 : 0) + (az.validatedSeedLikely ? 5 : 0);
  return { id: `cluster:${cluster}`, type: 'cluster-hub', priorityScore: score, cluster, suggestedPath: route, exists, reason: exists ? `Cluster hub exists; improve internal links, modules and sitemap priority.` : `Missing cluster hub for ${cluster}.`, internalLinkTargets: ['/categories', '/guides', ...(cluster === 'pupwiki-partners' ? ['/disclosure'] : [])], sitemap: { include: true, priority: exists ? 0.85 : 0.7, changefreq: 'weekly' }, monetization: { awinPrograms: aw.programs, amazonValidatedSeedLikely: az.validatedSeedLikely, amazonSearchFallback: az.searchFallback } };
});

const partnerPageOpportunities = (awin.programs || []).map((program) => {
  const slug = `partner-${program.key}`;
  const exists = blogSlugs.has(slug);
  return { id: `partner:${program.key}`, type: 'partner-profile', priorityScore: exists ? 42 : 88, cluster: 'pupwiki-partners', partnerKey: program.key, advertiserId: program.advertiserId, suggestedPath: `/guides/${slug}`, exists, reason: exists ? `${program.name} profile exists; refresh from AWIN data.` : `${program.name} needs a generated partner profile page.`, internalLinkTargets: ['/categories/pupwiki-partners', '/disclosure', `/guides/${slug}`], sitemap: { include: true, priority: 0.58, changefreq: 'monthly' }, monetization: { awinPrograms: [program.name], amazonSearchFallback: false, claimSensitivity: 'low' } };
});

const internalLinks = blogPosts.map((post) => {
  const tags = JSON.stringify(post.data).toLowerCase();
  const category = slugify(post.data.category || '');
  const targets = new Set(['/breeds', '/cost-calculator']);
  if (category) targets.add(`/categories/${category}`);
  if (tags.includes('puppy') || post.slug.includes('puppy')) targets.add('/categories/puppy');
  if (tags.includes('senior') || post.slug.includes('senior')) targets.add('/categories/senior-dogs');
  if (tags.includes('insurance') || post.slug.includes('insurance')) targets.add('/categories/insurance');
  if (post.slug.startsWith('partner-')) targets.add('/categories/pupwiki-partners');
  const breedSlug = post.data.breedSlug || post.data.breed_slug;
  if (breedSlug) targets.add(`/breeds/${breedSlug}`);
  return { sourcePath: `/guides/${post.slug}`, recommendedTargets: Array.from(targets).filter((t) => t !== `/guides/${post.slug}`) };
});

const backlog = [...opportunities, ...clusterOpportunities, ...partnerPageOpportunities].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 1500);
const summary = {
  generatedAt: TODAY,
  totals: { breeds: breeds.length, crossbreeds: crossbreeds.length, blogPosts: blogPosts.length, astroPages: astroPages.length, clusters: clusters.length, awinJoinedPrograms: (awin.programs || []).length, partnerProfilesGenerated: (partnerSummary.partners || []).length, opportunities: backlog.length },
  familyStats: Object.keys(familyDefinitions).map(familyCoverage),
  clusterCoverage: clusterOpportunities,
  sitemapInputs: { staticPageCount: astroPages.length, dynamicBlogCount: blogPosts.length, dynamicBreedCount: allBreeds.length, clusterSlugs: clusters }
};

writeJson('src/data/content-inventory-summary.json', summary);
writeJson('src/data/pseo-opportunity-backlog.json', { generatedAt: TODAY, total: backlog.length, items: backlog });
writeJson('src/data/internal-link-opportunities.json', { generatedAt: TODAY, total: internalLinks.length, items: internalLinks });
console.log(JSON.stringify({ summary: summary.totals, topOpportunities: backlog.slice(0, 20) }, null, 2));
