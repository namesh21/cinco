// GET /api/quotes -> cotações para a barra do topo (cache de 5 min na borda da Cloudflare)
// Fontes: AwesomeAPI (moedas, sem chave) e brapi.dev (B3).
// Sem BRAPI_TOKEN: só os tickers de teste gratuitos da brapi (PETR4, VALE3, ITUB4, MGLU3).
// Com BRAPI_TOKEN (variável de ambiente no Pages): Ibovespa, IFIX, a lista completa abaixo, dólar, euro e bitcoin.
// AWESOME_API_KEY (opcional): chave da AwesomeAPI, usada para moedas quando não há BRAPI_TOKEN.

const TTL = 300; // segundos
const FREE = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3'];
const FULL = ['^BVSP', 'IFIX', 'PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'ABEV3', 'WEGE3', 'MGLU3', 'GGBR4'];
const FX = [
  ['USD-BRL', 'Dólar'],
  ['EUR-BRL', 'Euro'],
  ['BTC-BRL', 'Bitcoin'],
];

const n = (v) => Number(String(v ?? '').replace(',', '.'));

// Moedas via brapi (precisa de BRAPI_TOKEN): /api/v2/currency e /api/v2/crypto
async function fxBrapi(token) {
  const h = { Authorization: `Bearer ${token}` };
  const [cur, cry] = await Promise.all([
    fetch('https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL', { headers: h }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`brapi currency ${r.status}`)))),
    fetch('https://brapi.dev/api/v2/crypto?coin=BTC&currency=BRL', { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const out = (cur.currency || []).map((c) => {
    const pair = `${c.fromCurrency}-${c.toCurrency}`;
    const label = FX.find((f) => f[0] === pair)?.[1] || pair;
    return { symbol: pair, label, price: n(c.bidPrice), changePct: n(c.percentageChange), kind: 'fx' };
  });
  const btc = cry?.coins?.[0];
  if (btc) out.push({ symbol: 'BTC-BRL', label: 'Bitcoin', price: n(btc.regularMarketPrice), changePct: n(btc.regularMarketChangePercent), kind: 'fx' });
  return out;
}

// Moedas via AwesomeAPI (sem chave a cota esgota em servidores compartilhados; use AWESOME_API_KEY)
async function fxAwesome(key) {
  const qs = key ? `?token=${encodeURIComponent(key)}` : '';
  const r = await fetch(`https://economia.awesomeapi.com.br/json/last/${FX.map((f) => f[0]).join(',')}${qs}`, {
    headers: { 'User-Agent': 'cincoinvest.com.br' },
  });
  if (!r.ok) throw new Error(`awesomeapi ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return FX.map(([pair, label]) => {
    const q = j[pair.replace('-', '')];
    return q && { symbol: pair, label, price: n(q.bid), changePct: n(q.pctChange), kind: 'fx' };
  }).filter(Boolean);
}

async function getFx(env) {
  if (env.BRAPI_TOKEN) {
    try { const r = await fxBrapi(env.BRAPI_TOKEN); if (r.length) return r; } catch {}
  }
  return fxAwesome(env.AWESOME_API_KEY);
}

async function brapi(symbols, token) {
  const r = await fetch(`https://brapi.dev/api/quote/${symbols.map(encodeURIComponent).join(',')}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  const j = await r.json();
  return (j.results || []).map((q) => ({
    symbol: q.symbol,
    label: q.symbol === '^BVSP' ? 'Ibovespa' : q.symbol,
    price: Number(q.regularMarketPrice),
    changePct: Number(q.regularMarketChangePercent),
    kind: q.symbol === '^BVSP' || q.symbol === 'IFIX' ? 'index' : 'stock',
  }));
}

async function getStocks(token) {
  const list = token ? FULL : FREE;
  try {
    return await brapi(list, token);
  } catch {
    // alguns planos limitam vários tickers por requisição: tenta um a um
    const parts = await Promise.allSettled(list.map((s) => brapi([s], token)));
    return parts.flatMap((p) => (p.status === 'fulfilled' ? p.value : []));
  }
}

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/quotes', request.url).href);
  const hit = await cache.match(key);
  if (hit) return hit;

  const [stocks, fx] = await Promise.allSettled([getStocks(env.BRAPI_TOKEN), getFx(env)]);
  const s = stocks.status === 'fulfilled' ? stocks.value : [];
  const f = fx.status === 'fulfilled' ? fx.value : [];
  const idx = s.filter((x) => x.kind === 'index');
  const items = [...idx, ...f, ...s.filter((x) => x.kind !== 'index')].filter((x) => Number.isFinite(x.price));

  const errors = [stocks, fx].filter((x) => x.status === 'rejected').map((x) => String(x.reason?.message || x.reason));
  const res = new Response(JSON.stringify({ updated: new Date().toISOString(), items, ...(errors.length ? { errors } : {}) }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${TTL}`,
      'X-Robots-Tag': 'noindex',
    },
  });
  if (items.length) waitUntil(cache.put(key, res.clone()));
  return res;
}
