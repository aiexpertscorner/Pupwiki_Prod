# PupWiki — Page Template Audit
**Phase 1 — Audit only. No production files modified.**
**Date:** 2026-05-27
**Branch:** `claude/pupwiki-template-audit-refactor-Jh9mQ`

---

## Audit Script Results

### `npm run design:audit:inline`
| Metric | Count |
|---|---|
| Files scanned | 252 |
| Files flagged | 153 |
| Inline `style=` attributes (total) | 361 |
| `<style>` blocks (total) | 76 |
| Hardcoded colors (total) | 608 |
| Layout CSS lines (total) | 8,787 |

### `npm run validate:ci`
**Result: PASS (exit 0)** — non-blocking warnings only:
- `content:normalize:check` — 406 files need frontmatter normalization (not applied in check mode)
- `content:audit:public:ci` — 5 public copy hits (non-blocking in CI mode)
- `amazon:links:audit` — 1 warning: `src/pages/blog/[slug].astro` not found (expected — blog is content collection, not a page file)

---

## A. Semantic / Accessibility Bugs (P0)

### Nested `<main>` Elements — **24 violations**

HTML spec allows exactly one `<main>` per page. `BaseLayout.astro` correctly owns `<main id="main-content">`. Every child layout and 21 pages also render their own `<main>`, creating invalid nested landmarks that break screen reader navigation.

**In child layouts:**
| File | Nested `<main>` |
|---|---|
| `src/layouts/BlogLayout.astro:166` | `<main class="article-page">` |
| `src/layouts/GuidesLayout.astro:169` | `<main class="article-page">` |
| `src/layouts/NameLayout.astro:75` | `<main class="pw-names" id="dog-names-content">` |

**In pages (direct BaseLayout children):**
| File | Nested `<main>` |
|---|---|
| `src/pages/404.astro` | `<main class="not-found">` |
| `src/pages/contact.astro` | `<main class="contact-page">` |
| `src/pages/privacy.astro` | `<main class="privacy-page">` |
| `src/pages/how-we-test.astro` | `<main class="methodology-page">` |
| `src/pages/categories/[category].astro` | `<main class:list={['category-hub', ...]}>`|
| `src/pages/categories/beds.astro` | same pattern |
| `src/pages/categories/dog-food.astro` | same pattern |
| `src/pages/categories/grooming.astro` | same pattern |
| `src/pages/categories/health.astro` | same pattern |
| `src/pages/categories/lifestyle.astro` | same pattern |
| `src/pages/categories/toys.astro` | same pattern |
| `src/pages/categories/training.astro` | same pattern |
| `src/pages/categories/pupwiki-partners.astro` | `<main class="pw-page">` |
| `src/pages/brands/[brand].astro` | `<main class="brand-main stack">` |
| `src/pages/breeds/[breed].astro` | `<main class="breed-page">` |
| `src/pages/breeds/index.astro` | `<main class="breed-directory">` |
| `src/pages/breeds/[breed]/[topic].astro` | `<main class="topic-main">` |
| `src/pages/faq/[slug].astro` | `<main class="faq-page__main">` |
| `src/pages/pet-insurance/index.astro` | `<main class="pi-main">` |
| `src/pages/cost-calculator/[breed].astro` | `<main class="cost-detail">` |
| `src/pages/cost-calculator/index.astro` | `<main class="cost-page">` |

**Fix (Phase 2):** Replace each child `<main>` with `<div class="page-shell page-shell--[family]">`, `<article>`, or `<section>` as semantically appropriate. BaseLayout remains the sole `<main>` owner.

### Missing `<article>` on Blog/Guide Content Pages

`BlogLayout.astro` and `GuidesLayout.astro` use `<div class="article-content prose">` rather than `<article>`. Blog and guide pages are document-level articles and should use the `<article>` semantic element for accessibility and SEO.

### Split `id="dog-names-content"` on NameLayout

`NameLayout.astro` sets `id="dog-names-content"` on its (nested) `<main>`. After the nested main is removed, this ID should move to an appropriate wrapper so any anchor links still work.

---

## B. `<style>` Blocks in Pages (23 files)

Page-level `<style>` blocks belong in `src/styles/pages/<family>.css`. Large ones create a maintenance burden and prevent consistent caching.

