import normalizedProductsRaw from '../../data/awin-products.normalized.json';
import type { CommerceContext, NormalizedAwinProduct, ScoredCommerceProduct } from './types';
import { scoreProduct } from './productScoring';
import { getPlacementRule } from './placementRules';
import { normalizeText } from './productTaxonomy';

const normalizedProducts = normalizedProductsRaw as NormalizedAwinProduct[];

export interface GetCommerceProductsOptions {
  context: CommerceContext;
  limit?: number;
}

function enforceMerchantDiversity(
  products: ScoredCommerceProduct[],
  maxPerMerchant: number,
): ScoredCommerceProduct[] {
  const counts = new Map<string, number>();
  const selected: ScoredCommerceProduct[] = [];

  for (const product of products) {
    const key = normalizeText(product.merchant || 'unknown');
    const count = counts.get(key) || 0;
    if (count >= maxPerMerchant) continue;
    counts.set(key, count + 1);
    selected.push(product);
  }

  return selected;
}

export function getCommerceProducts(options: GetCommerceProductsOptions): ScoredCommerceProduct[] {
  const { context } = options;
  const rule = getPlacementRule(context.placement);
  const limit = options.limit ?? rule?.defaultLimit ?? 4;
  const maxPerMerchant = rule?.maxPerMerchant ?? 1;

  const merchantCounts = new Map<string, number>();
  const scored = normalizedProducts
    .map((product) => scoreProduct(product, context, merchantCounts))
    .filter((product) => product.score > 0)
    .sort((a, b) => b.score - a.score);

  const diversified = enforceMerchantDiversity(scored, maxPerMerchant);
  return diversified.slice(0, limit);
}
