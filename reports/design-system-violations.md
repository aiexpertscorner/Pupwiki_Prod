# PupWiki — Design System Violations
**Phase 1 — Audit only. No production files modified.**
**Date:** 2026-05-27

---

## Summary (from `npm run design:audit:inline`)

| Violation type | Total count |
|---|---|
| `<style>` blocks | 76 |
| Inline `style=` attributes | 361 |
| Hardcoded colors | 608 |

Note: `src/styles/tokens.css` contains 197 intentional hardcoded values (the token definitions themselves). Excluding tokens.css, the true violation count is **~411 hardcoded colors** that should reference tokens.

---

## Section 1 — `<style>` Blocks

### In pages (should move to `src/styles/pages/`)

| File | Approx. lines | Target CSS file |
|---|---|---|
| `src/pages/cost-calculator/[breed].astro` | ~510 | `src/styles/pages/cost-calculator.css` |
| `src/pages/cost-calculator/index.astro` | ~548 | `src/styles/pages/cost-calculator.css` |
| `src/pages/how-we-test.astro` | ~238 | `src/styles/pages/methodology.css` |
| `src/pages/brands/[brand].astro` | ~170 | `src/styles/pages/brands.css` |
| `src/pages/guides/index.astro` | ~168 | `src/styles/pages/guides-hub.css` |
| `src/pages/privacy.astro` | ~143 | `src/styles/pages/legal.css` |
| `src/pages/categories/training.astro` | ~139 | merge into `category-hub.css` |
| `src/pages/breeds/[breed]/[topic].astro` | ~103 | `src/styles/pages/breed-topic.css` |
| `src/pages/categories/beds.astro` | ~103 | merge into `category-hub.css` |
| `src/pages/categories/grooming.astro` | ~103 | merge into `category-hub.css` |
| `src/pages/categories/health.astro` | ~103 | merge into `category-hub.css` |
| `src/pages/categories/lifestyle.astro` | ~103 | merge into `category-hub.css` |
| `src/pages/reviews/index.astro` | ~103 | `src/styles/pages/reviews.css` |
| `src/pages/methodology.astro` | ~87 | `src/styles/pages/methodology.css` |
| `src/pages/faq/[slug].astro` | ~82 | `src/styles/pages/faq.css` |
| `src/pages/categories/index.astro` | ~71 | merge into `category-hub.css` |
| `src/pages/brands/index.astro` | ~68 | `src/styles/pages/brands.css` |
| `src/pages/contact.astro` | ~68 | `src/styles/pages/static.css` |
| `src/pages/disclosure.astro` | present | `src/styles/pages/static.css` |
| `src/pages/faq/index.astro` | ~66 | `src/styles/pages/faq.css` |
| `src/pages/pet-insurance/index.astro` | ~95 | `src/styles/pages/pet-insurance.css` |
| `src/pages/404.astro` | ~65 | `src/styles/pages/static.css` |
| `src/pages/categories/dog-food.astro` | ~93 | merge into `category-hub.css` |

### In components (76 total across codebase — selected high-priority)

