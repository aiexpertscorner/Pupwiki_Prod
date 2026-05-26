import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('guides');
  return rss({
    title: 'PupWiki — Dog Breeds, Names, Costs & Expert Reviews',
    description: 'Expert dog breed guides, 5,000+ dog names, lifetime cost calculators, and honest product reviews.',
    site: context.site,
    items: posts
      .filter(p => !p.data.noIndex)
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
