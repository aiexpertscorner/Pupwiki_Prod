import { defineCollection, z } from 'astro:content';

const guides = defineCollection({
  type: 'content',
  schema: z.object({
    // Core
    title:         z.string(),
    description:   z.string(),
    pubDate:       z.coerce.date(),
    updatedDate:   z.coerce.date().optional(),
    author:        z.string().default('The PupWiki Team'),

    // Classification
    category:      z.string().default('Reviews'),
    tags:          z.array(z.string()).default([]),

    // Cluster type
    postType:      z.enum(['product-roundup','comparison','breed-hub','how-to','health','ranking','cost-calculator','general']).default('general'),

    // Breed context
    breedSlug:     z.string().optional(),
    breedName:     z.string().optional(),
    breedSize:     z.string().optional(),
    breedEnergy:   z.string().optional(),
    breedCoat:     z.string().optional(),

    // SEO / media
    seoTitle:      z.string().optional(),
    displayTitle:  z.string().optional(),
    titlePattern:  z.string().optional(),
    heroImage:     z.string().optional(),
    image:         z.string().optional(),
    heroImageAlt:  z.string().optional(),
    readTime:      z.number().optional(),
    noIndex:       z.boolean().default(false),
    noRoute:       z.boolean().default(false),

    // Sidebar product widget
    topProduct:    z.object({
      name:    z.string(),
      asin:    z.string(),
      price:   z.number().optional(),
      rating:  z.number().optional(),
      image:   z.string().optional(),
    }).optional(),

    // Schema hint for GuidesLayout
    schemaType:    z.enum(['Article','FAQPage','HowTo','Review']).default('Article'),

    // Content rework: editorial classification (all optional — existing posts unaffected)
    contentTier:         z.enum(['editorial','money','support','generated-support','enrichment']).optional(),
    indexInGuides:       z.boolean().optional(),
    generated:           z.boolean().optional(),
    reviewMethod:        z.enum(['editorial-research','product-data-comparison','hands-on-test','expert-reviewed']).optional(),
    claimSensitivity:    z.enum(['low','medium','high']).optional(),
    monetizationIntent:  z.enum(['none','insurance','food','dna','training','grooming','vet-care','gift','cost','service']).optional(),
    qualityScore:        z.number().optional(),
    uniqueBlocks:        z.array(z.string()).default([]),
    wordCountEstimate:   z.number().optional(),
    medicalDisclaimer:   z.boolean().default(false),
    affiliateDisclosure: z.boolean().default(true),
  }),
});

export const collections = { guides };
