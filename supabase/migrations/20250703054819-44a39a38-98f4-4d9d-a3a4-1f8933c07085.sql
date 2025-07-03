-- Inserir dados de exemplo para testar se necessário
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('apps_gerenciamento_ativo', 'true', 'Se o gerenciamento de apps está ativo'),
('notificacoes_ativas', 'true', 'Se as notificações estão ativas')
ON CONFLICT (setting_key) DO NOTHING;