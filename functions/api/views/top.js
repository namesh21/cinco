// GET /api/views/top?limit=5 -> [{ slug, count }]  (mais lidos)
export async function onRequestGet({ env, request }) {
  const limit = Math.min(20, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 5));
  const { results } = await env.VIEWS_DB.prepare('SELECT slug, count FROM views ORDER BY count DESC LIMIT ?1').bind(limit).all();
  return new Response(JSON.stringify(results.map((r) => ({ slug: r.slug, count: Number(r.count) }))), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' },
  });
}
