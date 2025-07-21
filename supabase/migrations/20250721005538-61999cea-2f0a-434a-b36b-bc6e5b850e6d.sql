-- Primeiro remover a constraint problemática, corrigir dados e recriar

-- 1. Remover a constraint
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_tipo_check;

-- 2. Atualizar os dados para os valores corretos
UPDATE apps SET tipo = 'premium' WHERE tipo = 'pago';

-- 3. Recriar a constraint com os valores corretos
ALTER TABLE apps ADD CONSTRAINT apps_tipo_check CHECK (tipo IN ('gratuito', 'premium'));