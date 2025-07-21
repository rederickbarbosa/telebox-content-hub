-- Corrigir os tipos existentes na tabela apps e completar a configuração inicial

-- 1. Corrigir tipos existentes
UPDATE apps SET tipo = 'premium' WHERE tipo = 'pago';

-- 2. Remover constraint existente e adicionar a correta
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_tipo_check;
ALTER TABLE apps ADD CONSTRAINT apps_tipo_check CHECK (tipo IN ('gratuito', 'premium'));

-- 3. Inserir configurações iniciais do admin
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

-- 6. Inserir aplicativos gratuitos padrão se não existir
INSERT INTO apps (nome, tipo, plataforma, download_url, logo_url, destaque, ativo) VALUES 
  ('Blink Player', 'gratuito', 'Android', 'https://play.google.com/store/apps/details?id=com.iptvBlinkPlayer', 'https://play-lh.googleusercontent.com/B_RVRpwTQvCrQC7vNmuNixPkPs-C0FnCbN2Ixgc9UmXOAcg_RD-vgN_25IQV-FOhS5YD=w240-h480-rw', false, true),
  ('Blink Player Pro', 'gratuito', 'iOS', 'https://apps.apple.com/us/app/blink-player-pro/id1635779666', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/5d/0a/5f5d0a9b-6c59-e1fb-be8d-b9ae75d719fc/AppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-85-220.png/230x0w.webp', false, true),
  ('Smarters Player Lite', 'gratuito', 'iOS', 'https://apps.apple.com/br/app/smarters-player-lite/id1628995509', 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/28/35/70/283570d2-298b-0d0f-cc0f-7f81b1e67d30/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.jpeg/230x0w.webp', false, true)
ON CONFLICT (nome) DO NOTHING;