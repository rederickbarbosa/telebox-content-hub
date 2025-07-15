-- Inserir configurações padrão se não existirem
INSERT INTO admin_settings (setting_key, setting_value, description) 
VALUES 
  ('epg_xmltv_url', 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc', 'URL do XMLTV para EPG'),
  ('tmdb_token', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA', 'Token de API do TMDB'),
  ('whatsapp_number', '5511911837288', 'Número do WhatsApp para contato'),
  ('openrouter_model', 'openai/gpt-4o-mini', 'Modelo de IA do OpenRouter')
ON CONFLICT (setting_key) DO NOTHING;

-- Atualizar configurações de home para usar stats dinâmicos
UPDATE admin_home_settings 
SET hero_description = 'A melhor plataforma de IPTV do Brasil com mais de {canais} canais, {filmes} filmes e {series} séries em alta qualidade.'
WHERE hero_description NOT LIKE '%{canais}%';

-- Criar função para contagem de estatísticas
CREATE OR REPLACE FUNCTION get_catalog_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  canais_count INTEGER;
  filmes_count INTEGER;
  series_count INTEGER;
  result jsonb;
BEGIN
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
  
  result := jsonb_build_object(
    'canais', canais_count,
    'filmes', filmes_count,
    'series', series_count
  );
  
  RETURN result;
END;
$$;