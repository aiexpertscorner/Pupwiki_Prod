import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// astro-compress removed: Cloudflare Pages CDN applies Brotli/gzip at the edge.
// The astro-compress@2.3.0 integration caused indefinite build hangs at astro:build:done.

export default defineConfig({
  site: 'https://pupwiki.com',
  integrations: [
    tailwind(),
    // sitemap() disabled — using public/sitemap-index.xml via generate-sitemap.mjs
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
