import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const readJson = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(relative(root, full));
  }
  return out;
};

const awinProducts = readJson(`${root}/src/data/awin-products.json`, []);
const affiliateProducts = readJson(`${root}/src/data/affiliate-products.json`, []);
const amazonProducts = readJson(`${root}/src/data/amazon-products.json`, []);
const awinPrograms = readJson(`${root}/src/data/awin-program-config.json`, { programs: [] });

const allFiles = walk(join(root, 'src/pages')).filter((p) => p.endsWith('.astro'));
const staticPages = allFiles.filter((p) => !p.includes('/['));
const dynamicPages = allFiles.filter((p) => p.includes('/['));

const enabledAmazon = amazonProducts.filter((p) => p?.enabled && p?.amazonAffiliateUrl);
const liveAmazon = enabledAmazon.filter((p) => String(p?.liveSearchStatus || '').toLowerCase().includes('validated'));
const withAwinLink = [...awinProducts, ...affiliateProducts].filter((p) => /awin1|tidd\.ly/i.test(p?.url || ''));

const programCoverage = (awinPrograms.programs || []).map((program) => {
  const label = String(program.label || '').toLowerCase();
  const matched = awinProducts.filter((p) => String(p.merchant || '').toLowerCase().includes(label)).length;
  return { program: program.label, priority: program.priority ?? 0, products: matched };
});

const sitemapPath = `${root}/public/sitemap.xml`;
const sitemapStats = existsSync(sitemapPath)
  ? { exists: true, urls: (readFileSync(sitemapPath, 'utf8').match(/<url>/g) || []).length }
  : { exists: false, urls: 0 };

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  pageBuilding: { staticTemplates: staticPages.length, dynamicTemplates: dynamicPages.length },
  seoMapping: {
    sitemap: sitemapStats,
    templateBuckets: {
      breeds: dynamicPages.filter((p) => p.includes('breeds/')).length,
      blog: dynamicPages.filter((p) => p.includes('guides/')).length,
      categories: dynamicPages.filter((p) => p.includes('categories/')).length,
      brands: dynamicPages.filter((p) => p.includes('brands/')).length,
      dogNames: dynamicPages.filter((p) => p.includes('dog-names/')).length,
    }
  },
  monetization: {
    awinProducts: awinProducts.length,
    affiliateFallbackProducts: affiliateProducts.length,
    awinTrackedLinks: withAwinLink.length,
    amazonEnabledProducts: enabledAmazon.length,
    amazonLiveValidatedProducts: liveAmazon.length,
    awinProgramCoverage: programCoverage,
  },
  recommendations: [
    'Increase affiliate product image coverage to improve card CTR.',
    'Add/expand JSON-LD on high-volume dynamic templates (breeds/guides/cost pages).',
    'Prefer merchant-diverse AWIN placements for high-intent pages with Amazon as contextual fallback.'
  ]
}, null, 2));
