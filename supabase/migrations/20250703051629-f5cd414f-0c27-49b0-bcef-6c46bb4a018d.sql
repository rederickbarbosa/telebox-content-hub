-- Create admin user role and additional tables
-- First, create enum for user roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.user_role DEFAULT 'user';

-- Create admin settings table for configurable options
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Only admins can manage settings"
ON public.admin_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create apps table for managing applications
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  download_url TEXT,
  plataforma TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('gratuito', 'pago')),
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for apps
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Anyone can view active apps
CREATE POLICY "Anyone can view active apps"
ON public.apps
FOR SELECT
USING (ativo = true);

-- Only admins can manage apps
CREATE POLICY "Only admins can manage apps"
ON public.apps
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create notifications table
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo_id UUID REFERENCES public.conteudos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  canal_nome TEXT,
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'nao_lida' CHECK (status IN ('lida', 'nao_lida')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notificacoes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notificacoes
FOR UPDATE
USING (auth.uid() = user_id);

-- Add team preference to profiles
ALTER TABLE public.profiles ADD COLUMN time_favorito TEXT;
ALTER TABLE public.profiles ADD COLUMN foto_url TEXT;

-- Add trigger for apps updated_at
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for admin_settings updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('teste_horas', '6', 'Número de horas para teste grátis'),
('whatsapp_numero', '5511911837288', 'Número do WhatsApp para contato'),
('site_titulo', 'TELEBOX - IPTV', 'Título do site'),
('plano_destaque', '1', 'Qual plano deve ser destacado (1=mensal, 2=bimestral, 3=trimestral)'),
('instagram_url', '', 'URL do Instagram (opcional)'),
('facebook_url', '', 'URL do Facebook (opcional)'),
('telegram_url', '', 'URL do Telegram (opcional)');

-- Insert default apps
INSERT INTO public.apps (nome, logo_url, download_url, plataforma, tipo, destaque) VALUES
('Blink Player', 'https://play-lh.googleusercontent.com/B_RVRpwTQvCrQC7vNmuNixPkPs-C0FnCbN2Ixgc9UmXOAcg_RD-vgN_25IQV-FOhS5YD=w240-h480-rw', 'https://play.google.com/store/apps/details?id=com.iptvBlinkPlayer', 'Android', 'gratuito', false),
('Blink Player Pro', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/5f/5d/0a/5f5d0a9b-6c59-e1fb-be8d-b9ae75d719fc/AppIcon-0-0-1x_U007emarketing-0-8-0-0-sRGB-85-220.png/230x0w.webp', 'https://apps.apple.com/us/app/blink-player-pro/id1635779666', 'iOS', 'gratuito', false),
('Smarters Player Lite', 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/28/35/70/283570d2-298b-0d0f-cc0f-7f81b1e67d30/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.jpeg/230x0w.webp', 'https://apps.apple.com/br/app/smarters-player-lite/id1628995509', 'iOS', 'gratuito', false),
('BOB PLAYER', 'https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051203614x110778080324160930/BOB%20Player.png', '', 'SmartTV', 'pago', true),
('IBO PLAYER PRO', 'https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721058726027x735646428818075500/IBO%20PLAYER%20PRO%204.png', '', 'SmartTV', 'pago', true),
('BAY IPTV', 'https://6a9bd0424edabae5e843df4b48b6f4c6.cdn.bubble.io/cdn-cgi/image/w=96,h=96,f=auto,dpr=1,fit=contain/f1721051166963x413214974482317500/Bay%20IPTV.png', '', 'SmartTV', 'pago', false);

-- Update existing user to admin (you'll need to replace with actual user ID after creating account)
-- This will be done manually after account creation