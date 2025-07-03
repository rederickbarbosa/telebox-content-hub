-- Criar bucket de storage para arquivos JSON
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalog-json', 'catalog-json', true);

-- Criar políticas para o bucket
CREATE POLICY "Admin can manage catalog JSON" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'catalog-json' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Anyone can view catalog JSON" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'catalog-json');