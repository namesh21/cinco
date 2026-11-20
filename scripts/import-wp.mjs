#!/usr/bin/env node
/**
 * Importa o conteúdo do WordPress (cincoinvest.com.br) para o projeto Astro.
 *
 * Uso:
 *   npm run import:wp                      # busca tudo na API e baixa as imagens
 *   npm run import:wp -- --no-images       # só textos (mantém URLs das imagens apontando p/ o WP)
 *   npm run import:wp -- --from-file export.json   # usa um export JSON local em vez da API
 *   npm run import:wp -- --site https://outro-dominio.com.br
 *
 * Gera:
 *   src/content/posts/<slug>.md      (frontmatter + Markdown)
 *   src/content/pages/<slug>.md
 *   src/data/categories.json, tags.json, authors.json
 *   public/wp-content/uploads/...    (mesmos caminhos do WP, preserva URLs de imagem)
 *   scripts/.import-report.json      (avisos: shortcodes, iframes removidos, imagens com erro)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import domino from '@mixmark-io/domino';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const SITE = (opt('--site', 'https://cincoinvest.com.br')).replace(/\/$/, '');
const SITE_HOSTS = new Set([new URL(SITE).host, 'www.' + new URL(SITE).host.replace(/^www\./, ''), new URL(SITE).host.replace(/^www\./, '')]);
const FROM_FILE = opt('--from-file');
const DOWNLOAD_IMAGES = !flag('--no-images');
const SKIP_PAGES = new Set(['pagina-exemplo', 'sample-page']);

const report = { shortcodes: [], removedIframes: [], imageErrors: [], postsWithoutImage: [], emptyDescription: [] };

// ---------- helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', deg: '°', ordm: 'º', ordf: 'ª' };
function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
const stripTags = (h = '') => decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function summarize(text, max = 158) {
  text = text.replace(/\s+/g, ' ').replace(/\[…\]|\[\.\.\.\]|…$/g, '').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–—\s]+$/, '') + '…';
}

const isSiteUrl = (u) => { try { return SITE_HOSTS.has(new URL(u, SITE).host); } catch { return false; } };

/** URL absoluta do WP -> caminho relativo do site novo */
function toLocal(u) {
  try {
    const url = new URL(u, SITE);
    if (!SITE_HOSTS.has(url.host)) return u;
    return url.pathname + url.search + url.hash;
  } catch { return u; }
}

