// Conteúdo completo do site em um único arquivo Markdown para LLMs
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { getPosts } from '../lib/content';
import { postToMarkdown } from '../lib/agents';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const out = [`# ${SITE.name} — conteúdo completo`, '', `> ${SITE.description}`, '', `${posts.length} artigos, do mais recente ao mais antigo.`, ''];
  for (const p of posts) out.push('', postToMarkdown(p));
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
