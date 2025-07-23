-- Adicionar campos necessários para funcionalidades pendentes

-- 1. Adicionar campo para foto de perfil na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS time_favorito TEXT;

-- 2. Criar sistema de cache para EPG
CREATE TABLE IF NOT EXISTS public.epg_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_nome TEXT NOT NULL,
  data_programa DATE NOT NULL,
  programas JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '6 hours'),
  
  UNIQUE(canal_nome, data_programa)
);

-- Habilitar RLS na tabela epg_cache
ALTER TABLE public.epg_cache ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública do cache EPG
CREATE POLICY "EPG cache is publicly readable" 
ON public.epg_cache 
FOR SELECT 
USING (true);

-- Política para service role gerenciar cache EPG
CREATE POLICY "Service role can manage EPG cache" 
ON public.epg_cache 
FOR ALL 
USING (true);

-- 3. Adicionar tabela para favoritos de usuários
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('canal', 'filme', 'serie')),
  content_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, content_id, content_type)
);

-- Habilitar RLS na tabela user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Políticas para favoritos
CREATE POLICY "Users can view their own favorites" 
ON public.user_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" 
ON public.user_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Função para limpar cache EPG expirado
CREATE OR REPLACE FUNCTION public.cleanup_epg_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM epg_cache 
  WHERE expires_at < now();
  
  INSERT INTO system_logs (level, message, context)
  VALUES ('info', 'EPG cache cleanup completed', 
         jsonb_build_object('cleaned_at', now()));
END;
$$;

-- 5. Função para gerar notificações de jogos baseado no time favorito
CREATE OR REPLACE FUNCTION public.create_team_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_record record;
  programa_record record;
BEGIN
  -- Para cada usuário com time favorito definido
  FOR profile_record IN 
    SELECT user_id, time_favorito 
    FROM profiles 
    WHERE time_favorito IS NOT NULL AND time_favorito != ''
  LOOP
    -- Buscar jogos do time favorito na programação de hoje e amanhã
    FOR programa_record IN
      SELECT DISTINCT canal_nome, programa, inicio, fim
      FROM programacao 
      WHERE (programa ILIKE '%' || profile_record.time_favorito || '%'
             OR descricao ILIKE '%' || profile_record.time_favorito || '%')
      AND inicio::date BETWEEN current_date AND current_date + interval '1 day'
      AND inicio > now()
    LOOP
      -- Inserir notificação se não existir
      INSERT INTO notificacoes (user_id, tipo, mensagem, canal_nome, data_envio, status)
      VALUES (
        profile_record.user_id,
        'jogo',
        'Seu time ' || profile_record.time_favorito || ' joga hoje às ' || 
        to_char(programa_record.inicio, 'HH24:MI') || ' no ' || programa_record.canal_nome,
        programa_record.canal_nome,
        now(),
        'nao_lida'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  INSERT INTO system_logs (level, message, context)
  VALUES ('info', 'Team notifications created', 
         jsonb_build_object('created_at', now()));
END;
$$;

-- 6. Trigger para atualizar campo updated_at em epg_cache
CREATE OR REPLACE TRIGGER update_epg_cache_updated_at
    BEFORE UPDATE ON public.epg_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Comentários das novas funcionalidades
COMMENT ON TABLE public.epg_cache IS 'Cache para dados EPG com expiração automática';
COMMENT ON TABLE public.user_favorites IS 'Favoritos dos usuários (canais, filmes, séries)';
COMMENT ON FUNCTION public.cleanup_epg_cache() IS 'Remove entradas expiradas do cache EPG';
COMMENT ON FUNCTION public.create_team_notifications() IS 'Cria notificações para jogos dos times favoritos dos usuários';