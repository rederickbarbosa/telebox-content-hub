-- Corrigir problemas de constraint duplicada no admin_settings
-- Primeiro, vamos criar a constraint UPSERT safe
CREATE OR REPLACE FUNCTION upsert_admin_setting(key TEXT, value TEXT, description_text TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_settings (setting_key, setting_value, description)
  VALUES (key, value, description_text)
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = COALESCE(EXCLUDED.description, admin_settings.description),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Corrigir problema de RLS nas notificações - permitir inserção pelo sistema
CREATE POLICY "System can insert notifications" ON notificacoes
FOR INSERT 
USING (true);

-- Criar tabela para logs de sistema se não existir
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins verem logs
CREATE POLICY "Admins can view system logs" ON system_logs
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);