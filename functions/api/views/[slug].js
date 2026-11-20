// Cloudflare Pages Function — contador de visualizações por post.
//   GET  /api/views/:slug  -> { slug, count }
//   POST /api/views/:slug  -> incrementa e devolve { slug, count }
// Requer binding D1 "VIEWS_DB" (ver wrangler.toml e db/schema.sql).

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|curl|wget|python|axios|node-fetch/i;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex', ...extra },
  });

async function read(db, slug) {
  const row = await db.prepare('SELECT count FROM views WHERE slug = ?1').bind(slug).first();
  return row ? Number(row.count) : 0;
}

/** Só conta slugs que existem como página no build (evita lixo na tabela) */
async function postExists(env, request, slug) {
  try {
    const res = await env.ASSETS.fetch(new URL(`/${slug}.md`, request.url), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'slug inválido' }, 400);
  const count = await read(env.VIEWS_DB, slug);
  return json({ slug, count }, 200, { 'Cache-Control': 'public, max-age=60' });
}

export async function onRequestPost({ params, env, request }) {
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'slug inválido' }, 400);

  const ua = request.headers.get('user-agent') || '';
  const sameOrigin = (request.headers.get('origin') || new URL(request.url).origin) === new URL(request.url).origin;
  if (BOT_RE.test(ua) || !sameOrigin || !(await postExists(env, request, slug))) {
    return json({ slug, count: await read(env.VIEWS_DB, slug) }, 200, { 'Cache-Control': 'no-store' });
  }

  const row = await env.VIEWS_DB.prepare(
    `INSERT INTO views (slug, count, updated_at) VALUES (?1, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(slug) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING count`,
  ).bind(slug).first();

  return json({ slug, count: Number(row?.count ?? 0) }, 200, { 'Cache-Control': 'no-store' });
}
