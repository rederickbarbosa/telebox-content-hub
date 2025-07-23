-- Garantir que pelo menos um app de destaque gratuito exista
INSERT INTO apps (nome, tipo, plataforma, logo_url, download_url, destaque, ativo) VALUES
(
  'TELEBOX Player',
  'gratuito',
  'android',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=100&h=100&fit=crop&crop=center',
  'https://play.google.com/store/apps',
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Inserir mais alguns apps básicos se necessário
INSERT INTO apps (nome, tipo, plataforma, logo_url, download_url, destaque, ativo) VALUES
(
  'TELEBOX Smart TV',
  'gratuito',
  'smart-tv',
  'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=100&h=100&fit=crop&crop=center',
  'https://smarttv.app',
  false,
  true
),
(
  'TELEBOX Premium',
  'premium',
  'multi-plataforma',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop&crop=center',
  null,
  true,
  true
)
ON CONFLICT DO NOTHING;