# PupWiki — Refactor Plan
**Phase 1 output — Implementation begins in Phase 2.**
**Date:** 2026-05-27

---

## Architecture Target

```
BaseLayout (owns <html>, <head>, <body>, skip link, header, footer, <main id="main-content">)
  └── <div class="page-shell page-shell--[family]">  ← child layouts/pages render this
        ├── <PageFamilyHero />
        ├── <section> / <article> / <aside> (semantic)
        └── related links strip
```

- `BaseLayout` is the **sole owner** of `<main id="main-content">`.
- Child layouts (`BlogLayout`, `GuidesLayout`, `NameLayout`) do **not** render `<main>`.
- Pages that use `BaseLayout` directly do **not** render `<main>`.
- Blog/guide content pages use `<article class="article-content prose">` (not a redundant main).

---

## P0 — Bugs (Fix before anything else)

### P0-1: Remove nested `<main>` from child layouts

**Files:** `src/layouts/BlogLayout.astro:166`, `src/layouts/GuidesLayout.astro:169`, `src/layouts/NameLayout.astro:75`

Change: Replace `<main ...>` with `<div class="page-shell page-shell--[family]">` (or `<article>` for blog/guides). Move the CSS class to the div; update `src/styles/` selectors if needed.

After: Run `rg "<main" src/layouts` — should show only BaseLayout.

### P0-2: Remove nested `<main>` from 21 pages

**Files:** All pages listed in page-template-audit.md Section A.

Change: Replace each `<main class="...">` with `<div class="...">`. The CSS class stays the same; only the tag changes. CSS selectors targeting `main.breed-page` etc. must be updated to `div.breed-page`.

Recommended change per family:
- Categories: `<div class:list={['category-hub', ...]}>` 
- Breeds: `<div class="breed-page">`, `<div class="breed-directory">`
- Cost calculator: `<div class="cost-detail">`, `<div class="cost-page">`
- Brands: `<div class="brand-main stack">`
- Static pages: `<div class="privacy-page">` etc.
- FAQ: `<div class="faq-page__main">`
- Pet insurance: `<div class="pi-main">`

After: Run `rg "<main" src/pages src/layouts` — should show zero results.

### P0-3: Add `<article>` to blog and guides layouts

**Files:** `src/layouts/BlogLayout.astro`, `src/layouts/GuidesLayout.astro`

Both currently use `<div class="article-content prose">`. Change to `<article class="article-content prose">`.

---

## P1 — High-value cleanup (Phase 2 + 3)

### P1-1: Extract page-level `<style>` blocks

Extract each page's `<style>` block to the corresponding CSS file. Delete the `<style>` block from the page after extraction. Do NOT leave empty `<style></style>` tags.

| Page | Target CSS file | Notes |
|---|---|---|
| `cost-calculator/[breed].astro` (510 lines) | `src/styles/pages/cost-calculator.css` | Also fix 21 hardcoded colors in same pass |
| `cost-calculator/index.astro` (548 lines) | `src/styles/pages/cost-calculator.css` | Also fix 17 hardcoded colors in same pass |
| `how-we-test.astro` (238 lines) | `src/styles/pages/methodology.css` | Create new file, import in main.css |
| `brands/[brand].astro` (170 lines) | `src/styles/pages/brands.css` | Create new file, import in main.css |
| `guides/index.astro` (168 lines) | `src/styles/pages/guides-hub.css` | Also fix 18 hardcoded colors |
| `privacy.astro` (143 lines) | `src/styles/pages/legal.css` | Group with contact+disclosure+404 |
| `categories/training.astro` (139 lines) | merge into `category-hub.css` | Remove static page after merge |
| `breeds/[breed]/[topic].astro` (103 lines) | `src/styles/pages/breed-topic.css` | Create new file |
| `reviews/index.astro` (103 lines) | `src/styles/pages/reviews.css` | Create new file |
| `faq/[slug].astro` (82 lines) | `src/styles/pages/faq.css` | Group with faq/index |
| `contact.astro` (68 lines) | `src/styles/pages/static.css` | Group static pages |
| `disclosure.astro` | `src/styles/pages/static.css` | |
| `404.astro` (65 lines) | `src/styles/pages/static.css` | |
| `pet-insurance/index.astro` (95 lines) | `src/styles/pages/pet-insurance.css` | |

After each file: Add CSS import to `src/styles/main.css` at the end of the `pages/` section.

### P1-2: Canonicalize duplicate components

#### RelatedPosts (3 copies → 1)

