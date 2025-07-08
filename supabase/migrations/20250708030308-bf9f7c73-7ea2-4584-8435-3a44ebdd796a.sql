-- Adicionar coluna id como chave primária na tabela catalogo_m3u_live
ALTER TABLE public.catalogo_m3u_live 
ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;