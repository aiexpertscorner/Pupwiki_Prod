# Pupwiki Branch Updated

This file marks the update of the Pupwiki production branch to include all latest improvements from May 6, 2026.

## Latest Updates Integrated

1. **feat(amazon)**: Wire smart commerce pipeline end-to-end (May 6 @23:14)
   - resolveAmazonCTAs / getAmazonPageIntent / isCommerceAllowed now fully wired
   - Complete rewrite of affiliate/AmazonProductSlot.astro
   - Amazon badge compliance updates

2. **fix(phase-3)**: Enable affiliate pipeline, commerce gates, PSEO generation (May 6 @22:49)
   - Affiliate offers enabled: pet-insurance, dna-test, online-vet, fresh-food
   - Affiliate banners enabled: crownandpaw, chefpaw, jugbow
   - Blog commerce gate extended to include 'comparison' postType
   - PSEO cluster page generation added to deploy pipeline

3. **feat(phase-3)**: Add safe generated-content cleanup to deploy pipeline (May 6 @21:40)
   - Clean-generated-content.mjs script: deletes files with `generated: true` frontmatter
   - Supports --dry-run, --ci, --verbose flags
   - ArticleCommerceSuite editorial copy fixes

4. **feat(commerce)**: Phase 2 Amazon Link Engine + compliance fixes (May 6 @01:53)
   - Fix Amazon associate tag fallback: 'pupwiki-20' → 'aiexpertscorn-20'
   - Add src/lib/commerce/amazon/ module with full intent-based routing
   - Partner posts now generate pages with noRoute:true for internal-only clusters

5. **Analytics & Traffic Tooling** (May 6 @02:21)
   - Add traffic analytics npm scripts
   - Add traffic analytics audit script

## Branch Status

✅ Production-ready with all improvements integrated
✅ Based on main branch HEAD: 86b364eab8bfdf39c19cffe88ecfbb12754964ab
✅ All commerce, affiliate, and content pipeline fixes included
