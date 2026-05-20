# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Last Session (May 2026)

Recent completed work — context for the next session:

- **PR #110** — Amazon pipeline overhaul
- **PR #109** — AWIN showcase, dynamic carousel, 0-product sync bug fixed
- **PR #108** — Full homepage visual rework
- **PRs #105–107** — Cloudflare CI/CD stabilization
- **Platform pipeline rework (current branch):**
  - `deploy-production.yml` — single deterministic deploy, concurrency, no mutations
  - `deploy.yml` + `deploy-scheduled.yml` — disabled (superseded)
  - `generate-pseo.yml` — reduced to weekly Sunday schedule
  - `sync-awin.mjs` — gzip decode, normalizeProductRows, parseProductFeedText, drop counters
  - `audit-awin.mjs` — strict failure when feed rows > 0 but feed products = 0
  - `amazonTextLinks.ts` + `AmazonTextLinks.astro` — contextual text links for authority content
  - `AmazonProductCard.astro` — star/review rendering removed (PA API required)
  - `ProductCard.astro` — inline hex palette → token vars

**Currently known tech debt to address next:**
- No critical design token violations remaining in components
- `src/styles/names.css` has 23 hardcoded colors (low risk, CSS file)
- `src/pages/cost-calculator/[breed].astro` has 27 hardcoded colors (medium priority)

---

## Build and Dev Commands

```bash
npm run dev              # Start Astro dev server
npm run build            # Production build → dist/ (triggers full prebuild chain)
npm run preview          # Preview the production build locally
npm run sitemap:generate # Regenerate public/sitemap.xml after adding pages/breeds
```

There are no lint or test scripts. The build (`astro build`) is the primary validation step.

**CI validate + build** — production deploy runs these two commands in sequence:
```bash
npm run validate:ci   # content:normalize:check + content:refresh:check + partners:check + content:audit:public:ci + amazon:links:audit
npm run build:ci      # sitemap:generate + astro build (no external API calls, no mutations)
```

The old `prebuild` hook that ran AWIN/Pexels/images/pSEO on every `npm run build` has been removed. Enrichment now runs only in dedicated scheduled workflows.

**Main npm script groups** (60+ total scripts in `package.json`):
- `npm run awin:sync` / `awin:audit` — sync & validate AWIN products + programs
- `npm run content:refresh` / `content:clean` / `content:normalize` — pSEO content lifecycle
- `npm run content:generate:pseo` — generate new pSEO pages from backlog
- `npm run images:enrich` / `images:hero` / `images:content` — image enrichment pipeline
- `npm run analytics:audit` — Cloudflare + GA4 traffic analysis
- `npm run design:audit:inline` — scan for inline CSS violations

---

## Architecture

Fully static Astro 4 site deployed to Cloudflare Pages via GitHub Actions (`.github/workflows/deploy.yml`). All pages statically generated at build time via `getStaticPaths()`.

**Page routes and data sources:**

| Route | Data Source |
|---|---|
| `/breeds/[breed]` | `master-breeds.json` + `product-index.json` + `breed-link-map.json` + `content-status.json` |
| `/blog/[slug]` | Astro content collections at `src/content/blog/` (1,415 Markdown files) |
| `/categories/[category]` | Dynamic + 4 static pages: `insurance`, `puppy`, `senior-dogs`, `pupwiki-partners` |
| `/dog-names/[breed]` | `dog-names.json` + `master-breeds.json` |
| `/cost-calculator/[breed]` | `master-breeds.json` + actuarial JSON files |
| `/brands/[brand]` | `brands.json` |
| `/guides/first-dog` | Static page |
| `/pet-insurance` | Static hub page |

**Data layer (`src/data/`):**

Core breed + content:
- `master-breeds.json` (1.6 MB) — canonical breed records (slug, traits, size, temperament, AKC/FCI, `product_picks`)
- `master-crossbreeds.json` (921 KB) — crossbreed data (no route pages yet — see BACKLOG.md)
- `breed-link-map.json` — maps breed slug → all cluster page URLs
- `content-status.json` — boolean flags for what cluster content exists per breed
- `dog-names.json` (919 KB) — master names database

