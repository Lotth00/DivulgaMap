-- Dados iniciais do DivulgaMap

-- Extensões da busca: semelhança entre palavras e remoção de acentos
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Categorias, com os mesmos nomes dos chips do mapa (TelaMapaBase.js)
INSERT INTO public.categorias (nome) VALUES
  ('Alimentação'),
  ('Moda'),
  ('Bem-Estar'),
  ('Serviços Gerais'),
  ('Tecnologia'),
  ('Construção')
ON CONFLICT (nome) DO NOTHING;
