-- Criar tabela para configurações do admin sobre estatísticas da home
CREATE TABLE admin_home_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Estatísticas da home
  hero_description TEXT DEFAULT 'A melhor plataforma de IPTV do Brasil com mais de {canais} canais, {filmes} filmes e {series} séries em alta qualidade.',
  stats_canais_label TEXT DEFAULT 'Canais',
  stats_filmes_label TEXT DEFAULT 'Filmes', 
  stats_series_label TEXT DEFAULT 'Séries',
  stats_qualidade_label TEXT DEFAULT 'HD/4K',
  stats_qualidade_descricao TEXT DEFAULT 'Qualidade',
  
  -- Seções da home editáveis
  features_title TEXT DEFAULT 'Por que escolher o TELEBOX?',
  features_subtitle TEXT DEFAULT 'Tecnologia de ponta e qualidade incomparável',
  
  feature_1_title TEXT DEFAULT 'Cobertura Global',
  feature_1_description TEXT DEFAULT 'Canais de todo o mundo com transmissão em tempo real',
  
  feature_2_title TEXT DEFAULT 'Qualidade 4K', 
  feature_2_description TEXT DEFAULT 'Transmissão em ultra alta definição sem travamentos',
  
  feature_3_title TEXT DEFAULT 'Disponibilidade Total',
  feature_3_description TEXT DEFAULT 'Acesso completo ao catálogo 24 horas por dia',
  
  -- Canais destacados (array de IDs)
  featured_channels_ids UUID[] DEFAULT '{}',
  
  -- Carrossel ativo
  channel_carousel_enabled BOOLEAN DEFAULT true
);

-- Criar tabela para planos configuráveis
CREATE TABLE admin_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  savings DECIMAL(10,2),
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features TEXT[] DEFAULT '{}',
  order_position INTEGER DEFAULT 0,
  whatsapp_message TEXT
);

-- RLS para admin_home_settings
ALTER TABLE admin_home_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage home settings"
  ON admin_home_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Service role can manage home settings"
  ON admin_home_settings FOR ALL
  USING (true);

-- RLS para admin_plans  
ALTER TABLE admin_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON admin_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage plans"
  ON admin_plans FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Service role can manage plans"
  ON admin_plans FOR ALL
  USING (true);

-- Inserir configuração padrão da home
INSERT INTO admin_home_settings (id) VALUES (gen_random_uuid());

-- Inserir planos padrão
INSERT INTO admin_plans (name, duration_months, price, is_popular, features, order_position, whatsapp_message) VALUES 
('1 Mês', 1, 30.00, true, '{"Acesso completo", "Todos os canais e filmes", "Suporte 24h", "Apps gratuitos"}', 1, 'Olá! Quero contratar o plano de 1 mês por R$ 30,00.'),
('2 Meses', 2, 55.00, false, '{"Acesso completo", "Todos os canais e filmes", "Suporte prioritário", "Apps gratuitos"}', 2, 'Olá! Quero contratar o plano de 2 meses por R$ 55,00.'),
('3 Meses', 3, 80.00, false, '{"Acesso completo", "Todos os canais e filmes", "Suporte VIP", "Apps gratuitos"}', 3, 'Olá! Quero contratar o plano de 3 meses por R$ 80,00.');

-- Triggers para updated_at
CREATE TRIGGER update_admin_home_settings_updated_at
  BEFORE UPDATE ON admin_home_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_plans_updated_at
  BEFORE UPDATE ON admin_plans  
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();