| File | Priority | Notes |
|---|---|---|
| `src/components/home/HomeAwinShowcase.astro` | P2 | 135 layout CSS lines — move to home.css |
| `src/components/home/HomeBreedExplorer.astro` | P4 | Unused; delete component |
| `src/components/amazon/AmazonProductCard.astro` | P2 | Move to products.css or amazon-affiliate.css |
| `src/components/amazon/AmazonProductSlot.astro` | P2 | Move to amazon-affiliate.css |
| `src/components/breed/BreedImage.astro` | P2 | Move to breed.css |
| `src/components/breed/BreedStats.astro` | P2 | Move to breed.css |
| `src/components/breed/ClusterLinks.astro` | P2 | Move to breed.css |
| `src/components/breed/RankingData.astro` | P2 | Move to breed.css |
| `src/components/BreedMatchQuiz.astro` | P2 | Also has 23 inline styles |
| `src/components/InlineCTA.astro` | P2 | Also has 14 inline styles |
| `src/components/faq/FaqAccordion.astro` | P3 | Move to components/ CSS |
| `src/components/primitives/Breadcrumb.astro` | P1 | Merge into ui/Breadcrumb or breadcrumb.css then delete |
| `src/components/primitives/ComparisonPanel.astro` | P3 | Move to components/ CSS |
| All home/* components | P2 | 10 active ones all have style blocks |

---

## Section 2 — Inline `style=` Attributes

### In pages

| File | Count | Pattern | Recommended fix |
|---|---|---|---|
| `src/pages/about.astro` | 42 | All use `var(--token)` | Extract to `src/styles/pages/static.css` classes |
| `src/pages/brands/[brand].astro` | 38 | Mix of var() and layout attrs | Extract to brands.css |
| `src/pages/guides/first-dog.astro` | 27 | `font-family:var(--font-serif)`, `font-size:var(--text-h1)` | Extract to guides-hub.css or static.css |
| `src/pages/breed-quiz.astro` | 10 | var() tokens | Extract to static.css or tools.css |
| `src/pages/brands/index.astro` | 5 | var() tokens | Extract to brands.css |
| `src/pages/cost-calculator/[breed].astro` | 4 | var() tokens | Extract to cost-calculator.css |
| `src/layouts/GuidesLayout.astro` | 3 | AdSense: `display:block;min-height:90px;width:100%` | Create `AdSlot.astro` component |
| `src/layouts/BlogLayout.astro` | 3 | Same AdSense pattern | Create `AdSlot.astro` component |
| `src/pages/dog-names/[breed].astro` | 2 | var() tokens | Extract to names.css |
| `src/pages/breeds/[breed].astro` | 1 | var() token | Extract to breed-page.css |

### In components

| File | Count | Pattern | Recommended fix |
|---|---|---|---|
| `src/components/content/ProductCard.astro` | 27 | var() + layout | Extract to products.css |
| `src/components/ProductCard.astro` | 26 | var() + layout | Delete file (replaced by content/) |
| `src/components/VerdictBox.astro` | 17 | var() tokens | Extract to components.css |
| `src/components/BreedMatchQuiz.astro` | 23 | Mix of hardcoded + var() | Extract to tools.css; fix hardcoded values |
| `src/components/InlineCTA.astro` | 14 | var() tokens | Extract to buttons.css |
| `src/components/ComparisonTable.astro` | 15 | rgba() hardcoded + var() | Fix rgba, extract to components.css |
| `src/components/Newsletter.astro` | 12 | var() + rgba hardcoded | Fix rgba, extract to components.css |
| `src/components/PriceComparisonWidget.astro` | 11 | var() tokens | Extract to tools.css |

---

## Section 3 — Hardcoded Colors

### Token gap: Missing opacity variants

The main pattern is brand colors used at various opacities for gradients and subtle backgrounds. These need new tokens in `src/styles/tokens.css`:

**Proposed new tokens:**
```css
/* Brand opacity variants (for gradients/decorative use) */
--color-accent-opacity-06: rgba(255, 122, 0, 0.06);
--color-accent-opacity-08: rgba(255, 122, 0, 0.08);
--color-accent-opacity-10: rgba(255, 122, 0, 0.10);
--color-accent-opacity-15: rgba(255, 122, 0, 0.15);
--color-accent-opacity-20: rgba(255, 122, 0, 0.20);
--color-primary-opacity-06: rgba(21, 54, 95, 0.06);
--color-primary-opacity-08: rgba(21, 54, 95, 0.08);
--color-primary-opacity-10: rgba(21, 54, 95, 0.10);
--color-primary-opacity-12: rgba(21, 54, 95, 0.12);
--color-primary-opacity-20: rgba(21, 54, 95, 0.20);
--color-primary-opacity-28: rgba(21, 54, 95, 0.28);
/* Warm white near-opaque (surface overlay) */
--color-surface-warm-98: rgba(255, 250, 243, 0.98);
/* Amazon color cluster */
--color-amazon-label-bg: #fff8e8;
--color-amazon-label-border: rgba(255, 153, 0, 0.34);
--color-amazon-text: #8a5300;
--color-amazon-source-bg: #fff3d1;
--color-amazon-border: rgba(255, 153, 0, 0.32);
--color-amazon-search-border: rgba(255, 153, 0, 0.36);
/* Link decoration opacity variants */
--color-primary-decoration: rgba(21, 54, 95, 0.28);
--color-cta-decoration: rgba(194, 65, 12, 0.42);
```

### CSS file violations (excluding tokens.css)

#### `src/styles/components/home.css` — 25 violations
Primary patterns: `rgba(255, 122, 0, x)`, `rgba(21, 54, 95, x)` in gradients and hover borders.
Replace with: `var(--color-accent-opacity-10)`, `var(--color-primary-opacity-08)` etc.

#### `src/styles/pages/category-hub.css` — 18 violations
Primary patterns: rgba borders and gradient backgrounds for category color themes.
Replace with token opacity variants.

#### `src/styles/pages/breed-directory.css` — 18 violations
Primary patterns: multi-color card backgrounds and hover states.
Replace with breed-specific tokens or opacity variants.

#### `src/styles/components/awin-offers.css` — 18 violations
Primary patterns: CTA button backgrounds, offer card borders.
Replace with existing `--color-cta` tokens and new opacity variants.

#### `src/styles/themes/streetwear.css` — 17 violations
Note: streetwear.css uses dark-mode-specific colors. Some may be intentional overrides. Review before replacing; some may need new `--color-dark-*` token variants.

#### `src/styles/names.css` — 20 violations
Primary patterns: `rgba(255, 122, 0, 0.1)`, `rgba(21, 54, 95, 0.08)` in hero gradients (lines 24-25).
Exact code also duplicated in `cost-calculator/[breed].astro` lines 970-971 — a code smell.
Replace with: `var(--color-accent-opacity-10)`, `var(--color-primary-opacity-08)`.

#### `src/styles/domains/breeds/breed-hub.css` — 16 violations
Primary patterns: gradient backgrounds for breed stat cards.
Replace with token opacity variants.

#### `src/styles/components/affiliate.css` — 10 violations
Primary patterns: badge backgrounds, link colors.
Replace with existing affiliate tokens or new ones.

#### `src/styles/components/monetization.css` — 12 violations
Amazon color cluster: `#fff8e8`, `#8a5300`, `#fff3d1`, multiple `rgba(255, 153, 0, x)`.
Move to `--color-amazon-*` tokens (see proposed tokens above).

