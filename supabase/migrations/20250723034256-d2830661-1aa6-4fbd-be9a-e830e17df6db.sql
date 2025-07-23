-- Atualizar configuração padrão para destacar o plano mensal de R$ 30
UPDATE admin_plans 
SET is_popular = false 
WHERE is_popular = true;

-- Inserir/atualizar plano mensal como destaque
INSERT INTO admin_plans (
  name, 
  duration_months, 
  price, 
  original_price,
  savings,
  is_popular, 
  is_active,
  order_position,
  features, 
  whatsapp_message
) VALUES (
  'Plano Mensal',
  1,
  30.00,
  55.00,
  25.00,
  true,
  true,
  1,
  ARRAY[
    'Acesso completo ao catálogo',
    'Canais HD e 4K',
    'Filmes e séries ilimitados',
    'Apps gratuitos inclusos',
    'Suporte 24h via WhatsApp'
  ],
  'Olá! Quero contratar o Plano Mensal de R$ 30,00. Como posso prosseguir?'
)
ON CONFLICT DO NOTHING;

-- Garantir que outros planos não sejam populares
UPDATE admin_plans 
SET is_popular = false 
WHERE name != 'Plano Mensal';

-- Inserir configurações de admin se não existirem
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
  ('whatsapp_numero', '5511911837288', 'Número do WhatsApp para contato'),
  ('instagram_url', 'https://www.instagram.com/teleboxbrasil/', 'URL do Instagram oficial')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value;