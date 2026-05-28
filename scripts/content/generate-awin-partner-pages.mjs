#!/usr/bin/env node
/**
 * Generate one user-facing PupWiki brand guide per joined + active partner.
 *
 * These pages must read like public brand/product guides for dog owners.
 * Never expose backend terminology, tracking mechanics, network names, programme
 * KPIs, feed metadata, internal placement rules, or generator notes in rendered copy.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  normalizeMonetizationIntent,
  normalizePostType,
  normalizeReviewMethod,
  sanitizePublicDogCopy,
} from '../lib/public-content-contract.mjs';

const ROOT = process.cwd();
const DATA_DIR = resolve(ROOT, 'src/data');
const BLOG_DIR = resolve(ROOT, 'src/content/blog');
const PROGRAMS_PATH = join(DATA_DIR, 'awin-programs.json');
const PRODUCTS_PATH = join(DATA_DIR, 'awin-products.json');
const BANNERS_PATH = join(DATA_DIR, 'affiliate-banners.json');
const SUMMARY_PATH = join(DATA_DIR, 'pupwiki-partners-summary.json');
const TODAY = new Date().toISOString().slice(0, 10);
const APPLY = process.argv.includes('--apply') || !process.argv.includes('--check');

function log(message) { console.log(`[generate-brand-guides] ${message}`); }
function warn(message) { console.warn(`[generate-brand-guides] WARN ${message}`); }
function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function quote(value) { return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function yamlList(values) {
  return `[${Array.from(new Set(values.filter(Boolean))).map((value) => quote(value)).join(', ')}]`;
}
function cleanDomain(program) {
  const domain = program.validDomains?.[0]?.domain || program.displayUrl || '';
  return String(domain).replace(/^https?:\/\//, '').replace(/^\*\./, '').replace(/\/$/, '');
}
function productRows(program, products) {
  return products
    .filter((product) => String(product.advertiserId || '') === String(program.advertiserId || '') || String(product.programId || '') === String(program.key || ''))
    .slice(0, 8);
}
function bannerRows(program, bannerRegistry) {
  const banners = Array.isArray(bannerRegistry) ? bannerRegistry : bannerRegistry?.banners || [];
  return banners
    .filter((banner) => String(banner.advertiserId || '') === String(program.advertiserId || '') || String(banner.programKey || '') === String(program.key || ''))
    .slice(0, 6);
}
function inferPartnerCluster(program) {
  const blob = [program.name, program.primarySector, ...(program.topicTags || [])].join(' ').toLowerCase();
  if (/broth|food|nutrition|fresh|raw|feeding|meal/.test(blob)) {
    return {
      slug: 'dog-food',
      label: 'Food & nutrition',
      icon: 'ðŸ–',
      audience: 'current and future dog owners comparing food, toppers, feeding support, and nutrition-focused services',
      buyerUse: 'feeding routines, meal variety, picky eaters, hydration support, and everyday nutrition planning',
      caution: 'For medical diets, allergies, pancreatitis, kidney disease, or other health concerns, ask your veterinarian before changing food or toppers.',
    };
  }
  if (/training|leash|harness|collar|fence|obedience|gear|recall/.test(blob)) {
    return {
      slug: 'training',
      label: 'Training & gear',
      icon: 'ðŸ¦®',
      audience: 'current and future dog owners looking for training support, walking gear, containment, or safer everyday routines',
      buyerUse: 'leash manners, recall practice, home setup, activity planning, and practical training sessions',
      caution: 'Training tools work best with patient, reward-based routines. For aggression, fear, or serious behavior concerns, work with a qualified professional.',
    };
  }
  if (/gift|portrait|memorial|license|lifestyle|apparel|accessor/.test(blob)) {
    return {
      slug: 'lifestyle',
      label: 'Lifestyle & gifts',
      icon: 'ðŸŽ',
      audience: 'dog lovers looking for personalized gifts, keepsakes, identification items, or owner-focused products',
      buyerUse: 'gift ideas, memorial pieces, custom portraits, everyday accessories, and dog-parent lifestyle products',
      caution: 'Check personalization details, production time, return policies, and shipping windows before ordering.',
    };
  }
  if (/bed|sleep|comfort|home|orthopedic/.test(blob)) {
    return {
      slug: 'beds',
      label: 'Beds & comfort',
      icon: 'ðŸ›ï¸',
      audience: 'current and future dog owners comparing beds, comfort products, home setup, washable covers, and senior-friendly sleep options',
      buyerUse: 'sleep comfort, crate setup, washable home products, joint-friendly rest, and dog-room planning',
      caution: 'Measure your dog and compare size charts carefully. For pain, stiffness, or mobility changes, ask your veterinarian.',
    };
  }
  if (/health|insurance|vet|wellness|supplement|care/.test(blob)) {
    return {
      slug: 'health',
      label: 'Health & wellness',
      icon: 'ðŸ©º',
      audience: 'current and future dog owners researching wellness, care planning, vet-adjacent services, or long-term ownership costs',
      buyerUse: 'care planning, wellness routines, cost planning, and questions to discuss with your veterinarian',
      caution: 'This page is informational only and does not replace veterinary advice, diagnosis, treatment, legal advice, or financial advice.',
    };
  }
  return {
    slug: 'pupwiki-partners',
    label: 'Dog owner resources',
    icon: 'ðŸ¾',
    audience: 'current and future dog owners comparing practical products or services for everyday dog care',
    buyerUse: 'researching options, comparing fit, and finding useful dog-owner resources',
    caution: 'Check the brand site for current terms, availability, shipping, returns, and product details.',
  };
}
function buildProductList(products, safeName, deeplink) {
  if (!products.length) {
    return [
      `- Visit ${safeName} to review current products, bundles, offers, shipping options, and availability.`,
      `- Compare product details on the brand site before buying, especially size, ingredients, materials, subscription terms, and return policy.`,
    ].join('\n');
  }

  return products.map((product) => {
    const name = product.name || `${safeName} product`;
    const category = product.category || product.categoryLabel || 'Dog product';
    const desc = product.description ? ` â€” ${String(product.description).replace(/\s+/g, ' ').trim().slice(0, 145)}${String(product.description).length > 145 ? 'â€¦' : ''}` : '';
    const url = product.url || deeplink;
    return `- **${name}** (${category})${desc}${url ? ` â€” [review on ${safeName}](${url})` : ''}`;
  }).join('\n');
}
function buildIntro(program, safeName, cluster) {
  const description = String(program.description || '').replace(/\s+/g, ' ').trim();
  if (description && description.length > 40) {
    return `${safeName} is a ${cluster.label.toLowerCase()} brand that may be useful for ${cluster.audience}. ${description.slice(0, 260)}${description.length > 260 ? 'â€¦' : ''}`;
  }
  return `${safeName} is a ${cluster.label.toLowerCase()} resource for ${cluster.audience}. This guide explains what the brand offers, when it may be worth considering, and what to check before you buy or book.`;
}
function buildMarkdown(program, products, banners) {
  const cluster = inferPartnerCluster(program);
  const pageSlug = `partner-${program.key}`;
  const tags = Array.from(new Set(['brand-guide', cluster.slug, ...(program.topicTags || [])].map(slugify).filter(Boolean))).slice(0, 14);
  const safeName = program.name || titleCase(program.key);
  const logo = program.logoUrl || '';
  const deeplink = program.deeplink || program.configuredDeeplink || program.clickThroughUrl || '';
  const domain = cleanDomain(program);
  const productList = buildProductList(products, safeName, deeplink);
  const intro = buildIntro(program, safeName, cluster);
  const heroAlt = logo ? `${safeName} logo` : `${safeName} dog owner resource`;
  const sensitive = cluster.slug === 'health' || cluster.slug === 'dog-food';

  return `---
title: ${quote(`${safeName} Guide for Dog People - Products, Services and Fit Notes`)}
seoTitle: ${quote(`${safeName} Dog Guide - Products, Services and Fit Notes`)}
displayTitle: ${quote(`${safeName} guide for dog people`)}
description: ${quote(`A PupWiki guide to ${safeName}: what the brand offers, when current or future dog owners may consider it, product or service fit, and practical buying notes.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
author: "The PupWiki Team"
category: "PupWiki Partners"
tags: ${yamlList(tags)}
postType: ${quote(normalizePostType('review'))}
contentTier: "money"
indexInBlog: false
generated: true
reviewMethod: ${quote(normalizeReviewMethod('brand-resource-review'))}
claimSensitivity: ${quote(sensitive ? 'high' : 'medium')}
monetizationIntent: ${quote(normalizeMonetizationIntent('brand-review'))}
affiliateDisclosure: true
medicalDisclaimer: ${sensitive ? 'true' : 'false'}
heroImage: ${quote(logo)}
heroImageAlt: ${quote(heroAlt)}
readTime: 5
partnerKey: ${quote(program.key)}
partnerAdvertiserId: ${quote(program.advertiserId)}
partnerCluster: ${quote(cluster.slug)}
partnerDeeplink: ${quote(deeplink)}
canonicalUrl: ${quote(`https://pupwiki.com/guides/${pageSlug}`)}
---

## About ${safeName}

${intro}

${domain ? `${safeName}'s website is **${domain}**. Use the brand site to confirm current products, pricing, availability, subscription terms, shipping, and return policy.` : `Use the brand site to confirm current products, pricing, availability, subscription terms, shipping, and return policy.`}

## What ${safeName} may be useful for

${cluster.icon} **${cluster.label}** resources can help with ${cluster.buyerUse}.

Common reasons dog owners may compare ${safeName}:

- They want a brand or product that fits a specific dog-care need.
- They are comparing quality, ingredients, materials, size, service terms, or convenience.
- They want to understand whether the offer fits their dogâ€™s age, size, routine, and budget.
- They prefer reviewing a brand page before making a purchase decision.

## Products or services to review

${productList}

## Is ${safeName} right for your dog?

${safeName} may be worth considering if it matches your dogâ€™s life stage, size, routine, and owner priorities. Before buying, compare the product or service against your actual use case rather than choosing only by brand name.

Questions to ask before you click:

- Does the product or service fit your dogâ€™s age, size, activity level, and health context?
- Are ingredients, sizing, materials, subscription terms, or service terms clearly explained?
- Are shipping, returns, cancellation terms, and customer support easy to understand?
- Does the brand provide enough detail for you to compare it with other options?

${cluster.caution ? `> **Care note:** ${cluster.caution}` : ''}

## PupWiki buying notes

- We avoid showing unsupported price, rating, or availability claims because these can change.
- Check the brand website for current details before buying.
- For health, food, supplements, insurance, or vet-adjacent decisions, use this page as a starting point and get professional advice when needed.

${deeplink ? `[Visit ${safeName}](${deeplink})` : ''}

## Related PupWiki guides

- [${cluster.label}](/categories/${cluster.slug})
- [Dog breeds](/breeds)
- [Dog cost calculator](/cost-calculator)
- [Full disclosure](/disclosure)
`;
}

function main() {
  mkdirSync(BLOG_DIR, { recursive: true });
  const awinData = readJson(PROGRAMS_PATH, null);
  const products = readJson(PRODUCTS_PATH, []);
  const banners = readJson(BANNERS_PATH, { banners: [] });

  if (!awinData || !Array.isArray(awinData.programs)) {
    warn('No brand resources found. Skipping brand guide generation.');
    return;
  }

  const activePrograms = awinData.programs.filter((program) => program.relationship === 'joined' && program.isActive !== false && program.key);
  let written = 0;
  const summary = [];

  for (const program of activePrograms) {
    const rows = productRows(program, products);
    const creativeRows = bannerRows(program, banners);
    const slug = `partner-${program.key}`;
    const file = join(BLOG_DIR, `${slug}.md`);
    const markdown = sanitizePublicDogCopy(buildMarkdown(program, rows, creativeRows));
    if (APPLY) writeFileSync(file, markdown, 'utf8');
    written += 1;
    summary.push({
      key: program.key,
      advertiserId: program.advertiserId,
      name: program.name,
      slug,
      href: `/guides/${slug}`,
      cluster: inferPartnerCluster(program).slug,
      productRows: rows.length,
      creativeRows: creativeRows.length,
      hasLogo: Boolean(program.logoUrl),
      hasDeeplink: Boolean(program.deeplink || program.clickThroughUrl),
      feedIds: program.feedIds || [],
    });
  }

  if (APPLY) {
    writeFileSync(SUMMARY_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), totalPartners: summary.length, partners: summary }, null, 2)}\n`, 'utf8');
  }

  log(`${APPLY ? 'Generated' : 'Checked'} ${written} user-facing brand guide(s).`);
}

main();

