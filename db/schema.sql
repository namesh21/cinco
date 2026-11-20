-- Tabela do contador de visualizações (Cloudflare D1)
CREATE TABLE IF NOT EXISTS views (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_views_count ON views (count DESC);

-- Para semear contagens iniciais (ex.: vindas do WordPress/GA4), use:
-- INSERT INTO views (slug, count) VALUES ('como-montar-um-orcamento-pessoal', 1234)
--   ON CONFLICT(slug) DO UPDATE SET count = excluded.count;