Products + affiliate:
- `product-index.json` — flat keyed map (id, ASIN, price, rating, image URL)
- `products.json` — products by category array
- `amazon-products.json` — Amazon product data
- `awin-products.json`, `awin-programs.json`, `awin-program-config.json` — AWIN data layer
- `affiliate-links.ts` — hardcoded AWIN tidd.ly deeplinks with performance data
- `affiliate-banners.json`, `affiliate-offers.json` — banner + offer configs

Homepage + config:
- `homepage-config.json` — homepage hero + section config (edit here to change homepage layout)
- `content-inventory-summary.json` — content stats per breed

SEO + pSEO:
- `pseo-opportunity-backlog.json` (1.3 MB) — candidate pSEO pages
- `internal-link-opportunities.json` (326 KB) — crosslink suggestions
- `routing-audit.json` (233 KB) — URL structure audit results

Insurance + geo:
- `us-states-insurance-index.json` — 50 states + DC, multipliers 0.84 (MS) → 1.38 (NY)
- `actuarial-breed-rates.json` — 35+ breed base monthly premiums
- `actuarial-age-factors.json` — 16 age buckets, 0.77× (puppy) → 3.53× (geriatric)

Supporting reference:
- `brands.json`, `category-taxonomy.json`, `cluster-definitions.json`

**Content collections (`src/content/blog/`):**

1,415 Markdown posts. Schema defined in `src/content/config.ts`. Required: `title`, `description`, `pubDate`. Optional: `updatedDate`, `image`, `category`, `tags`, `author`, `breedSlug`, `breedName`, `topProduct` (with `asin`).

**Layouts (`src/layouts/`):**

- `BaseLayout.astro` — root layout: `<head>`, OG/Twitter meta, Schema.org WebSite JSON-LD, GA4, single `main.css` import
- `BlogLayout.astro` — extends BaseLayout; adds article hero, affiliate disclosure, two-column article + sidebar
- `NameLayout.astro` — specialized layout for dog names pages

**Components (`src/components/`):**

92+ components organized across 12 subdirectories:

| Directory | Purpose |
|---|---|
| `ui/` | **Canonical** Header + Footer — these are what all layouts import |
| `primitives/` | PageHero, Breadcrumb, ComparisonPanel, ResourceGrid |
| `breed/` | BreedStats, BreedImage, BreedCommerceSuite, ClusterLinks |
| `home/` | HomeHeroClean, HomeBreedDiscovery, HomeAwinShowcase, HomeTrustStrip |
| `affiliate/` | AWIN + Amazon CTA integration components |
| `amazon/` | AmazonProductSlot, AmazonProductCard |
| `blog/` | BlogCard, ArticleCommerceSuite, BlogTopicCard |
| `category/` | CategoryHero, CategoryArticleGrid, CategoryBreedGuides |
| `content/` | ProductGrid, reusable content cards |
| `names/` | NameGenerator, NameGrid, BreedNameDirectory |
| `enrichment/` | BreedCareProfile |
| `monetization/` | LeadgenCard, OfferSlot |

> **Note:** `src/components/Header.astro` and `src/components/Footer.astro` at root level are **unused legacy files** — all layouts import from `src/components/ui/`. Do not reference or restore them.

**Styling (`src/styles/`):**

20 CSS files in a layered import system. `main.css` is the entry point:
1. `tokens.css` — all CSS custom properties (150+ variables)
2. `base.css` — global reset + typography
3. `layout.css`, `grid.css` — structural layout
4. `components.css`, `nav.css`, `buttons.css`, `cards.css` — UI components
5. `hero.css`, `home.css`, `blog.css` — page/section features
6. `breed-page.css`, `breed-directory.css` — breed routes
7. `names.css` (25 KB) — dog names pages
8. `article.css`, `category-hub.css` — content pages
9. `monetization.css`, `affiliate.css`, `amazon-affiliate.css`, `products.css` — commerce
10. `misc.css` — utilities

**Tailwind** (`tailwind.config.mjs`) is also active alongside the custom CSS.

