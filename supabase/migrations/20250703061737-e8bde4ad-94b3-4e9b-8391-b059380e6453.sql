-- Função para criar usuário admin inicial
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
BEGIN
  -- Verificar se já existe um admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) THEN
    -- Criar perfil admin para o primeiro usuário se nenhum admin existir
    -- Isso deve ser feito após o primeiro usuário se registrar
    -- O email será definido via trigger quando o primeiro usuário se cadastrar
    RAISE NOTICE 'Nenhum admin encontrado. O primeiro usuário a se registrar será promovido a admin.';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para promover o primeiro usuário a admin
CREATE OR REPLACE FUNCTION promote_first_user_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não existe nenhum admin, promover este usuário
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) THEN
    NEW.role = 'admin';
    INSERT INTO system_logs (level, message, context)
    VALUES ('info', 'Primeiro usuário promovido a administrador', 
           jsonb_build_object('user_id', NEW.user_id, 'email', NEW.email));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nos novos perfis
DROP TRIGGER IF EXISTS auto_promote_first_admin ON profiles;
CREATE TRIGGER auto_promote_first_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION promote_first_user_to_admin();