- Keep: `src/components/guides/RelatedPosts.astro` (only active version)
- Delete: `src/components/RelatedPosts.astro` (root, 0 imports)
- Delete: `src/components/blog/RelatedPosts.astro` (0 imports, identical to guides/)
- No import updates needed (guides/[slug].astro already imports guides/)

#### Breadcrumb (2 copies → 1, 4 import migrations)

- Keep: `src/components/ui/Breadcrumb.astro` with `items` prop API
- Delete: `src/components/primitives/Breadcrumb.astro` after migrating callers
- Migrate these 4 callers to `ui/Breadcrumb` (changing `crumbs=` to `items=`):
  - `src/pages/contact.astro`
  - `src/pages/brands/index.astro`
  - `src/pages/brands/[brand].astro`
  - `src/pages/categories/index.astro`

Note: `ui/Breadcrumb` expects `{label, href, current?}` objects. The `primitives/` version uses `{label, href}`. Map accordingly.

#### Amazon pipeline migration (affiliate/ → amazon/)

**Phase A — AmazonProductCard:**
- `affiliate/AmazonProductCard.astro` is only imported by `affiliate/AmazonProductSlot.astro`
- Update `affiliate/AmazonProductSlot.astro` to use `amazon/AmazonProductCard.astro` with `RichAmazonProductRecord`
- After update: delete `affiliate/AmazonProductCard.astro`

**Phase B — AmazonProductSlot:**
- Two callers of `affiliate/AmazonProductSlot.astro`: `AmazonProductRail.astro` and `CategoryAmazonBlock.astro`
- Update both callers to import from `amazon/AmazonProductSlot.astro`
- Verify data passed is compatible with `product-index.json` pipeline
- After update: delete `affiliate/AmazonProductSlot.astro`

**Note:** This migration requires careful testing — the data schemas differ. Build must pass after each step.

#### ProductCard (2 copies → 1)

- Compare `src/components/ProductCard.astro` (101 lines, root) vs `src/components/content/ProductCard.astro` (275 lines)
- Root version has 26 inline styles; content/ version has 27 — likely same template, different sizes
- Run: `rg "import.*ProductCard" src/` and confirm root ProductCard's callers
- If callers only include `affiliate/AmazonProductSlot` (which is being migrated anyway): delete root copy after migration
- If other callers exist: update them to `content/ProductCard` first

### P1-3: Delete 13 unused home components

All 13 have 0 confirmed imports. Delete with `git rm`:
```
src/components/home/HomeAwinSpotlight.astro
src/components/home/HomeBreedDiscovery.astro
src/components/home/HomeCareDecisionLayer.astro
src/components/home/HomeEditorialHighlights.astro
src/components/home/HomeLifestyleFilter.astro
src/components/home/HomeMethodologyTeaser.astro
src/components/home/HomeMixedBreedDiscovery.astro
src/components/home/HomePrimaryJourneys.astro
src/components/home/HomeQuickCostTeaser.astro
src/components/home/HomeTrustStrip.astro
src/components/home/HomeBreedExplorer.astro
src/components/home/HomeHeroClean.astro
src/components/home/HomeLeadCapture.astro
```
Also delete root-level orphaned: `src/components/RelatedPosts.astro`

### P1-4: Evaluate static category override deletion

Prerequisite: Confirm `[category].astro` dynamic route renders each static URL correctly with per-category config.

Check if `data/category-taxonomy.json` or similar config supports the custom sections currently hard-coded in each static file. If yes, move custom content to config and delete the static files.

If config doesn't support it, create a `categoryOverrides` section in config before deleting.

Static files to delete after confirmation:
`categories/beds.astro`, `categories/dog-food.astro`, `categories/grooming.astro`, `categories/health.astro`, `categories/lifestyle.astro`, `categories/training.astro`, `categories/toys.astro`

---

## P2 — Visual polish / maintainability (Phase 3)

### P2-1: Expand tokens.css with opacity variants

Add ~20 new tokens to `src/styles/tokens.css` as documented in design-system-violations.md. This unblocks all other color fix passes.

Key tokens:
```css
--color-accent-opacity-08: rgba(255, 122, 0, 0.08);
--color-accent-opacity-10: rgba(255, 122, 0, 0.10);
--color-primary-opacity-08: rgba(21, 54, 95, 0.08);
--color-primary-opacity-12: rgba(21, 54, 95, 0.12);
--color-surface-warm-98: rgba(255, 250, 243, 0.98);
--color-amazon-label-bg: #fff8e8;
--color-amazon-text: #8a5300;
/* + others in violations report */
```

### P2-2: Create `AdSlot.astro` component

