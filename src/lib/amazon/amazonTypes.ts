export type AmazonComplianceRisk = 'low' | 'medium' | 'high' | 'unknown';

export type AmazonSalesIntent = 'high' | 'medium' | 'low' | string;

export type AmazonProductRecord = {
  id: string;
  enabled: boolean;
  priorityScore?: number | null;
  liveSearchStatus?: string;
  liveSearchNote?: string;
  salesIntent?: AmazonSalesIntent;
  categoryGroup?: string;
  categoryLabel?: string;
  name: string;
  brand?: string;
  amazonSearchQuery?: string;
  asin?: string;
  amazonAffiliateUrl: string;
  recommendedPlacement?: string;
  topicTags?: string[];
  targetPageSlugs?: string[];
  complianceRisk?: AmazonComplianceRisk | string;
  complianceNotes?: string;
  source?: string;
  hasAffiliateUrl?: boolean;
  isLiveEligible?: boolean;
};

export type AmazonPageType =
  | 'homepage'
  | 'category'
  | 'breed'
  | 'guide'
  | 'tool'
  | 'resource';

export type AmazonPlacementContext = {
  pageType?: AmazonPageType | string;
  pageSlug?: string;
  category?: string;
  topicTags?: string[];
  breedSize?: string;
  breedEnergy?: string;
  breedCoat?: string;
  breedLifeStage?: string;
  excludeProductIds?: string[];
  limit?: number;
  allowMediumRisk?: boolean;
  allowHighRisk?: boolean;
};
