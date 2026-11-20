import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { getPosts, postUrl, getCategory } from '../lib/content';

export const GET: APIRoute = async (context) => {
  const posts = (await getPosts()).slice(0, 50);
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: postUrl(p),
      categories: [getCategory(p.data.category).name],
      ...(p.data.cover ? { enclosure: { url: new URL(p.data.cover.src, SITE.url).href, type: p.data.cover.src.endsWith('.png') ? 'image/png' : 'image/jpeg', length: 0 } } : {}),
    })),
    customData: `<language>pt-br</language>`,
    trailingSlash: true,
  });
};
