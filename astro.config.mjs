import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import compress from 'astro-compress';

export default defineConfig({
  site: 'https://pupwiki.com',
  integrations: [
    tailwind(),
    // sitemap() disabled — using public/sitemap-index.xml via generate-sitemap.mjs
    compress({
      CSS: true,
      HTML: { removeComments: true, collapseWhitespace: true },
      Image: false, // breed/product images are external URLs, not local assets
      JavaScript: true,
      SVG: true,
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
