
-- Primeiro, vamos garantir que a tabela catalogo_m3u_live tenha a estrutura correta
-- com campos nullable e defaults apropriados
ALTER TABLE catalogo_m3u_live 
ALTER COLUMN nome DROP NOT NULL,
ALTER COLUMN url DROP NOT NULL;

-- Adicionar defaults para campos essenciais se não existirem
ALTER TABLE catalogo_m3u_live 
ALTER COLUMN nome SET DEFAULT 'Sem nome',
ALTER COLUMN tipo SET DEFAULT 'canal',
ALTER COLUMN qualidade SET DEFAULT 'SD',
ALTER COLUMN ativo SET DEFAULT true;

-- Desabilitar temporariamente RLS para teste
ALTER TABLE catalogo_m3u_live DISABLE ROW LEVEL SECURITY;

-- Criar policy permissiva para service role
CREATE POLICY IF NOT EXISTS "Allow service role full access" 
ON catalogo_m3u_live 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Reabilitar RLS
ALTER TABLE catalogo_m3u_live ENABLE ROW LEVEL SECURITY;

-- Verificar se não há triggers que possam estar bloqueando inserts
-- (esta query apenas mostra os triggers existentes, não os remove)
SELECT 
    schemaname,
    tablename,
    triggername,
    tgtype,
    tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'catalogo_m3u_live';

-- Criar índices para otimizar performance
CREATE INDEX IF NOT EXISTS idx_catalogo_m3u_live_nome ON catalogo_m3u_live(nome);
CREATE INDEX IF NOT EXISTS idx_catalogo_m3u_live_tipo ON catalogo_m3u_live(tipo);
CREATE INDEX IF NOT EXISTS idx_catalogo_m3u_live_ativo ON catalogo_m3u_live(ativo);
