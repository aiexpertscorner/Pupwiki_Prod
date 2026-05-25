/**
 * src/lib/faq/breedFaqSchema.ts
 *
 * Builds FAQPage JSON-LD schema from ONLY the items rendered on the page.
 * Never generate FAQ schema for items not visible in the DOM.
 */

export function buildFaqPageSchema(
  renderedItems: { q: string; a: string }[],
  pageUrl?: string,
): string | null {
  if (!renderedItems.length) return null;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(pageUrl ? { mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl } } : {}),
    mainEntity: renderedItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  });
}
