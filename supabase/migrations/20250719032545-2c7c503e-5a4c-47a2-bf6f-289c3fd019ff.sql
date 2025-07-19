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
    WHERE ativo = true AND tipo = 'serie'
    AND extract_series_name(nome) != '';
    
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
        WHERE ativo = true AND tipo = 'serie'
        AND extract_series_name(nome) != '';
        
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