---

## Key Conventions

**Affiliate links:** Amazon tag `aiexpertscorn-20` is in `src/data/affiliate-links.ts` as `AMAZON_TAG`. Use `amzUrl(asin)` to build product links.

**Breed cluster model:** Each breed has a "cluster" of up to 10 content types (food, toys, beds, grooming, training, supplements, names, health, cost calculator, hub page). `breed-link-map.json` stores URLs; `content-status.json` stores booleans for what exists.

**Static paths pattern:** All dynamic routes use `getStaticPaths()` mapping over JSON data. Example: `masterBreeds.map(b => ({ params: { breed: b.slug } }))`.

**Sitemap:** Built-in `@astrojs/sitemap` is disabled. Sitemap generated via `npm run sitemap:generate` (5 files: sitemap-index, breeds, categories, blog, main).

**No framework JS:** No client-side JS framework. Interactivity uses vanilla JS in `<script>` tags within `.astro` files or `public/scripts/`.

**Environment variables:**
- `PUBLIC_GA_MEASUREMENT_ID` — enables GA4
- `PUBLIC_AMAZON_TAG` — Amazon affiliate tag (falls back to hardcoded value)

---

## Design System Rules

**CRITICAL: Always use CSS token variables. Never hardcode hex values.**

**Brand colors:**
- Primary: Navy `#15365f` → `var(--color-primary)`
- Accent / CTA: Orange `#ff7a00` → `var(--color-accent)` / `var(--color-cta)`
- Dark mode palette: Midnight `#0A0A0A` → `midnight` (Tailwind) / `var(--color-dark-bg)`, Lime `#CCFF00` → `lime` (Tailwind) / `var(--color-lime)`

**Typography:**
- Display headings: Anton, Archivo Black → Tailwind `font-display`, `font-heading`
- Body text: Barlow Condensed → Tailwind `font-body`
- Mono: Space Mono → Tailwind `font-mono`
- Serif / prose: Source Serif 4 → Tailwind `font-serif`

**Dark mode:** The `midnight`/`lime` palette is **active** for streetwear-aesthetic sections (not empty). Use `midnight`, `concrete`, `lime`, `ash`, `offwhite` Tailwind classes for dark UI sections.

**Current token violation hotspots to fix:**

| File | Issue |
|---|---|
| `src/components/content/ProductGrid.astro:166` | `color:#a0621c` → `var(--color-accent)` |
| `src/components/ProductReviewCard.astro` | Multiple inline `#CCFF00`, `#222`, `#0A0A0A`, `#F0F0F0` → use token vars |

**When writing new component styles:**
- Colors: only `var(--color-*)` tokens or named Tailwind classes from the config
- Spacing: prefer `var(--space-*)` tokens
- Typography: prefer `var(--text-*)` and `var(--font-*)` tokens
- Shadows: `var(--shadow-*)` tokens or Tailwind `shadow-hard`, `shadow-glow-lime`
- Never reference `bark-*` Tailwind classes (removed)

---

## Scripts Reference

Scripts live in `scripts/` subdirectories. Run with `node scripts/<path>.mjs` or via npm scripts.

**`scripts/content/`** — pSEO content lifecycle:
- `generate-pseo-opportunity-pages.mjs` — generate pages from backlog
- `generate-awin-partner-pages.mjs` — partner landing pages
- `refresh-generated-posts.mjs`, `clean-generated-content.mjs` — content maintenance
- `normalize-generated-frontmatter.mjs` — fix frontmatter issues
- `audit-pseo-copy.mjs`, `audit-public-copy.mjs`, `audit-claims.mjs` — quality checks
- `sync-content-status.mjs`, `audit-content-inventory.mjs` — status tracking

**`scripts/lib/`** — shared utilities:
- `breed-profile.mjs`, `seo-builder.mjs`, `pseo-copy-engine.mjs`, `pexels.mjs`

**`scripts/analytics/`** — traffic analysis:
- `audit-traffic.mjs` — combined Cloudflare + GA4 audit