Extract the AdSense inline style pattern from `BlogLayout` and `GuidesLayout`:
```astro
<div class="ad-slot-wrapper" style="margin-top:var(--space-4)">
  <ins class="adsbygoogle" style="display:block; min-height:90px; width:100%" ...>
```
into `src/components/primitives/AdSlot.astro`. The `display:block; min-height:90px` can stay inline for AdSense compliance (Google requires this). Wrapper margin moves to CSS.

### P2-3: Token-clean batch pass on CSS files

After tokens are added, batch-replace all `rgba(255, 122, 0, x)` and `rgba(21, 54, 95, x)` in:
- `src/styles/components/home.css`
- `src/styles/pages/category-hub.css`
- `src/styles/names.css`
- `src/styles/pages/breed-directory.css`
- `src/styles/components/awin-offers.css`
- `src/styles/components/monetization.css` (Amazon cluster → tokens)
- `src/styles/main.css` (2 values)

### P2-4: Inline style migration in key pages

Move `style=` attributes to CSS classes for:
- `src/pages/about.astro` (42 inline styles) → `src/styles/pages/static.css`
- `src/pages/guides/first-dog.astro` (27 inline styles) → use existing font/text token classes
- `src/pages/breed-quiz.astro` (10 inline styles) → tools.css

### P2-5: Component inline style cleanup

High-priority components:
- `src/components/content/ProductCard.astro` (27 inline styles) → products.css
- `src/components/VerdictBox.astro` (17 inline styles) → components.css
- `src/components/BreedMatchQuiz.astro` (23 inline + 3 hardcoded) → tools.css + token fix
- `src/components/ComparisonTable.astro` (15 inline + 4 hardcoded) → components.css + token fix
- `src/components/InlineCTA.astro` (14 inline) → buttons.css

---

## P3 — Nice-to-have

### P3-1: Schema builder utility

Create `src/lib/schema/` with shared schema builder functions to reduce duplication across pages:
- `buildBreadcrumbSchema(crumbs)` 
- `buildArticleSchema(post)`
- `buildFAQSchema(questions)`

### P3-2: Token-clean `names.css`

The 2,331-line `names.css` is the single highest-risk CSS file. Consider splitting:
```
src/styles/domains/names/
  index.css      (imports)
  hero.css       (gradient backgrounds → use tokens)
  cards.css      (name card styling)
  lists.css      (name list grids)
  filters.css    (filter UI)
```

### P3-3: Static page shell component

For about, contact, disclosure, privacy, methodology — create a shared `<StaticPageShell>` component that handles the page hero, breadcrumb, and single-column prose layout, reducing per-page boilerplate.

---

## Per-family Phase 3 Work Items

### Base layout + global shell
- [P0] Remove nested main from BlogLayout, GuidesLayout, NameLayout
- [P1] AdSlot component extraction
- [P2] Article tag for content layouts

### Categories
- [P0] Remove nested main from [category].astro + 7 static pages
- [P1] Extract style blocks from training.astro and others
- [P1] Evaluate and delete static override pages after config verification
- [P2] Token-clean category-hub.css (18 violations)

### Guides/articles
- [P0] Nested main removed (via layout fix)
- [P1] Extract guides/index.astro style block (168 lines, 18 hardcoded colors)
- [P2] Token-clean article.css (15 violations)
- [P4] guides/RelatedPosts.astro — clean style block

### Breeds
- [P0] Remove nested main from breeds/[breed].astro, breeds/index.astro, [topic].astro
- [P1] Extract [topic].astro style block
- [P2] Token-clean breed-hub.css, breed-detail.css, breed-page.css

### Tools / cost calculators
- [P0] Remove nested main from cost-calculator/[breed] + index
- [P1] Extract 500+ line style blocks to cost-calculator.css
- [P1] Fix 21+17 hardcoded color violations

### Dog names
- [P0] Remove nested main from NameLayout
- [P2] Token-clean names.css (20 violations)
- [P3] Consider splitting names.css

### Reviews / brands
- [P0] Remove nested main from brands/[brand].astro
- [P1] Extract 170-line style block from brands/[brand].astro
- [P1] Migrate affiliate/ Amazon components to amazon/ pipeline
- [P1] Migrate primitives/Breadcrumb callers in brands/ to ui/Breadcrumb

### Static / legal / error pages
- [P0] Remove nested main from 404, contact, privacy, how-we-test, pet-insurance/index
- [P1] Extract style blocks to static.css, methodology.css, legal.css
- [P2] Token-clean hardcoded colors in contact, privacy, how-we-test, 404

---

## Build Validation Gates

After each phase segment, run (fast — no full build):
```bash
npm run design:audit:inline
# Check that flagged count and totals are decreasing
```

Full build only on final Phase 3 completion and Phase 5:
```bash
npm run build:ci
```
