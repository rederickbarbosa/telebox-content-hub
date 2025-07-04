-- Criar nova tabela para catálogo M3U com importação por chunks
CREATE TABLE IF NOT EXISTS public.catalogo_m3u_live (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tvg_id text UNIQUE,
  nome text NOT NULL,
  grupo text,
  logo text,
  url text NOT NULL,
  tipo text CHECK (tipo IN ('filme', 'serie', 'canal')) DEFAULT 'canal',
  qualidade text DEFAULT 'SD',
  ativo boolean DEFAULT true,
  import_uuid uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogo_tvg_id ON catalogo_m3u_live(tvg_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_grupo ON catalogo_m3u_live(grupo);
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo ON catalogo_m3u_live(tipo);
CREATE INDEX IF NOT EXISTS idx_catalogo_ativo ON catalogo_m3u_live(ativo);
CREATE INDEX IF NOT EXISTS idx_catalogo_import_uuid ON catalogo_m3u_live(import_uuid);

-- RLS policies
ALTER TABLE public.catalogo_m3u_live ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active catalog live" 
ON public.catalogo_m3u_live 
FOR SELECT 
USING (ativo = true);

CREATE POLICY "Service role can manage catalog live" 
ON public.catalogo_m3u_live 
FOR ALL 
USING (true);

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_m3u(current_import_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Desativar canais que não fazem parte da importação atual
  UPDATE catalogo_m3u_live 
  SET ativo = false, updated_at = now()
  WHERE import_uuid != current_import_uuid OR import_uuid IS NULL;
  
  -- Log da operação
  INSERT INTO system_logs (level, message, context)
  VALUES ('info', 'M3U cleanup completed', 
         jsonb_build_object('import_uuid', current_import_uuid));
END;
$$ LANGUAGE plpgsql;

-- Função de limpeza TTL (executar via CRON)
CREATE OR REPLACE FUNCTION public.prune_catalogo()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM catalogo_m3u_live
  WHERE ativo = false AND updated_at < (now() - interval '90 days');
END;
$$;

-- Bucket para chunks M3U
INSERT INTO storage.buckets (id, name, public) 
VALUES ('m3u-parts', 'm3u-parts', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket m3u-parts
CREATE POLICY "Admins can upload M3U parts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'm3u-parts' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view M3U parts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'm3u-parts' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Tabela para fila de enrichment TMDB
CREATE TABLE IF NOT EXISTS public.tmdb_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteudo_id uuid REFERENCES catalogo_m3u_live(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tmdb_pending_status ON tmdb_pending(status);
CREATE INDEX IF NOT EXISTS idx_tmdb_pending_created ON tmdb_pending(created_at);