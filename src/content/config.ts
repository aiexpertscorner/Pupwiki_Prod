import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
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
    heroImageAlt:  z.string().optional(),
    readTime:      z.number().optional(),
    noIndex:       z.boolean().default(false),

    // Sidebar product widget
    topProduct:    z.object({
      name:    z.string(),
      asin:    z.string(),
      price:   z.number().optional(),
      rating:  z.number().optional(),
      image:   z.string().optional(),
    }).optional(),

    // Schema hint for BlogLayout
    schemaType:    z.enum(['Article','FAQPage','HowTo','Review']).default('Article'),

    // Content rework: editorial classification (all optional — existing posts unaffected)
    contentTier:         z.enum(['editorial','money','support','generated-support','enrichment']).optional(),
    indexInBlog:         z.boolean().optional(),
    generated:           z.boolean().optional(),
    reviewMethod:        z.enum(['editorial-research','product-data-comparison','hands-on-test','expert-reviewed']).optional(),
    claimSensitivity:    z.enum(['low','medium','high']).optional(),
    monetizationIntent:  z.enum(['none','insurance','food','dna','training','grooming','vet-care','gift','cost','service']).optional(),
    qualityScore:        z.number().optional(),
    uniqueBlocks:        z.array(z.string()).default([]),
    wordCountEstimate:   z.number().optional(),
    medicalDisclaimer:   z.boolean().default(false),
    affiliateDisclosure: z.boolean().default(true),
  }).superRefine((data, ctx) => {
    if (!data.generated) return;
    if (data.qualityScore !== undefined && data.qualityScore < 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Generated post qualityScore ${data.qualityScore} is below minimum threshold of 40`,
        path: ['qualityScore'],
      });
    }
    if (data.wordCountEstimate !== undefined && data.wordCountEstimate < 600) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Generated post wordCountEstimate ${data.wordCountEstimate} is below the 600-word minimum`,
        path: ['wordCountEstimate'],
      });
    }
  }),
});

export const collections = { blog };
