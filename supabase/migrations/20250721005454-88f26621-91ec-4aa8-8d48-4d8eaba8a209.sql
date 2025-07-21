-- Corrigir definitivamente a constraint da tabela apps

-- 1. Remover a constraint antiga que ainda tem 'pago'
ALTER TABLE apps DROP CONSTRAINT apps_tipo_check;

-- 2. Adicionar a constraint correta com 'premium'
ALTER TABLE apps ADD CONSTRAINT apps_tipo_check CHECK (tipo IN ('gratuito', 'premium'));

-- 3. Inserir configurações iniciais do admin (sem apps para evitar conflito)
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES 
  ('whatsapp_numero', '5511911837288', 'Número do WhatsApp para contato'),
  ('instagram_url', 'https://www.instagram.com/teleboxbrasil/', 'URL do Instagram oficial'),
  ('tmdb_token', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA', 'Token da API do TMDB'),
  ('epg_url', 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc', 'URL do EPG XMLTV')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = COALESCE(EXCLUDED.description, admin_settings.description);

-- 4. Inserir configurações da home se não existir
INSERT INTO admin_home_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM admin_home_settings);

-- 5. Inserir planos padrão se não existir
INSERT INTO admin_plans (name, price, duration_months, features, is_active, is_popular, whatsapp_message, order_position) VALUES 
  ('Mensal', 30, 1, ARRAY['Acesso completo ao catálogo', 'Suporte 24h', 'Qualidade HD/4K', 'Apps gratuitos'], true, true, 'Olá! Quero contratar o plano Mensal do TELEBOX por R$ 30,00.', 1),
  ('Trimestral', 80, 3, ARRAY['Acesso completo ao catálogo', 'Suporte 24h', 'Qualidade HD/4K', 'Apps gratuitos', 'Economia de R$ 10'], true, false, 'Olá! Quero contratar o plano Trimestral do TELEBOX por R$ 80,00.', 2),
  ('Semestral', 150, 6, ARRAY['Acesso completo ao catálogo', 'Suporte 24h', 'Qualidade HD/4K', 'Apps gratuitos', 'Economia de R$ 30'], true, false, 'Olá! Quero contratar o plano Semestral do TELEBOX por R$ 150,00.', 3)
ON CONFLICT (name) DO NOTHING;