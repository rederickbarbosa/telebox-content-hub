-- Inserir dados de exemplo para testes
INSERT INTO conteudos (nome, tipo, poster_url, generos, ano, disponivel)
VALUES 
('Cidade de Deus', 'filme', 'https://image.tmdb.org/t/p/w500/example1.jpg', ARRAY['Drama', 'Crime'], 2002, true),
('Elite', 'serie', 'https://image.tmdb.org/t/p/w500/example2.jpg', ARRAY['Drama', 'Suspense'], 2018, true),
('La Casa de Papel', 'serie', 'https://image.tmdb.org/t/p/w500/example3.jpg', ARRAY['Crime', 'Drama'], 2017, true),
('Vingadores: Ultimato', 'filme', 'https://image.tmdb.org/t/p/w500/example4.jpg', ARRAY['Ação', 'Aventura'], 2019, true),
('Breaking Bad', 'serie', 'https://image.tmdb.org/t/p/w500/example5.jpg', ARRAY['Crime', 'Drama'], 2008, true);

-- Inserir dados de exemplo no catálogo M3U
INSERT INTO catalogo_m3u (nome, tipo, grupo, qualidade, regiao, url, tvg_logo)
VALUES 
('Globo SP', 'canal', 'Canais Abertos', 'HD', 'SP', 'http://example.com/globo-sp', 'https://example.com/logo-globo.png'),
('SBT SP', 'canal', 'Canais Abertos', 'HD', 'SP', 'http://example.com/sbt-sp', 'https://example.com/logo-sbt.png'),
('Record SP', 'canal', 'Canais Abertos', 'HD', 'SP', 'http://example.com/record-sp', 'https://example.com/logo-record.png'),
('Band SP', 'canal', 'Canais Abertos', 'HD', 'SP', 'http://example.com/band-sp', 'https://example.com/logo-band.png'),
('Top Gun: Maverick', 'filme', 'Filmes 2022', 'FHD', '', 'http://example.com/topgun', ''),
('Stranger Things', 'serie', 'Séries Netflix', 'FHD', '', 'http://example.com/stranger', '');

-- Inserir programação de exemplo
INSERT INTO programacao (canal_nome, programa_nome, programa_descricao, inicio, fim, categoria)
VALUES 
('Globo SP', 'Jornal Nacional', 'Principal telejornal da Rede Globo', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours', 'Jornalismo'),
('Globo SP', 'Novela das 9', 'Novela do horário nobre', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours', 'Entretenimento'),
('SBT SP', 'SBT Brasil', 'Telejornal do SBT', NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '1.5 hours', 'Jornalismo'),
('Record SP', 'Cidade Alerta', 'Programa policial', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'Policial'),
('Band SP', 'Jornal da Band', 'Telejornal da Band', NOW() + INTERVAL '45 minutes', NOW() + INTERVAL '1.5 hours', 'Jornalismo');