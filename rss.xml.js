import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('guides');
  return rss({
    title: 'PupWiki — Dog Guides, Breed Advice & Product Reviews',
    description: 'Expert dog guides, breed-specific advice, and honest product comparisons from PupWiki.',
    site: context.site,
    items: posts
      .filter(p => !p.data.noIndex && p.data.indexInGuides !== false)
      .sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate))
      .slice(0, 100)
      .map(post => ({
        title:       post.data.title,
        pubDate:     post.data.pubDate,
        description: post.data.description,
        link:        `/guides/${post.slug}/`,
        categories:  post.data.tags || [],
      })),
    customData: `<language>en-us</language>`,
  });
}
