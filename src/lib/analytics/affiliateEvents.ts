export type AffiliateEventPayload = {
  placementId?: string;
  placementType?: string;
  merchant?: string;
  productId?: string;
  creativeId?: string;
  pageType?: string;
  category?: string;
  route?: string;
};

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === 'undefined') return null;
  const g = (window as unknown as Record<string, unknown>).gtag;
  return typeof g === 'function' ? (g as GtagFn) : null;
}

function pushDataLayer(event: string, payload: AffiliateEventPayload): void {
  if (typeof window === 'undefined') return;
  const dl = (window as unknown as Record<string, unknown>).dataLayer;
  if (Array.isArray(dl)) {
    (dl as unknown[]).push({ event, ...payload });
  }
}

export function trackAffiliateClick(payload: AffiliateEventPayload): void {
  try {
    const gtag = getGtag();
    if (gtag) {
      gtag('event', 'affiliate_click', {
        event_category: 'affiliate',
        placement_id: payload.placementId || '',
        placement_type: payload.placementType || '',
        merchant: payload.merchant || '',
        product_id: payload.productId || '',
        creative_id: payload.creativeId || '',
        page_type: payload.pageType || '',
        category: payload.category || '',
        route: payload.route || '',
      });
    }
    pushDataLayer('affiliate_click', payload);
  } catch {
    // Analytics must never break navigation.
  }
}

export function trackAffiliateImpression(payload: AffiliateEventPayload): void {
  try {
    const gtag = getGtag();
    if (gtag) {
      gtag('event', 'affiliate_impression', {
        event_category: 'affiliate',
        placement_id: payload.placementId || '',
        placement_type: payload.placementType || '',
        merchant: payload.merchant || '',
        product_id: payload.productId || '',
        creative_id: payload.creativeId || '',
        page_type: payload.pageType || '',
        category: payload.category || '',
        route: payload.route || '',
      });
    }
    pushDataLayer('affiliate_impression', payload);
  } catch {
    // Analytics must never break navigation.
  }
}

export function initCommerceClickTracking(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>(
      'a[data-affiliate-merchant], a[data-affiliate="awin"]'
    );
    if (!link) return;

    trackAffiliateClick({
      merchant: link.dataset.affiliateMerchant || link.dataset.merchant || '',
      productId: link.dataset.affiliateProduct || link.dataset.productId || '',
      placementId: link.dataset.affiliatePlacement || link.dataset.commercePlacement || '',
      placementType: link.dataset.affiliatePlacement ? 'awin' : 'commerce',
      pageType: link.dataset.pageType || '',
      category: link.dataset.category || '',
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  });
}
