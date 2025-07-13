-- Popular dados padrão para admin_home_settings caso não existam
INSERT INTO admin_home_settings (
  hero_description,
  stats_canais_label,
  stats_filmes_label,
  stats_series_label,
  stats_qualidade_label,
  stats_qualidade_descricao,
  features_title,
  features_subtitle,
  feature_1_title,
  feature_1_description,
  feature_2_title,
  feature_2_description,
  feature_3_title,
  feature_3_description,
  featured_channels_ids,
  channel_carousel_enabled
) 
SELECT 
  'A melhor plataforma de IPTV do Brasil com mais de {canais} canais, {filmes} filmes e {series} séries em alta qualidade.',
  'Canais',
  'Filmes', 
  'Séries',
  'HD/4K',
  'Qualidade',
  'Por que escolher o TELEBOX?',
  'Tecnologia de ponta e qualidade incomparável',
  'Cobertura Global',
  'Canais de todo o mundo com transmissão em tempo real',
  'Qualidade 4K',
  'Transmissão em ultra alta definição sem travamentos',
  'Disponibilidade Total',
  'Acesso completo ao catálogo 24 horas por dia',
  '{}',
  true
WHERE NOT EXISTS (SELECT 1 FROM admin_home_settings);

-- Popular planos padrão caso não existam
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
) 
SELECT 
  '1 Mês',
  1,
  30.00,
  null,
  null,
  true,
  true,
  1,
  ARRAY['Acesso completo', 'Todos os canais e filmes', 'Apps gratuitos'],
  'Olá! Quero contratar o plano de 1 mês do TELEBOX por R$ 30,00.'
WHERE NOT EXISTS (SELECT 1 FROM admin_plans WHERE name = '1 Mês');

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
) 
SELECT 
  '2 Meses',
  2,
  55.00,
  60.00,
  5.00,
  false,
  true,
  2,
  ARRAY['Acesso completo', 'Todos os canais e filmes', 'Apps gratuitos'],
  'Olá! Quero contratar o plano de 2 meses do TELEBOX por R$ 55,00.'
WHERE NOT EXISTS (SELECT 1 FROM admin_plans WHERE name = '2 Meses');

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
) 
SELECT 
  '3 Meses',
  3,
  80.00,
  90.00,
  10.00,
  false,
  true,
  3,
  ARRAY['Acesso completo', 'Todos os canais e filmes', 'Apps gratuitos'],
  'Olá! Quero contratar o plano de 3 meses do TELEBOX por R$ 80,00.'
WHERE NOT EXISTS (SELECT 1 FROM admin_plans WHERE name = '3 Meses');