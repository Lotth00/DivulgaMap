-- Dados iniciais do DivulgaMap.
-- Pode rodar quantas vezes quiser: o ON CONFLICT ignora o que já existe.
-- Rodar com: node migrate.js --seed

-- Categorias: os mesmos nomes dos chips do mapa (TelaMapaBase.js),
-- porque o filtro do app compara pelo nome.
INSERT INTO public.categorias (nome) VALUES
  ('Alimentação'),
  ('Moda'),
  ('Bem-Estar'),
  ('Serviços Gerais'),
  ('Tecnologia'),
  ('Construção')
ON CONFLICT (nome) DO NOTHING;
