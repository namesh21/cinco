// https://llmstxt.org — índice do site para LLMs/agentes
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { getPosts, categories, abs, categoryUrl, postMdUrl } from '../lib/content';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const lines: string[] = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.tagline}. ${SITE.description}`,
    '',
    `Portal brasileiro de educação financeira (pt-BR), publicado desde 2012. Cada artigo tem uma versão em Markdown (links abaixo). ` +
      `Texto completo em um único arquivo: ${abs('/llms-full.txt')}. Índice estruturado em JSON: ${abs('/posts.json')}.`,
    '',
    `Aviso: ${SITE.disclaimer}`,
    '',
    '## Categorias',
    '',
    ...categories.map((c) => `- [${c.name}](${abs(categoryUrl(c.slug))}): ${c.description || `${c.count} artigos`}`),
  ];
  for (const c of categories) {
    const list = posts.filter((p) => p.data.category === c.slug);
    if (!list.length) continue;
    lines.push('', `## ${c.name}`, '');
    for (const p of list) lines.push(`- [${p.data.title}](${abs(postMdUrl(p))}): ${p.data.description}`);
  }
  lines.push('', '## Optional', '', `- [Sobre o ${SITE.name}](${abs('/sobre/')})`, `- [Feed RSS](${abs('/rss.xml')})`, `- [Sitemap](${abs('/sitemap-index.xml')})`, '');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