**Root `scripts/`** — enrichment + data:
- `enrich-breed-images.mjs`, `enrich-breed-image-gallery.mjs` — Pexels + Dog CEO image fetch
- `enrich-products.mjs`, `validate-products.mjs` — product data pipeline
- `sync-awin.mjs` (39 KB) — bidirectional AWIN product/program sync
- `discover-products.mjs`, `populate-product-images.mjs` — product discovery
- `import-brand-logos.mjs`, `download-brand-logos.mjs` — brand assets

---

## AWIN-First CTA Policy

**Priority order for product CTAs:**
1. **AWIN partners (primary):** JugBow, ChefPaw, Raw Wild, Crown & Paw — always prefer tidd.ly deeplinks
2. **Amazon (secondary):** use for product roundups where no AWIN match exists
3. **Chewy:** disabled as primary CTA (`ENABLE_CHEWY = false` in `src/lib/site-config.ts`)

**Active AWIN partners (from `src/data/affiliate-links.ts`):**

| Partner | Deeplink | EPC | Conv Rate | Cookie |
|---|---|---|---|---|
| JugBow | `https://tidd.ly/3QryFd6` | $0.23 | 4.74% | 30 days |
| ChefPaw | `https://tidd.ly/41TPa44` | $2.26 | 6.96% | 30 days |
| Raw Wild | `https://tidd.ly/4e36ta9` | $1.91 | — | 120 days |
| Crown & Paw | `https://tidd.ly/496jo7K` | — | 8.35% | 60 days |

**Amazon badge compliance:** Use the badge image for Amazon CTAs:
```
[![Available at Amazon](/images/amazon/available-at-amazon.png)](https://www.amazon.com/dp/ASIN/?tag=aiexpertscorn-20){rel="nofollow sponsored"}
```
Never use the Amazon badge image for AWIN / non-Amazon links.

**AWIN link format:**
```
[Link text](https://tidd.ly/XXXXX){rel="nofollow sponsored"}
```

**Disclosure:** Every page with affiliate CTAs must include a disclosure line. The `AffiliateDisclosure.astro` component handles this in layouts.

---

## Geo Feature Standards

**Available geo datasets (`src/data/`):**
- `us-states-insurance-index.json` — 50 states + DC, multipliers 0.84 (MS) → 1.38 (NY)
- `actuarial-breed-rates.json` — 35+ breed-specific base monthly premiums; size-based fallback
- `actuarial-age-factors.json` — 16 age buckets, 0.77× (puppy) → 3.53× (geriatric)
- `dog-breeds-by-country-2025.csv` — breed counts by country of origin
- `origin_country` field in `master-breeds.json` — exposed via breed page badge + filter

**State selector:** `StateAgeSelector.astro` handles 50-state dropdown + age bucket selector. Emits `stateChange` and `ageChange` DOM events. Cost calculator pages embed this and recalculate using vanilla JS.

**Default state:** Always default to `CA` (California) when no state is selected, with a visible "Showing costs for: California" label.

---

## Page Template Standards

Every page template MUST include:

1. **BreadcrumbList** — `Home → Section → Page` on every page (JSON-LD schema + visible UI)
2. **Related content strip** — min 3 links at the bottom of every content page
3. **Cross-links** — breed page ↔ cost calc ↔ dog names ↔ relevant blog posts
4. **Affiliate disclosure** — visible disclosure on any page with affiliate CTAs
5. **Meta description** — every page must have a unique `description` in frontmatter or passed to BaseLayout

**Cross-link pattern (breed cluster):**
- Breed page → cost calculator, dog names, relevant health/food/training posts
- Cost calculator → breed page, health profile, supplement recommendations
- Dog names page → breed page, cost calculator

**Schema requirements by page type:**
- Blog post: `Article` with `datePublished`, `dateModified`, `author`
- Breed page: `ItemList` + `BreadcrumbList`
- Cost calculator: `FAQPage` + `BreadcrumbList`
- All pages: `BreadcrumbList`

**Mobile-first:** All new components must be single-column at `< 768px`. Sidebar content stacks below main content at `< 1024px`. Test at 375px viewport.
