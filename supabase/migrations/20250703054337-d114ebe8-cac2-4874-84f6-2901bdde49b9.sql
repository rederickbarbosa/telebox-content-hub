-- Alterar role do usuário email@erickbarbosa.com para admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'email@erickbarbosa.com';

-- Inserir configurações adicionais para EPG e TMDB
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('epg_url', 'http://zed7.top/xmltv.php?username=spg9tct&password=r846kdc', 'URL do XML EPG para programação'),
('tmdb_token', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YmU4YmIzNmVlMWVlZmQ1YTAxNjNkOTA4OTU5MzczMSIsIm5iZiI6MTc1MDAyMTg2OS44MjIsInN1YiI6IjY4NGYzNmVkMzI3NDY0N2M0ZDI5NTAxYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GTS74gYaVoWQHAQlz6kBvWYmGL9n6gGethzJHW7qzEA', 'Token da API TMDB'),
('home_descricao', 'Acesse mais de 200.000 conteúdos dos principais streamings, canais abertos e fechados em uma única plataforma', 'Descrição da home page'),
('site_url', 'https://web.telebox.com.br', 'URL da plataforma web');

-- Criar tabela para armazenar dados do catálogo M3U convertido
CREATE TABLE public.catalogo_m3u (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo TEXT,
  tvg_id TEXT,
  tvg_logo TEXT,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('canal', 'filme', 'serie')),
  qualidade TEXT,
  regiao TEXT,
  ativo BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for catalogo_m3u
ALTER TABLE public.catalogo_m3u ENABLE ROW LEVEL SECURITY;

-- Anyone can view active catalog items
CREATE POLICY "Anyone can view active catalog"
ON public.catalogo_m3u
FOR SELECT
USING (ativo = true);

-- Only admins can manage catalog
CREATE POLICY "Only admins can manage catalog"
ON public.catalogo_m3u
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Add trigger for catalogo_m3u updated_at
CREATE TRIGGER update_catalogo_m3u_updated_at
  BEFORE UPDATE ON public.catalogo_m3u
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();