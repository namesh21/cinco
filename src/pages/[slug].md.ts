// Versão Markdown de cada artigo: /<slug>.md (para agentes de IA e leitura limpa)
import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts, type Post } from '../lib/content';
import { postToMarkdown } from '../lib/agents';

export const getStaticPaths: GetStaticPaths = async () =>
  (await getPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }));

export const GET: APIRoute = ({ props }) =>
  new Response(postToMarkdown((props as { post: Post }).post), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