async function fetchAll(endpoint, fields) {
  let page = 1, total = 1, out = [];
  do {
    const url = `${SITE}/wp-json/wp/v2/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}${fields ? `&_fields=${fields}` : ''}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'cincoinvest-astro-importer' } });
    if (!res.ok) throw new Error(`${res.status} em ${url}`);
    total = Number(res.headers.get('x-wp-totalpages') || 1);
    out = out.concat(await res.json());
    process.stdout.write(`  ${endpoint}: página ${page}/${total}\r`);
    page++;
  } while (page <= total);
  process.stdout.write('\n');
  return out;
}

async function loadData() {
  if (FROM_FILE) {
    console.log(`→ Lendo export local ${FROM_FILE}`);
    return JSON.parse(await fs.readFile(path.resolve(FROM_FILE), 'utf8'));
  }
  console.log(`→ Buscando conteúdo em ${SITE}/wp-json`);
  const [posts, pages, tags, categories, media, users] = await Promise.all([
    fetchAll('posts?status=publish', 'id,date,date_gmt,modified,modified_gmt,slug,link,title,content,excerpt,author,categories,tags,featured_media,sticky'),
    fetchAll('pages', 'id,date,modified,slug,link,title,content,excerpt'),
    fetchAll('tags', 'id,name,slug,description,count'),
    fetchAll('categories', 'id,name,slug,description,count,parent'),
    fetchAll('media', 'id,source_url,alt_text,title,mime_type,media_details'),
    fetchAll('users', 'id,name,slug,description').catch(() => []),
  ]);
  return { posts, pages, tags, categories, media, users };
}

// ---------- HTML -> Markdown ----------
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
td.use(gfm);
td.keep(['iframe']);
td.addRule('figure-img', {
  filter: (n) => n.nodeName === 'FIGURE' && n.querySelector('img') && !n.querySelector('table'),
  replacement: (_c, node) => {
    const img = node.querySelector('img');
    const cap = node.querySelector('figcaption');
    const alt = (img.getAttribute('alt') || cap?.textContent || '').replace(/[\[\]]/g, '').trim();
    const src = img.getAttribute('src');
    const capText = cap ? `\n*${cap.textContent.trim()}*` : '';
    return `\n\n![${alt}](${src})${capText}\n\n`;
  },
});

const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));

function cleanHtml(html, ctx) {
  const doc = domino.createDocument(`<body>${html}</body>`);
  const body = doc.body;

  // âncoras vazias do Word/Gutenberg
  $$(body, 'a').forEach((a) => { if (!a.textContent.trim() && !a.querySelector('img')) a.remove(); });
  // atributos title (no WP vêm com encoding quebrado) e classes
  $$(body, '[title]').forEach((e) => e.removeAttribute('title'));

  // embeds do WordPress (blockquote + iframe escondido) -> link simples
  $$(body, 'figure.wp-block-embed, .wp-block-embed').forEach((fig) => {
    const yt = fig.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"]');
    if (yt) return; // tratado abaixo
    const a = fig.querySelector('blockquote a, a');
    const p = doc.createElement('p');
    if (a) {
      const link = doc.createElement('a');
      link.setAttribute('href', a.getAttribute('href'));
      link.textContent = a.textContent.trim();
      p.appendChild(doc.createTextNode('Leia também: '));
      p.appendChild(link);
    }
    fig.replaceWith(p);
  });

  // iframes: mantém YouTube (como youtube-nocookie, lazy), remove o resto
  $$(body, 'iframe').forEach((f) => {
    const src = f.getAttribute('src') || '';
    const m = src.match(/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{6,})/);
    if (m) {
      const clean = doc.createElement('iframe');
      clean.setAttribute('src', `https://www.youtube-nocookie.com/embed/${m[1]}`);
      clean.setAttribute('title', 'Vídeo do YouTube');
      clean.setAttribute('loading', 'lazy');
      clean.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      clean.setAttribute('allowfullscreen', '');
      const wrap = f.closest('figure') || f;
      const p = doc.createElement('div');
      p.setAttribute('class', 'video');
      p.appendChild(clean);
      wrap.replaceWith(p);
    } else {
      report.removedIframes.push({ post: ctx.slug, src });
      (f.closest('figure') || f).remove();
    }
  });

  // tabelas sem <thead>: promove a 1ª linha a cabeçalho (vira tabela Markdown)
  $$(body, 'table').forEach((t) => {
    if (t.querySelector('thead')) return;
    const first = t.querySelector('tr');
    if (!first) return;
    const thead = doc.createElement('thead');
    const tr = doc.createElement('tr');
    $$(first, 'td,th').forEach((c) => { const th = doc.createElement('th'); th.innerHTML = c.innerHTML; tr.appendChild(th); });
    thead.appendChild(tr);
    first.remove();
    t.insertBefore(thead, t.firstChild);
  });
  // figure de tabela -> só a tabela
  $$(body, 'figure.wp-block-table').forEach((f) => { const t = f.querySelector('table'); if (t) f.replaceWith(t); });

  // links e imagens: absolutos do WP -> relativos; coleta imagens
  $$(body, 'a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (isSiteUrl(href)) a.setAttribute('href', toLocal(href));
  });
  $$(body, 'img').forEach((img) => {
    let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (isSiteUrl(src)) { ctx.images.add(new URL(src, SITE).href); src = toLocal(src); }
    img.setAttribute('src', src);
    ['srcset', 'sizes', 'class', 'decoding', 'loading', 'data-src', 'style'].forEach((x) => img.removeAttribute(x));
  });

  // negrito dentro de títulos é redundante
  $$(body, 'h1 strong, h2 strong, h3 strong, h4 strong, h1 b, h2 b, h3 b, h4 b').forEach((b) => b.replaceWith(...b.childNodes));

  // shortcodes remanescentes: só remove os reais (conhecidos, com atributos "=" ou com fechamento [/x]).
  // Texto entre colchetes como [cidade] ou [B3] é preservado.
  const KNOWN = /^(caption|gallery|embed|video|audio|playlist|contact-form-7|wpforms|ninja_forms|mc4wp_form|elementor-template|ads?|adsense|toc|tablepress|shortcode|et_pb_\w+|vc_\w+|su_\w+)$/i;
  const SC = /\[(\/?)([a-z_][\w-]*)((?:\s[^\]]*)?)\]/gi;
  const out = body.innerHTML;
  const closers = new Set([...out.matchAll(/\[\/([a-z_][\w-]*)\]/gi)].map((m) => m[1].toLowerCase()));
  const isReal = (slash, name, attrs) => KNOWN.test(name) || /=/.test(attrs) || !!slash || closers.has(name.toLowerCase());
  const found = [...out.matchAll(SC)].filter((m) => isReal(m[1], m[2], m[3])).map((m) => m[0]);
  if (!found.length) return out;
  report.shortcodes.push({ post: ctx.slug, shortcodes: [...new Set(found)].slice(0, 10) });
  return out
    .replace(SC, (m, slash, name, attrs) => (isReal(slash, name, attrs) ? '' : m))
    .replace(/<p>\s*<\/p>/g, '');
}

