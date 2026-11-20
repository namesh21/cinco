// Índice estruturado de todos os artigos (usado pela busca, pelo widget "Mais lidos" e por agentes)
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { getPosts, categories, tags, abs, categoryUrl, tagUrl } from '../lib/content';
import { postIndexEntry } from '../lib/agents';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const body = {
    site: { name: SITE.name, url: SITE.url, description: SITE.description, language: SITE.locale },
    generated: new Date().toISOString(),
    categories: categories.map((c) => ({ ...c, url: abs(categoryUrl(c.slug)) })),
    tags: tags.map((t) => ({ ...t, url: abs(tagUrl(t.slug)) })),
    posts: posts.map(postIndexEntry),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
