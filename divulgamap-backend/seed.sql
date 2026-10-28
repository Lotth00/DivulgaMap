-- Dados iniciais do DivulgaMap

-- Categorias, com os mesmos nomes dos chips do mapa (TelaMapaBase.js)
INSERT INTO public.categorias (nome) VALUES
  ('Alimentação'),
  ('Moda'),
  ('Bem-Estar'),
  ('Serviços Gerais'),
  ('Tecnologia'),
  ('Construção')
ON CONFLICT (nome) DO NOTHING;