function toMarkdown(html, ctx) {
  return td.turndown(cleanHtml(html, ctx))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ /g, ' ')
    .trim() + '\n';
}

// ---------- imagens ----------
async function download(urls) {
  const list = [...urls];
  let ok = 0, skip = 0, i = 0;
  const worker = async () => {
    while (i < list.length) {
      const u = list[i++];
      const rel = decodeURIComponent(new URL(u).pathname);
      const dest = path.join(ROOT, 'public', rel);
      try { await fs.access(dest); skip++; continue; } catch {}
      try {
        const res = await fetch(u);
        if (!res.ok) throw new Error(String(res.status));
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
        ok++;
      } catch (e) { report.imageErrors.push({ url: u, error: e.message }); }
      process.stdout.write(`  imagens: ${ok + skip}/${list.length}\r`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  process.stdout.write('\n');
  console.log(`  ${ok} baixadas, ${skip} já existiam, ${report.imageErrors.length} com erro`);
}

// ---------- main ----------
const y = (v) => JSON.stringify(v); // JSON é YAML válido

async function main() {
  const data = await loadData();
  const media = new Map((data.media || []).map((m) => [m.id, m]));
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const tagById = new Map(data.tags.map((t) => [t.id, t]));
  const authors = new Map((data.users || []).map((u) => [u.id, u]));
  const images = new Set();

  const postsDir = path.join(ROOT, 'src/content/posts');
  const pagesDir = path.join(ROOT, 'src/content/pages');
  const dataDir = path.join(ROOT, 'src/data');
  for (const d of [postsDir, pagesDir]) { await fs.rm(d, { recursive: true, force: true }); await fs.mkdir(d, { recursive: true }); }
  await fs.mkdir(dataDir, { recursive: true });

  const usedTags = new Map();
  const usedCats = new Map();

  for (const p of data.posts) {
    const ctx = { slug: p.slug, images: new Set() };
    const body = toMarkdown(p.content.rendered, ctx);
    ctx.images.forEach((u) => images.add(u));

    const title = decode(p.title.rendered).trim();
    let description = summarize(stripTags(p.excerpt?.rendered || '') || stripTags(p.content.rendered));
    if (!description) report.emptyDescription.push(p.slug);

    const cats = p.categories.map((id) => catById.get(id)).filter(Boolean);
    const primaryCat = cats.find((c) => c.slug !== 'sem-categoria' && c.slug !== 'uncategorized') || cats[0];
    const tags = p.tags.map((id) => tagById.get(id)).filter(Boolean);
    tags.forEach((t) => usedTags.set(t.slug, (usedTags.get(t.slug) || 0) + 1));
    cats.forEach((c) => usedCats.set(c.slug, (usedCats.get(c.slug) || 0) + 1));

    let cover;
    const fm = media.get(p.featured_media);
    if (fm?.source_url) {
      if (isSiteUrl(fm.source_url)) images.add(fm.source_url);
      cover = {
        src: DOWNLOAD_IMAGES ? toLocal(fm.source_url) : fm.source_url,
        alt: decode(fm.alt_text || fm.title?.rendered || title),
        width: fm.media_details?.width,
        height: fm.media_details?.height,
      };
    } else report.postsWithoutImage.push(p.slug);

    const author = authors.get(p.author);
    const front = [
      '---',
      `title: ${y(title)}`,
      `description: ${y(description)}`,
      `pubDate: ${y(p.date_gmt ? p.date_gmt + 'Z' : p.date)}`,
      `updatedDate: ${y(p.modified_gmt ? p.modified_gmt + 'Z' : p.modified)}`,
      `category: ${y(primaryCat?.slug || 'dicas')}`,
      `categories: ${y(cats.map((c) => c.slug))}`,
      `tags: ${y(tags.map((t) => t.slug))}`,
      cover ? `cover:\n  src: ${y(cover.src)}\n  alt: ${y(cover.alt)}${cover.width ? `\n  width: ${cover.width}\n  height: ${cover.height}` : ''}` : null,
      `author: ${y(author?.slug || 'redacao')}`,
      `wpId: ${p.id}`,
      p.sticky ? 'featured: true' : null,
      '---',
      '',
    ].filter((l) => l !== null).join('\n');

    let md = front + body;
    if (!DOWNLOAD_IMAGES) md = md.replace(/\]\((\/wp-content\/uploads\/[^)]+)\)/g, `](${SITE}$1)`);
    await fs.writeFile(path.join(postsDir, `${p.slug}.md`), md);
  }

  for (const pg of data.pages || []) {
    if (SKIP_PAGES.has(pg.slug)) continue;
    const ctx = { slug: pg.slug, images: new Set() };
    const body = toMarkdown(pg.content.rendered, ctx);
    ctx.images.forEach((u) => images.add(u));
    const title = decode(pg.title.rendered).trim();
    const description = summarize(stripTags(pg.content.rendered));
    await fs.writeFile(path.join(pagesDir, `${pg.slug}.md`), `---\ntitle: ${y(title)}\ndescription: ${y(description)}\nupdatedDate: ${y(pg.modified)}\n---\n\n${body}`);
  }

  const categories = data.categories
    .filter((c) => usedCats.has(c.slug))
    .map((c) => ({ slug: c.slug, name: decode(c.name), description: decode(c.description || ''), count: usedCats.get(c.slug) }))
    .sort((a, b) => b.count - a.count);
  const tags = data.tags
    .filter((t) => usedTags.has(t.slug))
    .map((t) => ({ slug: t.slug, name: decode(t.name), description: decode(t.description || ''), count: usedTags.get(t.slug) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  const authorList = [...authors.values()].map((u) => ({ slug: u.slug, name: decode(u.name), description: decode(u.description || '').replace(/\r?\n/g, ' ') }));

  await fs.writeFile(path.join(dataDir, 'categories.json'), JSON.stringify(categories, null, 2));
  await fs.writeFile(path.join(dataDir, 'tags.json'), JSON.stringify(tags, null, 2));
  await fs.writeFile(path.join(dataDir, 'authors.json'), JSON.stringify(authorList, null, 2));

  console.log(`✓ ${data.posts.length} posts, ${(data.pages || []).length} páginas, ${categories.length} categorias, ${tags.length} tags (de ${data.tags.length} no WP; as sem post ficaram de fora)`);

  if (DOWNLOAD_IMAGES && !FROM_FILE) await download(images);
  else if (DOWNLOAD_IMAGES) console.log(`  (export local: ${images.size} imagens não baixadas — rode sem --from-file para baixar)`);

  await fs.writeFile(path.join(ROOT, 'scripts/.import-report.json'), JSON.stringify(report, null, 2));
  const warn = Object.entries(report).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.length}`);
  if (warn.length) console.log(`⚠ Avisos (ver scripts/.import-report.json): ${warn.join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