| File | Approx. style lines | Priority |
|---|---|---|
| `src/pages/cost-calculator/[breed].astro` | ~510 | P1 |
| `src/pages/cost-calculator/index.astro` | ~548 | P1 |
| `src/pages/how-we-test.astro` | ~238 | P1 |
| `src/pages/brands/[brand].astro` | ~170 | P1 |
| `src/pages/guides/index.astro` | ~168 | P1 |
| `src/pages/privacy.astro` | ~143 | P1 |
| `src/pages/categories/training.astro` | ~139 | P1 |
| `src/pages/breeds/[breed]/[topic].astro` | ~103 | P1 |
| `src/pages/categories/beds.astro` | ~103 | P2 |
| `src/pages/categories/dog-food.astro` | ~93 | P2 |
| `src/pages/categories/grooming.astro` | ~103 | P2 |
| `src/pages/categories/health.astro` | ~103 | P2 |
| `src/pages/categories/lifestyle.astro` | ~103 | P2 |
| `src/pages/categories/index.astro` | ~71 | P2 |
| `src/pages/faq/[slug].astro` | ~82 | P2 |
| `src/pages/faq/index.astro` | ~66 | P2 |
| `src/pages/reviews/index.astro` | ~103 | P2 |
| `src/pages/brands/index.astro` | ~68 | P2 |
| `src/pages/methodology.astro` | ~87 | P2 |
| `src/pages/contact.astro` | ~68 | P2 |
| `src/pages/disclosure.astro` | present | P2 |
| `src/pages/pet-insurance/index.astro` | ~95 | P2 |
| `src/pages/404.astro` | ~65 | P2 |

Also in components (76 style blocks total across codebase) — see design-system-violations.md.

---

## C. Inline `style=` Attributes (361 total)

Most use CSS custom properties (`var(--token)`) correctly — the issue is these should be CSS class rules, not inline attributes.

**Highest-count pages:**

| File | `style=` count |
|---|---|
| `src/pages/about.astro` | 42 |
| `src/pages/brands/[brand].astro` | 38 |
| `src/pages/guides/first-dog.astro` | 27 |
| `src/pages/breed-quiz.astro` | 10 |
| `src/pages/brands/index.astro` | 5 |
| `src/pages/cost-calculator/[breed].astro` | 4 |
| `src/layouts/GuidesLayout.astro` | 3 (AdSense slots) |
| `src/layouts/BlogLayout.astro` | 3 (AdSense slots) |
| `src/pages/dog-names/[breed].astro` | 2 |
| `src/pages/breeds/[breed].astro` | 1 |

**High-count components:**

| File | `style=` count |
|---|---|
| `src/components/content/ProductCard.astro` | 27 |
| `src/components/ProductCard.astro` | 26 |
| `src/components/VerdictBox.astro` | 17 |
| `src/components/InlineCTA.astro` | 14 |
| `src/components/ComparisonTable.astro` | 15 |
| `src/components/Newsletter.astro` | 12 |
| `src/components/PriceComparisonWidget.astro` | 11 |
| `src/components/BreedMatchQuiz.astro` | 23 |

**Special cases:**
- `BlogLayout.astro` / `GuidesLayout.astro`: AdSense slot inline styles (`display:block; min-height:90px`) — these should move to an `AdSlot.astro` component.
- `pet-insurance/index.astro`, `breed-quiz.astro`, `guides/first-dog.astro`: use `font-family:var(--font-serif)`, `font-size:var(--text-h1)` — correct vars, wrong delivery method.

---

## D. Hardcoded Colors — Design System Violations (608 total)

Most violations are `rgba()` values for brand orange and navy at various opacities, used in gradients and decorative borders. The token system is comprehensive but lacks opacity variants for gradient use.

**Top CSS file violators:**

| File | Hardcoded colors | Primary pattern |
|---|---|---|
| `src/styles/tokens.css` | 197 | Intentional — token definitions |
| `src/styles/domains/breeds/breed-detail.css` | 4+ | Rgba gradients |
| `src/styles/names.css` | 20 | Orange/navy radial gradients |
| `src/styles/components/breed-page.css` | 4+ | Rgba gradients |
| `src/styles/pages/tools.css` | 3 | Calculator colors |
| `src/styles/pages/breed-directory.css` | 18 | Multi-color backgrounds |
| `src/styles/domains/breeds/breed-hub.css` | 16 | Rgba gradients |
| `src/styles/components/home.css` | 25 | Gradients, borders |
| `src/styles/pages/article.css` | 15 | Rgba backgrounds |
| `src/styles/pages/category-hub.css` | 18 | Rgba borders/backgrounds |
| `src/styles/components/affiliate.css` | 10 | Brand-adjacent colors |
| `src/styles/components/awin-offers.css` | 18 | CTA/button styling |
| `src/styles/components/monetization.css` | 12 | Amazon color cluster |
| `src/styles/main.css` | 2 | Link text-decoration-color |

