# PupWiki — Deletion Manifest
**Phase 2 — Architecture refactor + clean repo**
**Date:** 2026-05-27
**Branch:** `claude/pupwiki-template-audit-refactor-Jh9mQ`

All deletions below are evidence-based: confirmed 0 imports via `rg` before deletion, and `validate:ci` passes after.

---

## Deleted Files

### 1. `src/components/primitives/Breadcrumb.astro`
- **Type:** UI component
- **Reason:** Duplicate of `src/components/ui/Breadcrumb.astro` with a different prop API (`crumbs=` vs `items=`). All 5 callers migrated to `ui/Breadcrumb` with `items=` prop.
- **Replacement:** `src/components/ui/Breadcrumb.astro`
- **Callers migrated:**
  - `src/pages/contact.astro`
  - `src/pages/brands/index.astro`
  - `src/pages/brands/[brand].astro`
  - `src/pages/categories/index.astro`
  - `src/pages/breeds/[breed]/[topic].astro`
- **Proof:** `rg "primitives/Breadcrumb" src/` → 0 results after migration
- **Build result:** `validate:ci` passes

---

### 2. `src/components/RelatedPosts.astro`
- **Type:** UI component (root-level)
- **Reason:** Orphaned — 0 imports confirmed. Simpler/older version (104 lines) vs active `guides/RelatedPosts.astro` (180 lines). Different component structure, not interchangeable.
- **Replacement:** `src/components/guides/RelatedPosts.astro` is the active canonical version
- **Proof:** `rg "components/RelatedPosts" src/ -g "*.astro" | grep import` → 0 results
- **Build result:** `validate:ci` passes

---

### 3. `src/components/blog/RelatedPosts.astro`
- **Type:** UI component
- **Reason:** Byte-for-byte identical to `src/components/guides/RelatedPosts.astro`. Zero external imports confirmed. The `guides/` version is the only active copy (imported by `src/pages/guides/[slug].astro`).
- **Replacement:** `src/components/guides/RelatedPosts.astro`
- **Proof:** `diff blog/RelatedPosts.astro guides/RelatedPosts.astro` → empty output; `rg "blog/RelatedPosts" src/` → 0 results
- **Build result:** `validate:ci` passes

---

### 4. `src/components/blog/ArticleCommerceSuite.astro`
- **Type:** UI component
- **Reason:** Byte-for-byte identical to `src/components/guides/ArticleCommerceSuite.astro`. Zero external imports. The `guides/` version is active (imported by `src/pages/guides/[slug].astro`).
- **Replacement:** `src/components/guides/ArticleCommerceSuite.astro`
- **Proof:** `diff blog/ArticleCommerceSuite.astro guides/ArticleCommerceSuite.astro` → empty output; `rg "blog/ArticleCommerceSuite" src/` → 0 results
- **Build result:** `validate:ci` passes

---

### 5. `src/components/guides/GuideCard.astro`
- **Type:** UI component
- **Reason:** Old/superseded version (simpler, category as structured object). Zero imports confirmed. Canonical replacement is `src/components/content/GuideCard.astro` (new v4, category-aware stock image pools, hash-based fallback).
- **Replacement:** `src/components/content/GuideCard.astro`
- **Proof:** `rg "guides/GuideCard" src/` → 0 results
- **Build result:** `validate:ci` passes

---

### 6. `src/components/ProductCard.astro`
- **Type:** UI component (root-level)
- **Reason:** Outdated version (101 lines, simple image fallback, no JSON-LD, no category-awareness). Zero direct imports. Canonical replacement is `src/components/content/ProductCard.astro` (275 lines, 4-tier image waterfall, full Product schema, subscription handling).
- **Replacement:** `src/components/content/ProductCard.astro`
- **Proof:** `rg "from.*components/ProductCard" src/ -g "*.astro" | grep -v content/ProductCard | grep import` → 0 results
- **Build result:** `validate:ci` passes

---

### 7–19. Unused home components (13 files)

All 13 confirmed 0 imports across entire `src/` and `public/` via `rg`. No dynamic references found.

| File deleted | Replacement / Reason |
|---|---|
| `src/components/home/HomeAwinSpotlight.astro` | Replaced by `HomeAwinShowcase.astro` (active) |
| `src/components/home/HomeBreedDiscovery.astro` | Replaced by `HomeBreedStarter.astro` (active) |
| `src/components/home/HomeBreedExplorer.astro` | Replaced by `src/components/breeds/BreedFinderPanel.astro` |
| `src/components/home/HomeCareDecisionLayer.astro` | Replaced by `HomeCareHubs.astro` (active) |
| `src/components/home/HomeEditorialHighlights.astro` | Replaced by `HomeFeaturedGuides.astro` (active) |
| `src/components/home/HomeHeroClean.astro` | Replaced by `HomeHeroDecision.astro` (active); had 22 hardcoded colors |
| `src/components/home/HomeLeadCapture.astro` | Lead capture not active on current homepage |
| `src/components/home/HomeLifestyleFilter.astro` | Lifestyle filter feature not active |
| `src/components/home/HomeMethodologyTeaser.astro` | Replaced by `HomeMethodologyCompact.astro` (active) |
| `src/components/home/HomeMixedBreedDiscovery.astro` | Mixed breed section not active |
| `src/components/home/HomePrimaryJourneys.astro` | Replaced by `HomeDecisionPaths.astro` (active) |
| `src/components/home/HomeQuickCostTeaser.astro` | Replaced by `HomeCostPlanning.astro` (active) |
| `src/components/home/HomeTrustStrip.astro` | Trust signals moved to other sections |

**Proof for all 13:** `rg "HomeAwinSpotlight|HomeBreedDiscovery|HomeCareDecisionLayer|HomeEditorialHighlights|HomeLifestyleFilter|HomeMethodologyTeaser|HomeMixedBreedDiscovery|HomePrimaryJourneys|HomeQuickCostTeaser|HomeTrustStrip|HomeBreedExplorer|HomeHeroClean|HomeLeadCapture" src/ public/` → 0 external references (only self-references within the component files themselves)

---

## Total Files Deleted: 19

| Category | Count |
|---|---|
| Duplicate Breadcrumb (primitives/) | 1 |
| Orphaned RelatedPosts copies | 2 |
| Identical ArticleCommerceSuite duplicate | 1 |
| Outdated GuideCard | 1 |
| Outdated root ProductCard | 1 |
| Unused home components | 13 |
| **Total** | **19** |

---

## Impact on Audit Metrics

| Metric | Phase 1 baseline | After Phase 2 | Delta |
|---|---|---|---|
| Files scanned | 252 | 233 | -19 |
| Flagged files | 153 | 139 | -14 |
| Inline styles | 361 | 328 | -33 |
| Style blocks | 76 | 64 | -12 |
| Hardcoded colors | 608 | 562 | -46 |
| Layout CSS lines | 8,787 | 8,110 | -677 |

---

## Not Deleted (Still Pending)

The following are deletion candidates from `legacy-cleanup-candidates.csv` that were deferred:

| File | Reason deferred |
|---|---|
| `src/components/affiliate/AmazonProductCard.astro` | Requires data pipeline migration (`affiliate/` → `amazon/` schema) before deleting |
| `src/components/affiliate/AmazonProductSlot.astro` | Same — 2 callers to migrate first |
| Static category overrides (7 files) | Route-safety check required before deletion |
