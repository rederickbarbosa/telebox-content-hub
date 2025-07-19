-- Adicionar política para permitir que usuários deletem suas próprias notificações
CREATE POLICY "Users can delete their own notifications" 
ON public.notificacoes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Comentário explicativo
COMMENT ON POLICY "Users can delete their own notifications" ON public.notificacoes IS 'Allows users to delete their own notifications for better UX';