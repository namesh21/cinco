# Cinco Invest — Astro

Site estático do **cincoinvest.com.br** (migrado do WordPress), com contador de visualizações, SEO técnico e formatos para leitura por agentes de IA.

## 1. Primeira vez

```bash
npm install
npm run import:wp        # puxa posts, páginas, tags, categorias e imagens da API do WordPress
npm run dev              # http://localhost:4321
```

O import sobrescreve `src/content/posts`, `src/content/pages` e `src/data/*.json` (o que vem no repositório é só uma amostra de 3 posts).
Imagens são baixadas para `public/wp-content/uploads/...` — **os mesmos caminhos do WordPress**, então as URLs de imagem indexadas no Google continuam valendo.
Avisos (shortcodes removidos, iframes descartados, imagens com erro) ficam em `scripts/.import-report.json`.

Rode o import **antes de desligar o WordPress**. Depois disso, novos posts são arquivos `.md` em `src/content/posts/`.

## 2. URLs (idênticas ao WP)

| Tipo | URL |
|---|---|
| Post | `/slug-do-post/` |
| Categoria | `/dicas/`, `/dicas/page/2/` |
| Tag | `/tag/slug/` (tags com < 2 posts: `noindex,follow` e fora do sitemap) |
| Home paginada | `/page/2/` |
| Páginas | `/politica-de-privacidade/`, `/sobre/` |

Redirecionamentos 301 de `/feed/`, `/author/*`, `/category/*`, sitemaps do Yoast/WP etc. estão em `public/_redirects`.

## 3. SEO
- `<title>`, description, canonical, Open Graph/Twitter, `article:*`
- JSON-LD: Organization, WebSite (+ SearchAction), BlogPosting (com wordCount, timeRequired, data de atualização), BreadcrumbList, CollectionPage/ItemList
- Sitemap (`/sitemap-index.xml`), RSS (`/rss.xml`), `robots.txt`
- Sumário automático (H2), "Leia também" por tags/categoria, aviso de conteúdo educativo (YMYL)
- Zero JS de framework; só dois scripts pequenos (contador e "mais lidos")

## 4. Leitura por agentes de IA
- `/llms.txt` — índice no padrão llmstxt.org
- `/llms-full.txt` — todo o conteúdo em um arquivo
- `/<slug>.md` — cada post em Markdown limpo (com `<link rel="alternate" type="text/markdown">` no HTML)
- `/posts.json` — índice estruturado (título, URL, descrição, categoria, tags, datas, imagem)
- `robots.txt` libera GPTBot, ClaudeBot, PerplexityBot, Google-Extended etc.

## 5. Contador de visualizações (Cloudflare Pages + D1)

`functions/api/views/[slug].js` e `functions/api/views/top.js` rodam como Pages Functions. Conta 1 view por sessão do navegador, ignora bots e só aceita slugs que existem no site.

```bash
npx wrangler login
npx wrangler d1 create cincoinvest-views      # copie o database_id para o wrangler.toml
npm run db:init                               # cria a tabela no D1 remoto
```

No painel do Cloudflare Pages (projeto `cincoinvest`): **Settings → Bindings → D1** → nome `VIEWS_DB` → banco `cincoinvest-views`.

Testar localmente com o contador: `npx wrangler d1 execute cincoinvest-views --local --file=db/schema.sql` e `npm run pages:dev`.
(No `npm run dev` o contador fica oculto, porque a API só existe no runtime da Cloudflare.)

Para semear contagens antigas (ex.: do GA4), veja o comentário em `db/schema.sql`.

## 6. Deploy (Cloudflare Pages via GitHub)
- Build command: `npm run build` · Output: `dist` · Node 20+
- Confira no `*.pages.dev` e só então aponte o domínio `cincoinvest.com.br`.

## 7. Configurações
`src/site.config.ts`: nome, descrição, menu, autor padrão, GA4 (`ga4Id`), AdSense (`adsenseClient`), mínimo de posts para indexar tag, posts por página.
Se mudar `tagIndexMinPosts`, mude também `TAG_MIN` em `astro.config.mjs`.
