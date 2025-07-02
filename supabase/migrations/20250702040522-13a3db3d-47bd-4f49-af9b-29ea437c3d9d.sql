-- Criar tabelas para o sistema TELEBOX

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conteúdos (filmes, séries, canais)
CREATE TABLE public.conteudos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('filme', 'serie', 'canal')),
  nome TEXT NOT NULL,
  nome_original TEXT,
  descricao TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  tmdb_id INTEGER,
  ano INTEGER,
  classificacao DECIMAL(3,1),
  generos TEXT[],
  pais TEXT DEFAULT 'BR',
  disponivel BOOLEAN DEFAULT true,
  m3u_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico do usuário
CREATE TABLE public.user_content_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo_id UUID NOT NULL REFERENCES public.conteudos(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('quero_ver', 'assistindo', 'assistido')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conteudo_id)
);

-- Tabela de programação EPG
CREATE TABLE public.programacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_id UUID REFERENCES public.conteudos(id) ON DELETE CASCADE,
  canal_nome TEXT NOT NULL,
  programa_nome TEXT NOT NULL,
  programa_descricao TEXT,
  inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fim TIMESTAMP WITH TIME ZONE NOT NULL,
  categoria TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programacao ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para conteudos (público para leitura)
CREATE POLICY "Anyone can view content" ON public.conteudos
  FOR SELECT USING (true);

-- Políticas para user_content_status
CREATE POLICY "Users can manage their own content status" ON public.user_content_status
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para programacao (público para leitura)
CREATE POLICY "Anyone can view programming" ON public.programacao
  FOR SELECT USING (true);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conteudos_updated_at
  BEFORE UPDATE ON public.conteudos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_content_status_updated_at
  BEFORE UPDATE ON public.user_content_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para melhor performance
CREATE INDEX idx_conteudos_tipo ON public.conteudos(tipo);
CREATE INDEX idx_conteudos_tmdb_id ON public.conteudos(tmdb_id);
CREATE INDEX idx_programacao_canal ON public.programacao(canal_nome);
CREATE INDEX idx_programacao_inicio ON public.programacao(inicio);
CREATE INDEX idx_user_content_user_id ON public.user_content_status(user_id);