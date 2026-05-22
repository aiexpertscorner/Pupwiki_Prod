export function initCommerceClickTracking(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>('a[data-affiliate="awin"]');
    if (!link) return;

    const gtag = (window as unknown as Record<string, unknown>).gtag;
    if (typeof gtag !== 'function') return;

    try {
      gtag('event', 'affiliate_product_click', {
        event_category: 'affiliate',
        event_label: link.dataset.productName || link.textContent?.trim() || 'AWIN product',
        affiliate_network: 'awin',
        merchant: link.dataset.merchant || '',
        program_id: link.dataset.programId || '',
        product_id: link.dataset.productId || '',
        placement: link.dataset.commercePlacement || '',
        page_type: link.dataset.pageType || '',
        position: link.dataset.position || '',
      });
    } catch {
      // Analytics must never break navigation.
    }
  });
}
