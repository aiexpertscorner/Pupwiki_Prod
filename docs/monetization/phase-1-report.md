# PupWiki Monetization Phase 1 Report

## Summary

Phase 1 established the technical foundation for the monetization refactor. All tasks were completed without breaking the production build.

## Files changed

### Phase 0 (blog→guides rename — prerequisite)
- `src/content/config.ts` — collection renamed `blog` → `guides`
- `src/layouts/BlogLayout.astro` → copied to `GuidesLayout.astro`
- `src/components/blog/` → copied to `src/components/guides/` with Guide* names
- `src/styles/components/blog.css` → copied to `guides.css`; main.css import updated
- 15 files with `getCollection('blog')` → `getCollection('guides')`
- Type renames: `BlogLikeEntry` → `GuideLikeEntry`, functions in categoryHelpers
- `pageType: 'blog'` → `'guide'` in Amazon matching, intent, and slot components
- `BLOG_PAGE_PATH` → points to `/guides`; paths object deduped
- `sitemap-blog.xml` → `sitemap-articles.xml`; generator + index files updated
- 404 and tools/index user-facing text updated
- Workflow echo labels updated

### Phase 1
- `package.json` — `"prebuild": "npm run sitemap:generate"` added (auto-runs before `npm run build`)
- `package.json` — `"sitemap:validate": "node scripts/seo/validate-sitemaps.mjs"` added
- `scripts/seo/validate-sitemaps.mjs` — new sitemap validation script
- `src/data/monetization/placement-rules.json` — placement rules config
- `src/lib/analytics/affiliateEvents.ts` — unified click + impression event helpers
- `src/components/commerce/CommercePlacement.astro` — updated import to affiliateEvents

## Validation commands

```bash
npm run build:ci          # Production build (no prebuild hook)
npm run sitemap:generate  # Regenerate sitemaps
npm run sitemap:validate  # Validate sitemap structure
```

## Results

- Build: ✓ passes
- Sitemap validation: ✓ all 8 required files present, all URLs start with https://pupwiki.com/
- No external API calls in build
- ads.txt: ✓ already correct (google.com, pub-4011000703937954, DIRECT)

## Remaining risks

- Legacy `src/layouts/BlogLayout.astro` and `src/components/blog/` directory remain as fallbacks
  (can be deleted after confirming no external scripts reference them)
- `src/content/blog/` directory name unchanged (1,415 markdown files — rename deferred)
- 34 pre-existing TypeScript errors in astro check (adsbygoogle, gtag types) — pre-existing, not introduced

## Recommended next phase

Phase 2: AWIN creative engine — build AwinProductCard, CommerceRail, MerchantSpotlight,
AwinCreativeBanner, MonetizationRail, and the getProgramData utility.
