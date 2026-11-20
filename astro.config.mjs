// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

const SITE_URL = 'https://cincoinvest.com.br';
const TAG_MIN = 2; // manter igual a SITE.tagIndexMinPosts em src/site.config.ts

// Tags com poucos posts ficam fora do sitemap (estão com noindex)
const thinTags = new Set(
  JSON.parse(fs.readFileSync(new URL('./src/data/tags.json', import.meta.url), 'utf8'))
    .filter((t) => t.count < TAG_MIN)
    .map((t) => `${SITE_URL}/tag/${t.slug}/`),
);

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  integrations: [
    sitemap({
      filter: (page) => !thinTags.has(page) && !page.endsWith('/busca/') && !page.includes('/404'),
      changefreq: 'weekly',
      i18n: undefined,
    }),
  ],
});
