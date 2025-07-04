-- Adicionar campos TMDB à tabela catalogo_m3u_live
ALTER TABLE public.catalogo_m3u_live 
ADD COLUMN IF NOT EXISTS poster_url text,
ADD COLUMN IF NOT EXISTS backdrop_url text,
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS tmdb_id integer,
ADD COLUMN IF NOT EXISTS ano integer,
ADD COLUMN IF NOT EXISTS classificacao numeric;