-- Inserir configurações iniciais se não existirem
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
  ('teste_horas', '6', 'Horas de teste grátis oferecidas'),
  ('whatsapp_numero', '5511911837288', 'Número do WhatsApp para contato'),
  ('plano_destaque', '1', 'ID do plano em destaque (1=1mês, 2=2meses, 3=3meses)'),
  ('tmdb_token', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA', 'Token de acesso da API TMDB'),
  ('epg_url', 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc', 'URL do XMLTV para programação EPG'),
  ('site_titulo', 'A melhor IPTV do Brasil', 'Título principal do site'),
  ('home_descricao', 'Acesse mais de 200.000 conteúdos dos principais streamings, canais abertos e fechados em uma única plataforma', 'Descrição da home page'),
  ('instagram_url', 'https://www.instagram.com/teleboxbrasil/', 'URL do Instagram'),
  ('site_url', 'https://web.telebox.com.br', 'URL da plataforma web')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Criar usuário admin inicial se não existir
DO $$
BEGIN
  -- Verificar se já existe um admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) THEN
    -- Inserir perfil admin para o email configurado
    INSERT INTO profiles (user_id, nome, email, role)
    SELECT 
      gen_random_uuid(), 
      'Administrador TELEBOX', 
      'email@erickbarbosa.com', 
      'admin'
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles WHERE email = 'email@erickbarbosa.com'
    );
    
    INSERT INTO system_logs (level, message, context)
    VALUES ('info', 'Admin inicial criado via migração', 
           jsonb_build_object('email', 'email@erickbarbosa.com'));
  END IF;
END $$;