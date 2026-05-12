# PupWiki Backlog

Living backlog for tracking features, fixes, and ideas. Check off items as they ship. Add new items to the relevant section. Move completed work to **Done** with the date.

---

## Done

- [x] Full homepage visual rework — HomeHeroClean, HomeBreedDiscovery, HomeAwinShowcase, HomeTrustStrip (May 2026)
- [x] AWIN showcase component — dynamic carousel, full `awin-program-config.json`, fixed 0-product sync bug (May 2026)
- [x] Amazon pipeline overhaul — rewrote `matchAmazonProducts.ts`, added `amazonDeeplink.ts` (May 2026)
- [x] Internal routing audit + broken link fixes (May 2026)
- [x] Cloudflare CI/CD stabilization — soft-fail AWIN sync, `set -e` repair, deployment gap fix (May 2026)
- [x] pSEO content generation pipeline — `generate-pseo.yml` CI workflow (mode=all, limit=1000) (May 2026)
- [x] AWIN + Amazon dual-pipeline affiliate strategy (2025–2026)
- [x] Breed cluster model — 10 content types per breed, `breed-link-map.json`, `content-status.json` (2025)
- [x] Cost calculator with geo + age factors — `StateAgeSelector.astro`, actuarial data (2025)
- [x] Dog names pages — `NameLayout.astro`, `dog-names.json`, per-breed generator (2025)
- [x] Content collections — 1,415 blog posts, schema validation (2025)

---

## Now — Active / Next Sprint

- [ ] Fix hardcoded `#a0621c` in `src/components/content/ProductGrid.astro:166` → `var(--color-accent)`
- [ ] Fix inline hex palette in `src/components/ProductReviewCard.astro` → CSS token vars
- [ ] Pet insurance hub (`/pet-insurance/index.astro`) — add proper content, FAQPage schema, cross-links to cost calculator
- [ ] Mixed breeds route (`/mixed-breeds/[breed]`) — 75 breeds in `master-crossbreeds.json` have no pages yet; model after `/breeds/[breed]`
- [ ] Breed quiz refinement (`/breed-quiz.astro`) — improve result scoring + UX

---

## Up Next — Planned

### Content
- [ ] Blog author pages — `/authors/[slug]` route, author bio JSON, link from blog posts
- [ ] Expand pSEO coverage — work through remaining `pseo-opportunity-backlog.json` candidates
- [ ] Crown & Paw custom portrait upsell — inline CTA on breed profile pages

### Features
- [ ] Breed comparison tool — side-by-side 2-breed comparison page, built from `master-breeds.json` data
- [ ] Interactive dog names filter — filter by trait, size, style on `/dog-names/[breed]` pages
- [ ] Health cost estimator multi-year projection — extend cost calculator to show 1/3/5/10 year totals
- [ ] Mobile search overlay — `/breed-quiz.astro` + search bar connected to breed index

### SEO / Technical
- [ ] Structured data audit — check `Article`, `ItemList`, `BreadcrumbList`, `FAQPage` schemas on all page types
- [ ] Core Web Vitals pass — LCP, CLS, INP check on breed + blog pages
- [ ] RSS feed improvements — currently minimal; add full post content, categories

---

## Ideas / Nice to Have

- [ ] Dark mode toggle for full site — token system supports it; needs UI toggle + preference storage
- [ ] User-saved breeds — browser localStorage "My Shortlist" widget
- [ ] Newsletter integration — connect `HomeLeadCapture.astro` to an ESP
- [ ] YouTube embed integration — training guides with video embeds in blog posts
- [ ] Breed popularity trends chart — visualize AKC ranking data from `master-breeds.json`
- [ ] "Ask PupWiki" chatbot — Claude API integration for breed Q&A

---

## Notes

- `master-crossbreeds.json` (75 breeds) is fully enriched but has **no route pages** — highest-ROI unshipped feature
- `pseo-opportunity-backlog.json` contains 1.3 MB of candidate pages — run `npm run content:generate:pseo` to generate batches
- Chewy affiliate infrastructure exists (`chewy-taxonomy.json`, `ENABLE_CHEWY` flag) but is disabled — re-enable only if Chewy affiliate terms improve
- `internal-link-opportunities.json` (326 KB) has crosslink suggestions that aren't fully implemented yet
