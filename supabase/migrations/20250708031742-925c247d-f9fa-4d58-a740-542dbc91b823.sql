-- Remover constraint UNIQUE problemática do tvg_id que está causando falhas nas inserções
-- Muitos canais M3U podem ter o mesmo tvg_id ou tvg_id vazio
ALTER TABLE public.catalogo_m3u_live 
DROP CONSTRAINT IF EXISTS catalogo_m3u_live_tvg_id_key;

-- Adicionar índice simples no tvg_id para performance (sem constraint UNIQUE)
DROP INDEX IF EXISTS idx_catalogo_m3u_live_tvg_id;
CREATE INDEX idx_catalogo_m3u_live_tvg_id ON public.catalogo_m3u_live (tvg_id) 
WHERE tvg_id IS NOT NULL AND tvg_id != '';

-- Adicionar índice composto para evitar duplicatas reais (mesmo nome + grupo + tipo)
DROP INDEX IF EXISTS idx_catalogo_m3u_live_unique_content;
CREATE INDEX idx_catalogo_m3u_live_unique_content ON public.catalogo_m3u_live (nome, grupo, tipo, ativo);