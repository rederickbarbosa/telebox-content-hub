-- Corrigir dados da tabela apps em etapas para garantir consistência

-- 1. Atualizar TODOS os registros que não estão corretos
UPDATE apps SET tipo = 'premium' WHERE tipo NOT IN ('gratuito', 'premium');

-- 2. Verificar que todos os dados estão corretos agora
SELECT DISTINCT tipo FROM apps;