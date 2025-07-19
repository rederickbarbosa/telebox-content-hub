-- Criar função para extrair nome base da série (sem temporada/episódio)
CREATE OR REPLACE FUNCTION public.extract_series_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  -- Remover padrões de temporada/episódio como S01E01, S1E1, etc.
  RETURN TRIM(REGEXP_REPLACE(
    full_name, 
    '\s*(S\d{1,2}E\d{1,3}|Season\s*\d+|Temporada\s*\d+|Ep\s*\d+|Episode\s*\d+|\s*-\s*\d+x\d+).*$', 
    '', 
    'i'
  ));
END;
$function$;

-- Criar função para extrair informações de temporada/episódio
CREATE OR REPLACE FUNCTION public.extract_season_episode(full_name text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
DECLARE
  season_match text;
  episode_match text;
  season_num integer := NULL;
  episode_num integer := NULL;
BEGIN
  -- Extrair temporada (S01, Season 1, Temporada 1, etc.)
  season_match := SUBSTRING(full_name FROM 'S(\d{1,2})' FOR '#' ESCAPE '#');
  IF season_match IS NULL THEN
    season_match := SUBSTRING(full_name FROM 'Season\s*(\d+)' FOR '#' ESCAPE '#');
  END IF;
  IF season_match IS NULL THEN
    season_match := SUBSTRING(full_name FROM 'Temporada\s*(\d+)' FOR '#' ESCAPE '#');
  END IF;
  
  -- Extrair episódio (E01, Episode 1, Ep 1, etc.)
  episode_match := SUBSTRING(full_name FROM 'E(\d{1,3})' FOR '#' ESCAPE '#');
  IF episode_match IS NULL THEN
    episode_match := SUBSTRING(full_name FROM 'Episode\s*(\d+)' FOR '#' ESCAPE '#');
  END IF;
  IF episode_match IS NULL THEN
    episode_match := SUBSTRING(full_name FROM 'Ep\s*(\d+)' FOR '#' ESCAPE '#');
  END IF;
  
  -- Converter para integer se encontrado
  IF season_match IS NOT NULL THEN
    season_num := season_match::integer;
  END IF;
  IF episode_match IS NOT NULL THEN
    episode_num := episode_match::integer;
  END IF;
  
  RETURN jsonb_build_object(
    'season', season_num,
    'episode', episode_num,
    'season_text', COALESCE('S' || LPAD(season_num::text, 2, '0'), NULL),
    'episode_text', COALESCE('E' || LPAD(episode_num::text, 2, '0'), NULL)
  );
END;
$function$;

-- Atualizar função de estatísticas para contar séries únicas
CREATE OR REPLACE FUNCTION public.get_catalog_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  canais_count INTEGER := 0;
  filmes_count INTEGER := 0;
  series_count INTEGER := 0;
  series_episodes_count INTEGER := 0;
  result jsonb;
BEGIN
  BEGIN
    -- Contar canais
    SELECT COUNT(DISTINCT nome) INTO canais_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'canal';
    
    -- Contar filmes
    SELECT COUNT(DISTINCT nome) INTO filmes_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'filme';
    
    -- Contar séries únicas (agrupadas por nome base)
    SELECT COUNT(DISTINCT extract_series_name(nome)) INTO series_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'serie';
    
    -- Contar total de episódios
    SELECT COUNT(*) INTO series_episodes_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'serie';
    
  EXCEPTION 
    WHEN undefined_table THEN
      BEGIN
        SELECT COUNT(DISTINCT nome) INTO canais_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'canal';
        
        SELECT COUNT(DISTINCT nome) INTO filmes_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'filme';
        
        SELECT COUNT(DISTINCT extract_series_name(nome)) INTO series_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'serie';
        
        SELECT COUNT(*) INTO series_episodes_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'serie';
      EXCEPTION 
        WHEN undefined_table THEN
          canais_count := 0;
          filmes_count := 0;
          series_count := 0;
          series_episodes_count := 0;
      END;
  END;
  
  result := jsonb_build_object(
    'canais', canais_count,
    'filmes', filmes_count,
    'series', series_count,
    'episodios', series_episodes_count
  );
  
  RETURN result;
END;
$function$;