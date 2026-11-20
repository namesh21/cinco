// Formatos para leitura por agentes/LLMs.
import { SITE } from '../site.config';
import { type Post, abs, postUrl, postMdUrl, getCategory, getTag, getAuthor, isoDate } from './content';

/** Converte links/imagens relativos do Markdown em absolutos */
export const absolutize = (md = '') =>
  md
    .replace(/\]\((\/[^)\s]*)\)/g, (_m, p) => `](${SITE.url}${p})`)
    .replace(/src="(\/[^"]*)"/g, (_m, p) => `src="${SITE.url}${p}"`);

export function postToMarkdown(p: Post) {
  const d = p.data;
  const cat = getCategory(d.category);
  const tags = d.tags.map((t) => getTag(t).name);
  const meta = [
    `---`,
    `title: ${JSON.stringify(d.title)}`,
    `description: ${JSON.stringify(d.description)}`,
    `url: ${abs(postUrl(p))}`,
    `published: ${isoDate(d.pubDate)}`,
    d.updatedDate ? `updated: ${isoDate(d.updatedDate)}` : null,
    `category: ${JSON.stringify(cat.name)}`,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    `author: ${JSON.stringify(getAuthor(d.author).name)}`,
    `language: ${SITE.locale}`,
    `source: ${JSON.stringify(SITE.name)}`,
    `---`,
  ].filter(Boolean).join('\n');
  return `${meta}\n\n# ${d.title}\n\n> ${d.description}\n\n${absolutize(p.body ?? '').trim()}\n\n---\n${SITE.disclaimer}\n`;
}

export function postIndexEntry(p: Post) {
  const d = p.data;
  return {
    slug: p.id,
    title: d.title,
    url: abs(postUrl(p)),
    markdown: abs(postMdUrl(p)),
    description: d.description,
    category: getCategory(d.category).name,
    tags: d.tags.map((t) => getTag(t).name),
    pubDate: isoDate(d.pubDate),
    updatedDate: d.updatedDate ? isoDate(d.updatedDate) : undefined,
    image: d.cover ? abs(d.cover.src) : undefined,
  };
}
