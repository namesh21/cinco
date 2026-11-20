import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../site.config';
import categoriesData from '../data/categories.json';
import tagsData from '../data/tags.json';
import authorsData from '../data/authors.json';

export type Post = CollectionEntry<'posts'>;
export type Term = { slug: string; name: string; description: string; count: number };

export const categories = categoriesData as Term[];
export const tags = tagsData as Term[];
const authors = authorsData as { slug: string; name: string; description: string }[];

let cache: Post[] | undefined;
export async function getPosts(): Promise<Post[]> {
  if (!cache) {
    cache = (await getCollection('posts', ({ data }) => !data.draft)).sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    );
  }
  return cache;
}

export const postUrl = (p: Post | string) => `/${typeof p === 'string' ? p : p.id}/`;
export const postMdUrl = (p: Post | string) => `/${typeof p === 'string' ? p : p.id}.md`;
export const categoryUrl = (slug: string) => `/${slug}/`;
export const tagUrl = (slug: string) => `/tag/${slug}/`;
export const abs = (path: string) => new URL(path, SITE.url).href;

export const getCategory = (slug: string): Term =>
  categories.find((c) => c.slug === slug) ?? { slug, name: slug.replace(/-/g, ' '), description: '', count: 0 };
export const getTag = (slug: string): Term =>
  tags.find((t) => t.slug === slug) ?? { slug, name: slug.replace(/-/g, ' '), description: '', count: 0 };

export function getAuthor(slug: string) {
  const a = authors.find((x) => x.slug === slug);
  // usuário técnico do WP ("namesh") ou desconhecido -> autor padrão do site
  if (!a || slug === 'namesh' || slug === SITE.defaultAuthor.slug) return { ...SITE.defaultAuthor, description: '' };
  return { slug: a.slug, name: a.name, url: '/sobre/', description: a.description };
}

export const tagIsIndexable = (slug: string) => getTag(slug).count >= SITE.tagIndexMinPosts;

export function wordCount(body = '') {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_\-|`\[\]()!]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}
export const readingTime = (body = '') => Math.max(1, Math.round(wordCount(body) / 200));

const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
export const formatDate = (d: Date) => fmt.format(d);
export const isoDate = (d: Date) => d.toISOString();

/** Considera "atualizado" só se a edição foi pelo menos 1 dia depois da publicação */
export const wasUpdated = (p: Post) =>
  !!p.data.updatedDate && p.data.updatedDate.valueOf() - p.data.pubDate.valueOf() > 86_400_000;

export function relatedPosts(post: Post, all: Post[], n = 4): Post[] {
  const scored = all
    .filter((p) => p.id !== post.id)
    .map((p) => {
      let s = 0;
      s += p.data.tags.filter((t) => post.data.tags.includes(t)).length * 3;
      if (p.data.category === post.data.category) s += 2;
      s += p.data.categories.filter((c) => post.data.categories.includes(c)).length;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.data.pubDate.valueOf() - a.p.data.pubDate.valueOf());
  return scored.slice(0, n).map((x) => x.p);
}

export function paginate<T>(items: T[], size = SITE.postsPerPage) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}
