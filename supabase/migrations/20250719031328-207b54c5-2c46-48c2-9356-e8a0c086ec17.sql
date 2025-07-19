-- Corrigir a função get_catalog_stats com abordagem mais direta
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
  result jsonb;
BEGIN
  -- Tentar usar catalogo_m3u_live primeiro
  BEGIN
    SELECT COUNT(DISTINCT nome) INTO canais_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'canal';
    
    SELECT COUNT(DISTINCT nome) INTO filmes_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'filme';
    
    SELECT COUNT(DISTINCT nome) INTO series_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'serie';
  EXCEPTION 
    WHEN undefined_table THEN
      -- Se a tabela não existir, tentar catalogo_m3u
      BEGIN
        SELECT COUNT(DISTINCT nome) INTO canais_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'canal';
        
        SELECT COUNT(DISTINCT nome) INTO filmes_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'filme';
        
        SELECT COUNT(DISTINCT nome) INTO series_count
        FROM catalogo_m3u 
        WHERE ativo = true AND tipo = 'serie';
      EXCEPTION 
        WHEN undefined_table THEN
          -- Se nenhuma tabela existir, retornar zeros
          canais_count := 0;
          filmes_count := 0;
          series_count := 0;
      END;
  END;
  
  result := jsonb_build_object(
    'canais', canais_count,
    'filmes', filmes_count,
    'series', series_count
  );
  
  RETURN result;
END;
$function$;