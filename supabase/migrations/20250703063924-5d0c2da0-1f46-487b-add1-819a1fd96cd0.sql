-- Garantir que as políticas RLS estão corretas para as Edge Functions

-- Verificar se existe política para inserção no catálogo_m3u pelo service role
DROP POLICY IF EXISTS "Service role can manage catalog" ON catalogo_m3u;
CREATE POLICY "Service role can manage catalog" 
ON catalogo_m3u 
FOR ALL 
USING (true);

-- Verificar se existe política para inserção na programação pelo service role
DROP POLICY IF EXISTS "Service role can manage programming" ON programacao;
CREATE POLICY "Service role can manage programming" 
ON programacao 
FOR ALL 
USING (true);

-- Permitir inserção de conteúdos pelo service role
DROP POLICY IF EXISTS "Service role can manage content" ON conteudos;
CREATE POLICY "Service role can manage content" 
ON conteudos 
FOR ALL 
USING (true);

-- Permitir leitura de configurações pelo service role
DROP POLICY IF EXISTS "Service role can read settings" ON admin_settings;
CREATE POLICY "Service role can read settings" 
ON admin_settings 
FOR SELECT 
USING (true);

-- Permitir atualização de configurações pelo service role
DROP POLICY IF EXISTS "Service role can update settings" ON admin_settings;
CREATE POLICY "Service role can update settings" 
ON admin_settings 
FOR ALL 
USING (true);

-- Inserir configurações padrão se não existirem
INSERT INTO admin_settings (setting_key, setting_value, description) 
VALUES 
  ('epg_url', 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc', 'URL do EPG XMLTV'),
  ('tmdb_token', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA', 'Token da API TMDB')
ON CONFLICT (setting_key) DO NOTHING;