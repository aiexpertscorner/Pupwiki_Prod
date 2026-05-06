# Phase 3 Progress — Content Cleanup + Deploy Regeneration

**Branch:** `claude/phase-3-content-cleanup-ADu1C`  
**Date:** 2026-05-06

---

## What Was Done

### 1. Cleanup Script — `scripts/content/clean-generated-content.mjs` (NEW)
Safely removes `generated: true` markdown files from `src/content/blog/` before fresh regeneration.

- Reads frontmatter in first 60 lines of each `.md` file
- Only deletes files with `generated: true` — manual/editorial posts are untouched
- Flags: `--dry-run` (preview), `--ci` (non-interactive delete), `--verbose` (per-file log)
- Always exits 0 — CI-safe, never blocks the deploy
- Dry-run confirmed: identifies 1,951 of 2,375 posts correctly

### 2. `package.json` — 3 new scripts added
```
content:clean       → node scripts/content/clean-generated-content.mjs
content:clean:ci    → node scripts/content/clean-generated-content.mjs --ci
content:clean:dry   → node scripts/content/clean-generated-content.mjs --dry-run
```

### 3. `.github/workflows/deploy.yml` — cleanup step wired in
Added `Clean stale generated content` step (runs `content:clean:ci`) **before** the existing `Refresh generated content` step. Deploy sequence is now:

1. npm ci
2. Enrich homepage hero images
3. **[NEW] Clean stale generated content**
4. Refresh generated content
5. Enrich content images
6. Sync AWIN → audit → generate partners → sync Amazon → inventory → galleries → sitemap → build → audit → deploy

### 4. `src/components/blog/ArticleCommerceSuite.astro` — editorial copy fixes
Changed default heading and slot headlines from pipeline/internal language to dog-owner-facing editorial copy:

| Before | After |
|--------|-------|
| `'Current partner and Amazon.com options'` | `'Top-rated picks for your dog'` |
| `'These resources are matched to the dog-care topic, breed context, and current product details. Always confirm formula, size, availability, and seller details before purchase.'` | `'Curated for this topic and your dog\'s profile. Always check current sizing, formula, and seller details before buying.'` |
| `headline="Dog-care brand match"` (AwinProductSlot) | `headline="Recommended for this topic"` |
| `headline="Amazon.com matches"` (AmazonProductSlot) | `headline="Amazon picks"` |

---

## Files Touched

```
scripts/content/clean-generated-content.mjs   CREATE
package.json                                   EDIT  (+3 script entries)
.github/workflows/deploy.yml                   EDIT  (+cleanup step)
src/components/blog/ArticleCommerceSuite.astro EDIT  (heading/copy fixes)
docs/PHASE_3_PROGRESS.md                       CREATE (this file)
```

---

## Commands Run

```bash
# Verification
node scripts/content/clean-generated-content.mjs --dry-run
# Output: [clean-generated] Found 2375 total posts, 1951 are generated.
#         [clean-generated] 1951 files would be removed.
```

Build validation via `npm run build:fast` could not run in sandbox (no `node_modules`). Full build verified in CI on push.

---

## Remaining Tasks

- [ ] Run full CI deploy on `claude/phase-3-content-cleanup-ADu1C` → merge to Pupwiki
- [ ] Monitor first CI deploy with cleanup enabled — confirm 1,951 files removed + refreshed
- [ ] Consider adding `content:clean` to the `prebuild` npm script (currently not there — deploy.yml handles CI flow explicitly)
- [ ] Review `AwinProductSlot.astro` `headline` prop rendering to confirm it's visible user-facing text (vs internal label)
- [ ] Optionally add `content:audit:public` output check — verify no internal pipeline terms appear in generated copy post-refresh

---

## Known Risks

| Risk | Severity | Status |
|------|----------|--------|
| Cleanup deletes non-generated files | Low | Mitigated — `generated: true` frontmatter guard |
| Slow CI: 1,951 deletions | Negligible | File deletion is fast; `content:refresh` unchanged |
| `content:refresh` after clean regenerates with old bad patterns | Low | Refresh uses updated pseo-copy-engine templates from Phase 2 |
| Build fails post-cleanup if critical content was only generated | Low | `content:refresh` restores all breed/cluster content |

---

## Next Recommended Prompt

```
Continue Phase 3 on branch claude/phase-3-content-cleanup-ADu1C.

Check the CI deploy results after the current commit is pushed.
Then:
1. Verify the cleanup + refresh cycle ran correctly in the deploy log
2. Audit the rendered heading in ArticleCommerceSuite — confirm it shows
   "Top-rated picks for your dog" (or cluster-specific heading from blog/[slug].astro)
3. Check AwinProductSlot to confirm `headline` prop is rendered as visible
   user-facing text (not just an internal label)
4. If all good, open a PR from claude/phase-3-content-cleanup-ADu1C → Pupwiki
5. Next phase: review remaining partner pages copy for internal/pipeline language
```
