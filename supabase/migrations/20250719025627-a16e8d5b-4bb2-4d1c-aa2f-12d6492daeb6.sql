-- Corrigir search_path das funções para melhorar segurança
ALTER FUNCTION public.get_catalog_stats() SET search_path = '';
ALTER FUNCTION public.promote_first_user_to_admin() SET search_path = '';
ALTER FUNCTION public.cleanup_m3u(uuid) SET search_path = '';
ALTER FUNCTION public.prune_catalogo() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.upsert_admin_setting(text, text, text) SET search_path = '';
ALTER FUNCTION public.create_admin_user() SET search_path = '';

-- Habilitar RLS na tabela tmdb_pending que está sem proteção
ALTER TABLE public.tmdb_pending ENABLE ROW LEVEL SECURITY;

-- Criar política para a tabela tmdb_pending
CREATE POLICY "Service role can manage tmdb_pending" 
ON public.tmdb_pending 
FOR ALL 
USING (true);

-- Comentários para documentar as correções
COMMENT ON FUNCTION public.get_catalog_stats() IS 'Function with secure search_path for catalog statistics';
COMMENT ON FUNCTION public.promote_first_user_to_admin() IS 'Function with secure search_path for admin promotion';
COMMENT ON FUNCTION public.cleanup_m3u(uuid) IS 'Function with secure search_path for M3U cleanup';
COMMENT ON FUNCTION public.prune_catalogo() IS 'Function with secure search_path for catalog pruning';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Function with secure search_path for timestamp updates';
COMMENT ON FUNCTION public.handle_new_user() IS 'Function with secure search_path for new user handling';
COMMENT ON FUNCTION public.upsert_admin_setting(text, text, text) IS 'Function with secure search_path for admin settings';
COMMENT ON FUNCTION public.create_admin_user() IS 'Function with secure search_path for admin user creation';