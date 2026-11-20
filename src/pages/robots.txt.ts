import type { APIRoute } from 'astro';
import { SITE } from '../site.config';

// Libera buscadores e agentes de IA (busca e treinamento). Para bloquear treinamento,
// descomente os blocos "Disallow: /" dos bots de treino abaixo.
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /busca/',
      '',
      '# Agentes de IA — permitidos',
      'User-agent: GPTBot',
      'User-agent: OAI-SearchBot',
      'User-agent: ChatGPT-User',
      'User-agent: ClaudeBot',
      'User-agent: Claude-User',
      'User-agent: Claude-SearchBot',
      'User-agent: PerplexityBot',
      'User-agent: Perplexity-User',
      'User-agent: Google-Extended',
      'User-agent: Applebot-Extended',
      'User-agent: CCBot',
      'Allow: /',
      'Disallow: /api/',
      '',
      `Sitemap: ${SITE.url}/sitemap-index.xml`,
      '',
      `# Conteúdo para LLMs: ${SITE.url}/llms.txt`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