#### `src/styles/main.css` — 2 violations
Lines 94 and 101: `text-decoration-color` rgba values.
Replace with: `var(--color-primary-decoration)`, `var(--color-cta-decoration)`.

#### `src/styles/pages/article.css` — 15 violations
Primary patterns: blockquote borders, pull-quote backgrounds.
Replace with token opacity variants or new content tokens.

### Astro component violations

#### `src/pages/cost-calculator/[breed].astro` — 21 violations
Primary patterns: `rgba(255, 122, 0, 0.1)`, `rgba(21, 54, 95, 0.08)` in hero gradient (identical to names.css).
Also contains: `rgba(255, 250, 243, 0.98)` (warm white).
Replace with opacity token vars after tokens.css is expanded.

#### `src/pages/cost-calculator/index.astro` — 17 violations
Same primary patterns.

#### `src/pages/guides/index.astro` — 18 violations
Primary patterns: hero gradients and section backgrounds using rgba brand colors.

#### `src/pages/how-we-test.astro` — 16 violations
Primary patterns: card backgrounds, step indicator colors.

#### `src/components/home/HomeHeroClean.astro` — 22 violations
Primary patterns: rgba hero overlays, gradient backgrounds.
Note: this component is **unused** (0 imports) — delete rather than fix.

#### `src/components/BreedMatchQuiz.astro` — 3 violations
Primary patterns: selection state colors, button backgrounds.
Replace with design token vars.

#### `src/components/breed/BreedImage.astro` — 7 violations
Primary patterns: gallery overlay backgrounds.
Replace with token opacity variants.

#### `src/components/Newsletter.astro` — 4 violations
Primary patterns: rgba border accents.
Replace with token opacity variants.

#### `src/components/ComparisonTable.astro` — 4 violations
Primary patterns: `rgba(255,255,255,0.12)`, `rgba(204,255,0,0.3)` — the lime accent at opacity.
Add `--color-lime-opacity-30` token or use `color-mix()`.

#### `src/pages/404.astro` — 2 violations
`color: #fff` in button style.
Replace with `var(--color-text-on-dark)` or `var(--color-bg)`.

#### `src/pages/contact.astro` — 9 violations
Primary patterns: `rgba(255, 250, 243, 0.98)` warm white overlay.
Replace with `var(--color-surface-warm-98)` token.

#### `src/pages/privacy.astro` — 11 violations
Same warm white pattern. Replace with token.

---

## Section 4 — Known Legacy CSS File Issues

### `src/styles/names.css` (2,331 lines)
- 20 hardcoded colors
- `<style>` block flag from audit
- Very large single file — consider splitting into `src/styles/domains/names/` subdirectory

### `src/styles/domains/breeds/breed-detail.css` (2,196 lines)
- 4 hardcoded colors
- Highest layout CSS volume (658 lines flagged)
- Candidate for partial split

### `src/styles/components/breed-page.css` (1,943 lines)
- 4 hardcoded colors
- High layout CSS volume

---

## Recommended Fix Order

1. **tokens.css** — Add opacity variant tokens first (unblocks all other fixes)
2. **monetization.css** — Move Amazon cluster to tokens
3. **main.css** — 2 link decoration rgba → tokens (2-line fix)
4. **cost-calculator pages** — Extract style blocks → cost-calculator.css + replace rgba → tokens
5. **home.css** — 25 violations → tokens
6. **category-hub.css** — 18 violations → tokens
7. **names.css** — 20 violations → tokens
8. **article.css**, **awin-offers.css**, **breed-directory.css** — batch pass

Total estimated CSS tokens to add to `tokens.css`: ~20 new properties.