**Top Astro page/component violators:**

| File | Hardcoded colors | Audit score |
|---|---|---|
| `src/pages/cost-calculator/[breed].astro` | 21 | 407 |
| `src/pages/cost-calculator/index.astro` | 17 | 299 |
| `src/pages/guides/index.astro` | 18 | 232 |
| `src/pages/how-we-test.astro` | 16 | 199 |
| `src/components/home/HomeHeroClean.astro` | 22 | 170 |
| `src/pages/privacy.astro` | 11 | 154 |
| `src/pages/contact.astro` | 9 | 134 |
| `src/components/BreedMatchQuiz.astro` | 3 | 215 |
| `src/components/breed/BreedImage.astro` | 7 | 116 |
| `src/components/Newsletter.astro` | 4 | 107 |

**Most common violating patterns:**
- `rgba(255, 122, 0, 0.08–0.15)` — brand orange at low opacity → needs `--color-accent-opacity-08` etc.
- `rgba(21, 54, 95, 0.06–0.12)` — brand navy at low opacity → needs `--color-primary-opacity-08` etc.
- `rgba(255, 250, 243, 0.98)` — warm white near-opaque → needs `--color-surface-warm-98` or similar
- Amazon color cluster in `monetization.css`: `#fff8e8`, `#8a5300`, `#fff3d1`, `rgba(255, 153, 0, x)` → needs `--color-amazon-*` tokens
- `#fff` / `#ffffff` in style blocks → `var(--color-bg)` or `var(--color-text-on-dark)`

---

## E. Duplicate Components

### Confirmed duplicates requiring action:

| Component | File A | File B | Status | Recommended action |
|---|---|---|---|---|
| AmazonProductCard | `affiliate/AmazonProductCard.astro` (47 lines, old schema) | `amazon/AmazonProductCard.astro` (227 lines, rich schema) | Different; old uses `AmazonProductRecord`, new uses `RichAmazonProductRecord` | Migrate `affiliate/` callers to `amazon/`; delete `affiliate/` copy |
| AmazonProductSlot | `affiliate/AmazonProductSlot.astro` (uses `amazon-products.json`) | `amazon/AmazonProductSlot.astro` (uses `product-index.json`) | Different data pipelines; both actively used | Consolidate to `amazon/` pipeline; migrate `AmazonProductRail`, `CategoryAmazonBlock` |
| RelatedPosts | `src/components/RelatedPosts.astro` (root, 0 imports) | `blog/RelatedPosts.astro` (0 imports) | `guides/RelatedPosts.astro` is only used version | Delete root + blog copies; keep `guides/` |
| Breadcrumb | `ui/Breadcrumb.astro` (`items` prop, used by 13 files) | `primitives/Breadcrumb.astro` (`crumbs` prop, used by 4 files) | Both active; different APIs | Normalize one API; migrate 4 `primitives/` callers to `ui/`; delete `primitives/` copy |
| ProductCard | `src/components/ProductCard.astro` (101 lines) | `content/ProductCard.astro` (275 lines) | Near-identical; need diff check | Verify identical, keep `content/` version, delete root copy |
| BlogCard | `blog/BlogCard.astro` (76 lines) | `content/BlogCard.astro` (135 lines) | Different prop interfaces | Audit usages; choose canonical |
| GuideCard | `guides/GuideCard.astro` | `content/GuideCard.astro` | Not yet diffed | Diff and consolidate |
| ArticleCommerceSuite | `blog/ArticleCommerceSuite.astro` | `guides/ArticleCommerceSuite.astro` | Not yet diffed | Diff and consolidate |

**Breadcrumb split (callers):**
- `ui/Breadcrumb` (items): BlogLayout, GuidesLayout, NameLayout, all 7 static category pages, `categories/[category].astro`, `breeds/[breed]/[topic].astro`, `CategoryHero.astro`
- `primitives/Breadcrumb` (crumbs): `contact.astro`, `brands/index.astro`, `brands/[brand].astro`, `categories/index.astro`

---

## F. Home Components — 13 Unused Files Confirmed

Running `rg` confirmed zero external imports for 13 of 23 home component files:

