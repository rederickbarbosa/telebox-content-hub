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
    'gi'
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
  season_match text[];
  episode_match text[];
  season_num integer := NULL;
  episode_num integer := NULL;
BEGIN
  -- Extrair temporada usando REGEXP_MATCH
  season_match := REGEXP_MATCH(full_name, 'S(\d{1,2})', 'i');
  IF season_match IS NULL THEN
    season_match := REGEXP_MATCH(full_name, 'Season\s*(\d+)', 'i');
  END IF;
  IF season_match IS NULL THEN
    season_match := REGEXP_MATCH(full_name, 'Temporada\s*(\d+)', 'i');
  END IF;
  
  -- Extrair episódio usando REGEXP_MATCH
  episode_match := REGEXP_MATCH(full_name, 'E(\d{1,3})', 'i');
  IF episode_match IS NULL THEN
    episode_match := REGEXP_MATCH(full_name, 'Episode\s*(\d+)', 'i');
  END IF;
  IF episode_match IS NULL THEN
    episode_match := REGEXP_MATCH(full_name, 'Ep\s*(\d+)', 'i');
  END IF;
  
  -- Converter para integer se encontrado
  IF season_match IS NOT NULL AND array_length(season_match, 1) > 0 THEN
    season_num := season_match[1]::integer;
  END IF;
  IF episode_match IS NOT NULL AND array_length(episode_match, 1) > 0 THEN
    episode_num := episode_match[1]::integer;
  END IF;
  
  RETURN jsonb_build_object(
    'season', season_num,
    'episode', episode_num,
    'season_text', CASE WHEN season_num IS NOT NULL THEN 'S' || LPAD(season_num::text, 2, '0') ELSE NULL END,
    'episode_text', CASE WHEN episode_num IS NOT NULL THEN 'E' || LPAD(episode_num::text, 2, '0') ELSE NULL END
  );
END;
$function$;