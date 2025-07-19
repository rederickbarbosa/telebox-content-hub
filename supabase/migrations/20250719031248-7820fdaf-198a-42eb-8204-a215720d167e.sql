-- Corrigir a função get_catalog_stats para usar a tabela correta
CREATE OR REPLACE FUNCTION public.get_catalog_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  canais_count INTEGER;
  filmes_count INTEGER;
  series_count INTEGER;
  result jsonb;
BEGIN
  -- Verificar se a tabela catalogo_m3u_live existe, senão usar catalogo_m3u
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'catalogo_m3u_live') THEN
    -- Contar canais
    SELECT COUNT(DISTINCT nome) INTO canais_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'canal';
    
    -- Contar filmes
    SELECT COUNT(DISTINCT nome) INTO filmes_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'filme';
    
    -- Contar séries
    SELECT COUNT(DISTINCT nome) INTO series_count
    FROM catalogo_m3u_live 
    WHERE ativo = true AND tipo = 'serie';
  ELSE
    -- Usar tabela alternativa catalogo_m3u se existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'catalogo_m3u') THEN
      SELECT COUNT(DISTINCT nome) INTO canais_count
      FROM catalogo_m3u 
      WHERE ativo = true AND tipo = 'canal';
      
      SELECT COUNT(DISTINCT nome) INTO filmes_count
      FROM catalogo_m3u 
      WHERE ativo = true AND tipo = 'filme';
      
      SELECT COUNT(DISTINCT nome) INTO series_count
      FROM catalogo_m3u 
      WHERE ativo = true AND tipo = 'serie';
    ELSE
      -- Valores padrão se nenhuma tabela existir
      canais_count := 0;
      filmes_count := 0;
      series_count := 0;
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'canais', canais_count,
    'filmes', filmes_count,
    'series', series_count
  );
  
  RETURN result;
END;
$function$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.get_catalog_stats() IS 'Function with secure search_path and fallback logic for catalog statistics';