| Component | File |
|---|---|
| HomeAwinSpotlight | `src/components/home/HomeAwinSpotlight.astro` |
| HomeBreedDiscovery | `src/components/home/HomeBreedDiscovery.astro` |
| HomeCareDecisionLayer | `src/components/home/HomeCareDecisionLayer.astro` |
| HomeEditorialHighlights | `src/components/home/HomeEditorialHighlights.astro` |
| HomeLifestyleFilter | `src/components/home/HomeLifestyleFilter.astro` |
| HomeMethodologyTeaser | `src/components/home/HomeMethodologyTeaser.astro` |
| HomeMixedBreedDiscovery | `src/components/home/HomeMixedBreedDiscovery.astro` |
| HomePrimaryJourneys | `src/components/home/HomePrimaryJourneys.astro` |
| HomeQuickCostTeaser | `src/components/home/HomeQuickCostTeaser.astro` |
| HomeTrustStrip | `src/components/home/HomeTrustStrip.astro` |
| HomeBreedExplorer | `src/components/home/HomeBreedExplorer.astro` |
| HomeHeroClean | `src/components/home/HomeHeroClean.astro` |
| HomeLeadCapture | `src/components/home/HomeLeadCapture.astro` |

**Active home components (imported by `src/pages/index.astro`):**
HomeHeroDecision, HomeDecisionPaths, HomeToolsPreview, HomeBreedStarter, HomeCostPlanning, HomeCareHubs, HomeFeaturedGuides, HomeMethodologyCompact, HomeFinalCta, HomeAwinShowcase (+ AwinOfferPlacement from affiliate/).

These 13 files are candidates for deletion (Phase 4). Before deleting, also check: `.astro` template files in `src/content/` or other directories that might reference them.

---

## G. Static Category Override Duplication

6 static category pages follow the identical pattern as `[category].astro` but with custom section content hard-coded:

| Static file | Lines | Route | Status |
|---|---|---|---|
| `src/pages/categories/beds.astro` | 322 | `/categories/beds` | Candidate for deletion if dynamic route covers same URL |
| `src/pages/categories/dog-food.astro` | 293 | `/categories/dog-food` | Same |
| `src/pages/categories/grooming.astro` | 322 | `/categories/grooming` | Same |
| `src/pages/categories/health.astro` | 322 | `/categories/health` | Same |
| `src/pages/categories/lifestyle.astro` | 322 | `/categories/lifestyle` | Same |
| `src/pages/categories/training.astro` | 470 | `/categories/training` | Same |
| `src/pages/categories/toys.astro` | 173 | `/categories/toys` | Same |

Also 3 trivial wrappers already clean: `insurance.astro`, `puppy.astro`, `senior-dogs.astro` (all 6 lines).

Astro's file-based routing means these static files take precedence over `[category].astro` for their slugs. If per-category custom sections can move to a category config, these files can be deleted and the dynamic route will handle all URLs. Requires verification that no public URL becomes a 404.

---

## H. Architecture Issues

### Page files doing too much
- `cost-calculator/[breed].astro` (2,174 lines) — calculator logic, styles, schema, data prep, template all inline
- `cost-calculator/index.astro` (1,682 lines) — same pattern
- `dog-names/[breed].astro` (1,124 lines) — almost entirely inline markup
- `how-we-test.astro` (926 lines) — 238 lines just CSS

### Repeated schema/meta logic
Schema (`BreadcrumbList`, `FAQPage`, `Article`) is constructed inline in individual pages rather than in layout slots or helpers. This creates drift and makes it hard to update consistently.

### Mixed schema responsibility
`BlogLayout.astro` and `GuidesLayout.astro` both handle `BreadcrumbList` schema inline. Pages that use `BaseLayout` directly construct their own schema. No shared schema builder utility is used consistently.

### AdSense inline slots
Both `BlogLayout` and `GuidesLayout` have matching AdSense inline styles (`display:block; min-height:90px`). These should be extracted to an `AdSlot.astro` component to allow centralized policy changes.

---

## I. Overall Scores by Page Family

| Family | Worst file score | Primary issues |
|---|---|---|
| Cost calculator | 407 | Nested main, 500+ line style block, 21 hardcoded colors, 4 inline styles |
| Brands | 332 | Nested main, 38 inline styles, 170-line style block |
| Guides/articles | 232 | Nested main (layouts), AdSense inline styles, 18 hardcoded colors |
| Breed pages | varies | Nested main across family |
| Categories | 229 | Nested main, static override duplication, style blocks |
| Names | 640 | names.css 20+ hardcoded colors, nested main in NameLayout |
| Static/legal | 154 | Nested main, style blocks, hardcoded colors |
| Home | 170 | 13 unused components, HomeHeroClean 22 hardcoded colors |
