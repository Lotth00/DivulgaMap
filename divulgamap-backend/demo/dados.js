// Dados de demonstração: empresas fictícias em ruas reais de Taquara, com fotos gratuitas do Unsplash

// Foto do Unsplash no tamanho pedido (recortada)
const foto = (id, largura = 800, altura = 600) =>
  `https://images.unsplash.com/${id}?w=${largura}&h=${altura}&fit=crop&auto=format&q=75`;

// Ruas reais (coordenadas do OpenStreetMap)
const RUAS = {
  pinheiro: { endereco: 'Rua Pinheiro Machado', bairro: 'Centro', lat: -29.65078, lng: -50.78456 },
  marechal: { endereco: 'Rua Marechal Floriano', bairro: 'Centro', lat: -29.64989, lng: -50.78059 },
  tristao: { endereco: 'Rua Tristão Monteiro', bairro: 'Nossa Senhora de Fátima', lat: -29.64542, lng: -50.78983 },
  bento: { endereco: 'Rua Bento Gonçalves', bairro: 'Centro', lat: -29.64963, lng: -50.77948 },
  amoretti: { endereco: 'Avenida Sebastião Amoretti', bairro: 'Morro da Cruz', lat: -29.64022, lng: -50.7756 },
  frota: { endereco: 'Rua General Frota', bairro: 'Centro', lat: -29.6485, lng: -50.78267 },
  lahm: { endereco: 'Rua Guilherme Lahm', bairro: 'Jardim do Prado', lat: -29.64805, lng: -50.78559 },
  ernesto: { endereco: 'Rua Ernesto Alves', bairro: 'Jardim do Prado', lat: -29.65001, lng: -50.78517 },
  rioBranco: { endereco: 'Rua Rio Branco', bairro: 'Jardim do Prado', lat: -29.64693, lng: -50.79199 },
  rangel: { endereco: 'Avenida Oscar Martins Rangel', bairro: 'Santa Maria', lat: -29.6376, lng: -50.79702 },
  aranha: { endereco: 'Rua Osvaldo Aranha', bairro: 'Empresa', lat: -29.66908, lng: -50.77497 },
  castilhos: { endereco: 'Rua Júlio de Castilhos', bairro: 'Morro do Leôncio', lat: -29.65954, lng: -50.78147 },
  tiradentes: { endereco: 'Rua Tiradentes', bairro: 'Petrópolis', lat: -29.64767, lng: -50.77169 },
  seteSetembro: { endereco: 'Rua Sete de Setembro', bairro: 'Santa Terezinha', lat: -29.66291, lng: -50.77545 },
  saoFrancisco: { endereco: 'Rua São Francisco de Paula', bairro: 'Medianeira', lat: -29.6596, lng: -50.76138 },
  mundoNovo: { endereco: 'Rua Mundo Novo', bairro: 'Mundo Novo', lat: -29.65814, lng: -50.75934 },
  diniz: { endereco: 'Rua Coronel Diniz', bairro: 'Santa Terezinha', lat: -29.6562, lng: -50.77117 },
};

// Horários: [dia_semana 0=domingo..6, abertura, fechamento] (dia ausente = fechado)
const SEMANA = (abre, fecha, dias = [1, 2, 3, 4, 5]) => dias.map((d) => [d, abre, fecha]);
const COMERCIO = [...SEMANA('08:30', '18:30'), [6, '08:30', '12:30']];

// Donos (contas que podem entrar no app para mostrar o modo dono)
const DONOS = [
  { chave: 'roberto', nome: 'Roberto Kehl', foto: null },
  { chave: 'simone', nome: 'Simone Becker', foto: foto('photo-1494790108377-be9c29b29330', 400, 400) },
  { chave: 'marcelo', nome: 'Marcelo Fraga', foto: foto('photo-1568602471122-7832951cc4c5', 400, 400) },
  { chave: 'patricia', nome: 'Patrícia Lenz', foto: null },
  { chave: 'jonas', nome: 'Jonas Wagner', foto: null },
];

// Clientes que avaliam
const CLIENTES = [
  { chave: 'ana', nome: 'Ana Paula Schmitt', foto: foto('photo-1489278353717-f64c6ee8a4d2', 400, 400), bio: 'Amo descobrir cafés e docerias de Taquara.' },
  { chave: 'juliana', nome: 'Juliana Rodrigues', foto: foto('photo-1562337404-3044c84ac061', 400, 400), bio: 'Mãe, professora e caçadora de promoção.' },
  { chave: 'camila', nome: 'Camila Hoffmann', foto: foto('photo-1548382131-e0ebb1f0cdea', 400, 400), bio: null },
  { chave: 'fernanda', nome: 'Fernanda Lima', foto: foto('photo-1567516364473-233c4b6fcfbe', 400, 400), bio: 'Iniciando uma jornada pelos lugares de Taquara!' },
  { chave: 'rafael', nome: 'Rafael Kunz', foto: foto('photo-1757744705465-ea08b0ddc38a', 400, 400), bio: 'Pizza no sábado é lei.' },
  { chave: 'lucas', nome: 'Lucas Martins', foto: foto('photo-1522529599102-193c0d76b5b6', 400, 400), bio: null },
  { chave: 'diego', nome: 'Diego Weber', foto: foto('photo-1757620765404-a1ee66df5e27', 400, 400), bio: 'Carro, academia e churrasco.' },
  { chave: 'marcos', nome: 'Marcos Silveira', foto: null, bio: null },
];

// Itens: [nome, preço, unidade, descrição, foto] (serviços podem ter forma de cobrança)
const EMPRESAS = [
  {
    nome: 'Padaria Pão Dourado', ramo: 'Padaria', categorias: ['Alimentação'], tipo: 'comercio', dono: 'roberto',
    rua: 'pinheiro', numero: 412, telefone: '(51) 99812-3401', site: null,
    descricao: 'Pães quentinhos saindo do forno o dia inteiro, cucas, bolos e salgados. Desde 1998 no centro de Taquara.',
    perfil: foto('photo-1549413468-cd78edb7e75c', 400, 400),
    fotos: ['photo-1568254183919-78a4f43a2877', 'photo-1623334044303-241021148842', 'photo-1608198093002-ad4e005484ec'],
    horario: SEMANA('06:30', '20:00', [0, 1, 2, 3, 4, 5, 6]),
    itens: [
      ['Pão francês', 16.9, 'kg', 'Crocante por fora e macio por dentro, assado a cada hora.', 'photo-1590301157172-7ba48dd1c2b2'],
      ['Pão integral', 9.5, 'un', 'Com grãos e sementes, 500 g.', 'photo-1534620808146-d33bb39128b2'],
      ['Croissant', 6, 'un', 'Massa folhada amanteigada.', 'photo-1623334044303-241021148842'],
      ['Cuca de uva', 22, 'un', 'Receita da casa, com farofa crocante.', 'photo-1559811814-e2c57b5e69df'],
      ['Bolo de chocolate', 48, 'un', 'Bolo inteiro com cobertura de brigadeiro.', 'photo-1615796701805-2094ac54bbf9'],
      ['Sonho de creme', 5.5, 'un', null, null],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Pão francês com 15% off', item: 'Pão francês', desconto: 15, dias: 6 },
      { tipo: 'relampago', titulo: 'Croissant pela metade do preço', item: 'Croissant', desconto: 50, horas: 20 },
    ],
  },
  {
    nome: 'Doce Encanto Confeitaria', ramo: 'Confeitaria', categorias: ['Alimentação'], tipo: 'comercio', dono: 'simone',
    rua: 'marechal', numero: 1180, telefone: '(51) 99634-2210', site: 'https://instagram.com',
    descricao: 'Bolos de festa, tortas e doces finos feitos por encomenda. Também temos fatias e cafés para o lanche da tarde.',
    perfil: foto('photo-1602663491496-73f07481dbea', 400, 400),
    fotos: ['photo-1583338917451-face2751d8d5', 'photo-1639832899627-5d77c5ce1eb8', 'photo-1595144780677-6d0b5abbd089'],
    horario: [...SEMANA('09:00', '19:00', [2, 3, 4, 5, 6]), [0, '14:00', '19:00']],
    itens: [
      ['Torta de morango', 89, 'un', 'Torta inteira, serve 12 pessoas.', 'photo-1542826438-bd32f43d626f'],
      ['Cupcake de chocolate', 9, 'un', null, 'photo-1595144780677-6d0b5abbd089'],
      ['Fatia de bolo', 14, 'un', 'Sabores do dia no balcão.', 'photo-1464349095431-e9a21285b5f3'],
      ['Docinhos finos (cento)', 160, 'un', 'Brigadeiro, beijinho e camafeu.', null],
      ['Tortinha de frutas vermelhas', 12, 'un', null, 'photo-1702742322469-36315505728f'],
    ],
    ofertas: [
      { tipo: 'especial', titulo: 'Leve 6 cupcakes, pague 5', item: 'Cupcake de chocolate', condicao: 'Leve 6, pague 5', dias: 8 },
      { tipo: 'normal', titulo: 'Torta de morango com 10% off', item: 'Torta de morango', desconto: 10, dias: 5 },
    ],
  },
  {
    nome: 'Lancheria do Beto', ramo: 'Lanchonete', categorias: ['Alimentação'], tipo: 'comercio', dono: 'roberto',
    rua: 'tristao', numero: 256, telefone: '(51) 99701-8854', site: null,
    descricao: 'Xis, cachorro-quente e batata frita no capricho. Tele-entrega em toda a cidade.',
    perfil: foto('photo-1568901346375-23c9450c58cd', 400, 400),
    fotos: ['photo-1572802419224-296b0aeee0d9', 'photo-1630384060421-cb20d0e0649d', 'photo-1763689389824-dd2cea2e5772'],
    horario: SEMANA('18:00', '23:30', [0, 2, 3, 4, 5, 6]),
    itens: [
      ['Xis salada', 28, 'un', 'Pão, hambúrguer, ovo, queijo, presunto, alface e tomate.', 'photo-1586190848861-99aa4a171e90'],
      ['Xis bacon duplo', 36, 'un', 'Dois hambúrgueres, bacon crocante e cheddar.', 'photo-1607013251379-e6eecfffe234'],
      ['Cachorro-quente', 18, 'un', 'Duas salsichas, purê, milho e batata palha.', 'photo-1638368593249-7cadb261e8b3'],
      ['Batata frita', 22, 'un', 'Porção de 400 g com cheddar e bacon.', 'photo-1630384060421-cb20d0e0649d'],
      ['Refrigerante 2 L', 13, 'un', null, null],
    ],
    ofertas: [
      { tipo: 'especial', titulo: 'Xis + batata + refri', item: 'Xis salada', condicao: 'Combo por R$ 49,90 de terça a quinta', dias: 9 },
      { tipo: 'relampago', titulo: 'Cachorro-quente com 30% off', item: 'Cachorro-quente', desconto: 30, horas: 12 },
    ],
  },
  {
    nome: 'Bella Massa Pizzaria', ramo: 'Pizzaria', categorias: ['Alimentação'], tipo: 'comercio', dono: 'marcelo',
    rua: 'bento', numero: 905, telefone: '(51) 99540-7312', site: 'https://instagram.com',
    descricao: 'Pizzas no forno a lenha com massa de fermentação natural. Rodízio às sextas e sábados.',
    perfil: foto('photo-1767713362918-d6db856570ba', 400, 400),
    fotos: ['photo-1513104890138-7c749659a591', 'photo-1565299624946-b28f40a0ae38', 'photo-1769521140317-5c6dcd1266e7'],
    horario: SEMANA('18:30', '23:59', [0, 2, 3, 4, 5, 6]),
    itens: [
      ['Pizza margherita (grande)', 62, 'un', 'Molho de tomate, muçarela, tomate e manjericão.', 'photo-1513104890138-7c749659a591'],
      ['Pizza calabresa (grande)', 58, 'un', null, 'photo-1604382354936-07c5d9983bd3'],
      ['Pizza quatro queijos (grande)', 68, 'un', null, 'photo-1593504049359-74330189a345'],
      ['Rodízio de pizzas', 54.9, 'un', 'Por pessoa, sextas e sábados.', 'photo-1769521140317-5c6dcd1266e7'],
      ['Pizza doce de chocolate (média)', 42, 'un', null, null],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Margherita com 20% off', item: 'Pizza margherita (grande)', desconto: 20, dias: 7 },
      { tipo: 'especial', titulo: 'Na compra de duas grandes, ganhe um refri', item: null, condicao: 'Refrigerante 2 L grátis em duas pizzas grandes', dias: 10 },
    ],
  },
  {
    nome: 'Mercado Bom Preço', ramo: 'Supermercado', categorias: ['Alimentação'], tipo: 'comercio', dono: 'jonas',
    rua: 'amoretti', numero: 1540, telefone: '(51) 99877-6603', site: null,
    descricao: 'Mercado de bairro com hortifrúti fresco todos os dias, açougue e padaria. Aceitamos todos os cartões.',
    perfil: foto('photo-1604719312566-8912e9227c6a', 400, 400),
    fotos: ['photo-1578916171728-46686eac8d58', 'photo-1488459716781-31db52582fe9', 'photo-1542838132-92c53300491e'],
    horario: [...SEMANA('07:30', '20:30', [1, 2, 3, 4, 5, 6]), [0, '08:00', '12:30']],
    itens: [
      ['Banana prata', 6.49, 'kg', null, 'photo-1488459716781-31db52582fe9'],
      ['Tomate', 7.99, 'kg', null, 'photo-1542838132-92c53300491e'],
      ['Arroz 5 kg', 27.9, 'un', 'Tipo 1.', null],
      ['Café 500 g', 19.9, 'un', null, 'photo-1447933601403-0c6688de566e'],
      ['Picanha', 69.9, 'kg', 'Peça inteira ou em bifes.', 'photo-1625643269470-5d3e7b69fa34'],
      ['Leite integral 1 L', 5.29, 'un', null, null],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Quarta verde: banana com 25% off', item: 'Banana prata', desconto: 25, dias: 4 },
      { tipo: 'relampago', titulo: 'Picanha com 18% off só hoje', item: 'Picanha', desconto: 18, horas: 16 },
      { tipo: 'normal', titulo: 'Café 500 g mais barato', item: 'Café 500 g', desconto: 12, dias: 8 },
    ],
  },
  {
    nome: 'Farmácia Vida Plena', ramo: 'Farmácia', categorias: ['Bem-Estar'], tipo: 'comercio', dono: 'patricia',
    rua: 'frota', numero: 333, telefone: '(51) 99456-1190', site: null,
    descricao: 'Medicamentos, dermocosméticos e manipulação. Aferição de pressão gratuita e entrega em casa.',
    perfil: foto('photo-1576091358783-a212ec293ff3', 400, 400),
    fotos: ['photo-1765031092161-a9ebe556117e', 'photo-1580281657527-47f249e8f4df', 'photo-1471864190281-a93a3070b6de'],
    horario: [...SEMANA('08:00', '21:00', [1, 2, 3, 4, 5, 6]), [0, '09:00', '13:00']],
    itens: [
      ['Protetor solar FPS 50', 54.9, 'un', '200 ml.', null],
      ['Vitamina C 1 g (30 cp.)', 24.9, 'un', null, 'photo-1512069772995-ec65ed45afd6'],
      ['Shampoo anticaspa', 32.5, 'un', null, null],
    ],
    servicos: [
      ['Aplicação de injetáveis', 15, 'un', 'Com receita médica.', null, 'preco'],
      ['Aferição de pressão', null, 'un', 'Gratuita, no balcão.', null, 'orcamento_gratuito'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Protetor solar com 20% off', item: 'Protetor solar FPS 50', desconto: 20, dias: 10 },
    ],
  },
  {
    nome: 'Studio Bela Hair', ramo: 'Salão de beleza', categorias: ['Bem-Estar'], tipo: 'servico', dono: 'simone',
    rua: 'lahm', numero: 77, telefone: '(51) 99321-4408', site: 'https://instagram.com',
    descricao: 'Cortes, coloração, escova e manicure. Atendimento com hora marcada pelo WhatsApp.',
    perfil: foto('photo-1580618672591-eb180b1a973f', 400, 400),
    fotos: ['photo-1781450090585-1a511b7066d9', 'photo-1634449571010-02389ed0f9b0', 'photo-1632345031435-8727f6897d53'],
    horario: [...SEMANA('09:00', '19:00', [2, 3, 4, 5]), [6, '08:00', '17:00']],
    servicos: [
      ['Corte feminino', 70, 'un', 'Lavagem, corte e finalização.', 'photo-1634449571010-02389ed0f9b0', 'preco'],
      ['Escova', 45, 'un', null, 'photo-1580618672591-eb180b1a973f', 'preco'],
      ['Coloração', null, 'un', 'O valor depende do comprimento e da cor.', 'photo-1560869713-7d0a29430803', 'sob_consulta'],
      ['Manicure e pedicure', 55, 'un', null, 'photo-1632345031435-8727f6897d53', 'preco'],
      ['Maquiagem para festa', 120, 'un', null, 'photo-1512496015851-a90fb38ba796', 'preco'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Escova com 20% off de terça', item: 'Escova', desconto: 20, dias: 7 },
      { tipo: 'especial', titulo: 'Corte + escova com preço especial', item: 'Corte feminino', condicao: 'Corte e escova por R$ 99', dias: 9 },
    ],
  },
  {
    nome: 'Barbearia Navalha de Ouro', ramo: 'Barbearia', categorias: ['Bem-Estar'], tipo: 'servico', dono: 'marcelo',
    rua: 'ernesto', numero: 540, telefone: '(51) 99213-5590', site: null,
    descricao: 'Corte, barba e sobrancelha com toalha quente. Ambiente climatizado e cerveja gelada.',
    perfil: foto('photo-1585747860715-2ba37e788b70', 400, 400),
    fotos: ['photo-1503951914875-452162b0f3f1', 'photo-1599351431202-1e0f0137899a', 'photo-1621605815971-fbc98d665033'],
    horario: [...SEMANA('09:00', '20:00', [2, 3, 4, 5]), [6, '08:00', '18:00']],
    servicos: [
      ['Corte masculino', 40, 'un', null, 'photo-1503951914875-452162b0f3f1', 'preco'],
      ['Barba com toalha quente', 35, 'un', null, 'photo-1599351431202-1e0f0137899a', 'preco'],
      ['Corte + barba', 65, 'un', null, 'photo-1647140655214-e4a2d914971f', 'preco'],
      ['Pigmentação de barba', null, 'un', 'Avaliação antes do serviço.', null, 'sob_consulta'],
    ],
    ofertas: [
      { tipo: 'relampago', titulo: 'Corte com 25% off até a noite', item: 'Corte masculino', desconto: 25, horas: 10 },
      { tipo: 'especial', titulo: 'Corte + barba com cerveja grátis', item: 'Corte + barba', condicao: 'Ganhe uma cerveja artesanal', dias: 6 },
    ],
  },
  {
    nome: 'Patas & Cia Pet Shop', ramo: 'Pet shop', categorias: ['Serviços Gerais'], tipo: 'ambos', dono: 'patricia',
    rua: 'rioBranco', numero: 1022, telefone: '(51) 99788-0042', site: null,
    descricao: 'Banho e tosa, rações e acessórios. Buscamos e levamos o seu pet em casa.',
    perfil: foto('photo-1611173622933-91942d394b04', 400, 400),
    fotos: ['photo-1719464454959-9cf304ef4774', 'photo-1588269845464-8993565cac3a', 'photo-1764249453874-46864677b10e'],
    horario: COMERCIO,
    itens: [
      ['Ração premium 15 kg', 189.9, 'un', 'Para cães adultos.', 'photo-1764249453891-84799ed79e9e'],
      ['Petisco ossinho (500 g)', 24.9, 'un', null, 'photo-1568640347023-a616a30bc3bd'],
      ['Caminha média', 119, 'un', null, null],
    ],
    servicos: [
      ['Banho (porte pequeno)', 50, 'un', 'Com secagem e perfume.', 'photo-1611173622933-91942d394b04', 'preco'],
      ['Banho e tosa', 85, 'un', null, 'photo-1719464454959-9cf304ef4774', 'preco'],
      ['Leva e traz', null, 'un', 'Gratuito para banhos agendados no bairro.', null, 'orcamento_gratuito'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Ração premium com 10% off', item: 'Ração premium 15 kg', desconto: 10, dias: 10 },
      { tipo: 'especial', titulo: 'A cada 5 banhos, o 6º é grátis', item: 'Banho (porte pequeno)', condicao: 'Cartão fidelidade: 6º banho grátis', dias: 10 },
    ],
  },
  {
    nome: 'Academia Movimento', ramo: 'Academia', categorias: ['Bem-Estar'], tipo: 'servico', dono: 'jonas',
    rua: 'rangel', numero: 2210, telefone: '(51) 99601-7744', site: 'https://instagram.com',
    descricao: 'Musculação, funcional e aulas de dança. Professores o dia todo e avaliação física inclusa.',
    perfil: foto('photo-1571902943202-507ec2618e8f', 400, 400),
    fotos: ['photo-1534438327276-14e5300c3a48', 'photo-1757924284732-4189190321cf', 'photo-1517836357463-d25dfeac3438'],
    horario: [...SEMANA('06:00', '22:00'), [6, '08:00', '14:00']],
    servicos: [
      ['Plano mensal', 99, 'mês', 'Musculação e aulas coletivas.', 'photo-1534438327276-14e5300c3a48', 'preco'],
      ['Personal trainer', 70, 'hora', null, 'photo-1517836357463-d25dfeac3438', 'preco'],
      ['Avaliação física', null, 'un', 'Grátis para novos alunos.', null, 'orcamento_gratuito'],
    ],
    ofertas: [
      { tipo: 'especial', titulo: 'Matrícula grátis em novembro', item: 'Plano mensal', condicao: 'Isenção da taxa de matrícula', dias: 10 },
    ],
  },
  {
    nome: 'Auto Mecânica Taquarense', ramo: 'Oficina mecânica', categorias: ['Serviços Gerais'], tipo: 'servico', dono: 'roberto',
    rua: 'aranha', numero: 680, telefone: '(51) 99145-3328', site: null,
    descricao: 'Mecânica geral, freios, suspensão e troca de óleo. Orçamento sem compromisso.',
    perfil: foto('photo-1625047509248-ec889cbff17f', 400, 400),
    fotos: ['photo-1767681092416-bccf9410bda4', 'photo-1775590766345-c117265f0c1b', 'photo-1619642751034-765dfdf7c58e'],
    horario: [...SEMANA('08:00', '18:00'), [6, '08:00', '12:00']],
    servicos: [
      ['Troca de óleo e filtro', 140, 'un', 'Óleo sintético incluso (carros de passeio).', 'photo-1619642751034-765dfdf7c58e', 'preco'],
      ['Revisão de freios', null, 'un', null, 'photo-1625047509248-ec889cbff17f', 'sob_consulta'],
      ['Diagnóstico eletrônico', null, 'un', null, 'photo-1771340012378-3c86cb649193', 'orcamento_gratuito'],
      ['Alinhamento e balanceamento', 90, 'un', null, 'photo-1645445522156-9ac06bc7a767', 'preco'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Troca de óleo com 15% off', item: 'Troca de óleo e filtro', desconto: 15, dias: 9 },
    ],
  },
  {
    nome: 'Ateliê Vestir Bem', ramo: 'Loja de roupas', categorias: ['Moda'], tipo: 'comercio', dono: 'simone',
    rua: 'castilhos', numero: 1450, telefone: '(51) 99923-6617', site: 'https://instagram.com',
    descricao: 'Moda feminina e masculina, peças básicas e para festas. Ajustes de costura na hora.',
    perfil: foto('photo-1441984904996-e0b6ba687e04', 400, 400),
    fotos: ['photo-1441986300917-64674bd600d8', 'photo-1490481651871-ab68de25d43d', 'photo-1777307224241-e0aa9dbea6f8'],
    horario: COMERCIO,
    itens: [
      ['Vestido midi', 159.9, 'un', 'Tecido leve, várias cores.', 'photo-1640923160720-35dddb6348ab'],
      ['Camisa social masculina', 119, 'un', null, 'photo-1489987707025-afc232f7ea0f'],
      ['Jaqueta jeans', 189, 'un', null, 'photo-1551232864-3f0890e580d9'],
      ['Tênis casual', 229, 'un', null, 'photo-1595950653106-6c9ebd614d3a'],
    ],
    servicos: [['Ajuste de barra', 25, 'un', null, null, 'preco']],
    ofertas: [
      { tipo: 'normal', titulo: 'Vestidos com 30% off', item: 'Vestido midi', desconto: 30, dias: 8 },
      { tipo: 'relampago', titulo: 'Jaqueta jeans com 40% off', item: 'Jaqueta jeans', desconto: 40, horas: 18 },
    ],
  },
  {
    nome: 'Eletro Luz Serviços Elétricos', ramo: 'Eletricista', categorias: ['Construção', 'Serviços Gerais'], tipo: 'servico', dono: 'jonas',
    rua: 'tiradentes', numero: 318, telefone: '(51) 99367-2251', site: null,
    descricao: 'Instalações e reparos elétricos residenciais e comerciais. Atendimento de emergência.',
    perfil: foto('photo-1621905251189-08b45d6a269e', 400, 400),
    fotos: ['photo-1758101755915-462eddc23f57', 'photo-1682345262055-8f95f3c513ea', 'photo-1635335874521-7987db781153'],
    horario: [...SEMANA('08:00', '18:00'), [6, '08:00', '12:00']],
    servicos: [
      ['Visita técnica', null, 'un', 'Orçamento no local, sem custo.', 'photo-1621905251189-08b45d6a269e', 'orcamento_gratuito'],
      ['Instalação de chuveiro', 80, 'un', null, null, 'preco'],
      ['Hora de serviço', 90, 'hora', null, 'photo-1682345262055-8f95f3c513ea', 'preco'],
      ['Troca de quadro de luz', null, 'un', null, 'photo-1758101755915-462eddc23f57', 'sob_consulta'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Instalação de chuveiro com 20% off', item: 'Instalação de chuveiro', desconto: 20, dias: 7 },
    ],
  },
  {
    nome: 'Brilho Limpeza', ramo: 'Diarista', categorias: ['Serviços Gerais'], tipo: 'servico', dono: 'patricia',
    rua: 'seteSetembro', numero: 95, telefone: '(51) 99852-1176', site: null,
    descricao: 'Faxina residencial e pós-obra com produtos inclusos. Equipe de confiança e pontual.',
    perfil: foto('photo-1563453392212-326f5e854473', 400, 400),
    fotos: ['photo-1758273238415-01ec03d9ef27', 'photo-1585421514284-efb74c2b69ba', 'photo-1740657254989-42fe9c3b8cce'],
    horario: [...SEMANA('07:00', '17:00'), [6, '07:00', '12:00']],
    servicos: [
      ['Faxina residencial', 35, 'hora', 'Produtos de limpeza inclusos.', 'photo-1758273238415-01ec03d9ef27', 'preco'],
      ['Limpeza pós-obra', null, 'un', null, 'photo-1740657254989-42fe9c3b8cce', 'orcamento_gratuito'],
      ['Passadoria', 25, 'hora', null, null, 'preco'],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Primeira faxina com 20% off', item: 'Faxina residencial', desconto: 20, dias: 10 },
    ],
  },
  {
    nome: 'Conecta Assistência Técnica', ramo: 'Assistência técnica de celular', categorias: ['Tecnologia'], tipo: 'ambos', dono: 'marcelo',
    rua: 'saoFrancisco', numero: 211, telefone: '(51) 99712-9083', site: null,
    descricao: 'Conserto de celulares, notebooks e tablets. Troca de tela no mesmo dia e acessórios.',
    perfil: foto('photo-1550041473-d296a3a8a18a', 400, 400),
    fotos: ['photo-1639776738932-956082f0b704', 'photo-1746005514011-ea00280f3b6e', 'photo-1547394765-185e1e68f34e'],
    horario: COMERCIO,
    itens: [
      ['Película de vidro', 30, 'un', 'Aplicação inclusa.', null],
      ['Carregador turbo', 59, 'un', null, null],
      ['Fone bluetooth', 89, 'un', null, null],
    ],
    servicos: [
      ['Troca de tela', null, 'un', 'O valor depende do modelo.', 'photo-1639776738932-956082f0b704', 'sob_consulta'],
      ['Troca de bateria', 120, 'un', null, 'photo-1746005514011-ea00280f3b6e', 'preco'],
      ['Formatação de notebook', 100, 'un', null, 'photo-1547394765-185e1e68f34e', 'preco'],
    ],
    ofertas: [
      { tipo: 'especial', titulo: 'Película grátis na troca de tela', item: 'Película de vidro', condicao: 'Película de vidro grátis em qualquer troca de tela', dias: 8 },
    ],
  },
  {
    nome: 'Constrular Materiais', ramo: 'Loja de materiais de construção', categorias: ['Construção'], tipo: 'comercio', dono: 'roberto',
    rua: 'mundoNovo', numero: 3300, telefone: '(51) 99634-7720', site: null,
    descricao: 'Tudo para a sua obra: cimento, tintas, ferramentas, hidráulica e elétrica. Entrega rápida.',
    perfil: foto('photo-1602052793312-b99c2a9ee797', 400, 400),
    fotos: ['photo-1631856954655-966f97d809de', 'photo-1765744893064-dce3184289ef', 'photo-1525909002-1b05e0c869d8'],
    horario: [...SEMANA('07:30', '18:00'), [6, '07:30', '12:00']],
    itens: [
      ['Cimento 50 kg', 39.9, 'un', null, null],
      ['Tinta acrílica 18 L', 289, 'un', 'Branco neve, rende até 300 m².', 'photo-1670940094923-6f75e4dc5c3a'],
      ['Kit de rolos de pintura', 39.9, 'un', null, 'photo-1525909002-1b05e0c869d8'],
      ['Martelo de unha', 34.9, 'un', null, 'photo-1602052793312-b99c2a9ee797'],
      ['Areia média', 120, 'm³', null, null],
    ],
    ofertas: [
      { tipo: 'normal', titulo: 'Tinta acrílica com 15% off', item: 'Tinta acrílica 18 L', desconto: 15, dias: 9 },
      { tipo: 'relampago', titulo: 'Cimento mais barato até amanhã', item: 'Cimento 50 kg', desconto: 10, horas: 22 },
    ],
  },
  {
    nome: 'Café Recanto', ramo: 'Cafeteria', categorias: ['Alimentação'], tipo: 'comercio', dono: 'simone',
    rua: 'diniz', numero: 188, telefone: '(51) 99560-3349', site: 'https://instagram.com',
    descricao: 'Cafés especiais, doces caseiros e um cantinho tranquilo para trabalhar ou ler.',
    perfil: foto('photo-1541167760496-1628856ab772', 400, 400),
    fotos: ['photo-1509042239860-f550ce710b93', 'photo-1542372147193-a7aca54189cd', 'photo-1511920170033-f8396924c348'],
    horario: [...SEMANA('08:00', '19:00', [1, 2, 3, 4, 5, 6]), [0, '14:00', '19:00']],
    itens: [
      ['Cappuccino', 12, 'un', null, 'photo-1761783768352-e7f42bfa9988'],
      ['Espresso', 7, 'un', null, 'photo-1514432324607-a09d9b4aefdd'],
      ['Croissant com café', 18, 'un', null, 'photo-1542372147193-a7aca54189cd'],
      ['Café gelado', 15, 'un', 'Com calda de caramelo.', 'photo-1760662018512-e881f06d0fe0'],
      ['Açaí 500 ml', 24, 'un', 'Com banana, granola e morango.', 'photo-1627308594190-a057cd4bfac8'],
    ],
    ofertas: [
      { tipo: 'especial', titulo: 'Café + croissant no café da manhã', item: 'Croissant com café', condicao: 'Até as 10h, combo por R$ 15', dias: 9 },
      { tipo: 'relampago', titulo: 'Café gelado com 40% off', item: 'Café gelado', desconto: 40, horas: 8 },
    ],
  },
];

// Avaliações: [empresa, cliente, nota, comentário, fotos (ids do Unsplash)]
const AVALIACOES = [
  ['Padaria Pão Dourado', 'ana', 5, 'O pão francês sai quentinho toda hora. A cuca de uva é a melhor de Taquara!', ['photo-1559811814-e2c57b5e69df']],
  ['Padaria Pão Dourado', 'juliana', 4, 'Atendimento rápido e preço justo. Só fica cheio de manhã cedo.', []],
  ['Padaria Pão Dourado', 'rafael', 5, 'Croissant crocante de verdade.', []],
  ['Padaria Pão Dourado', 'marcos', 4, null, []],
  ['Doce Encanto Confeitaria', 'ana', 5, 'Encomendei a torta de morango para o aniversário da minha mãe e todo mundo amou.', ['photo-1542826438-bd32f43d626f']],
  ['Doce Encanto Confeitaria', 'fernanda', 5, 'Os cupcakes são lindos e muito gostosos.', []],
  ['Doce Encanto Confeitaria', 'camila', 4, 'Doces ótimos, mas a fila no sábado é grande.', []],
  ['Lancheria do Beto', 'diego', 5, 'Xis bacon duplo enorme, vale cada centavo.', ['photo-1607013251379-e6eecfffe234']],
  ['Lancheria do Beto', 'lucas', 4, 'Tele-entrega chegou em 30 minutos e quentinho.', []],
  ['Lancheria do Beto', 'rafael', 3, 'Lanche bom, mas a batata veio meio murcha dessa vez.', []],
  ['Lancheria do Beto', 'juliana', 5, 'Cachorro-quente igual ao de antigamente!', []],
  ['Bella Massa Pizzaria', 'rafael', 5, 'Melhor pizza da cidade, a massa é leve e o forno a lenha faz diferença.', ['photo-1513104890138-7c749659a591']],
  ['Bella Massa Pizzaria', 'camila', 5, 'O rodízio de sexta é ótimo, sempre passam sabores novos.', []],
  ['Bella Massa Pizzaria', 'lucas', 4, 'Muito boa, só demorou um pouco no sábado à noite.', []],
  ['Bella Massa Pizzaria', 'ana', 5, null, []],
  ['Mercado Bom Preço', 'juliana', 4, 'Hortifrúti sempre fresco e a quarta verde ajuda muito no orçamento.', []],
  ['Mercado Bom Preço', 'marcos', 4, 'Açougue com carne boa.', []],
  ['Mercado Bom Preço', 'fernanda', 3, 'Preços bons, mas o estacionamento é pequeno.', []],
  ['Farmácia Vida Plena', 'camila', 5, 'Atendentes muito atenciosas e a entrega em casa é rápida.', []],
  ['Farmácia Vida Plena', 'marcos', 4, 'Medem a pressão de graça, achei ótimo.', []],
  ['Studio Bela Hair', 'fernanda', 5, 'Fiz corte e escova e amei o resultado! Ambiente lindo.', ['photo-1634449571010-02389ed0f9b0']],
  ['Studio Bela Hair', 'juliana', 5, 'Manicure caprichosa, pontual no horário marcado.', []],
  ['Studio Bela Hair', 'ana', 4, 'Gostei da coloração, só achei o valor um pouco alto.', []],
  ['Barbearia Navalha de Ouro', 'diego', 5, 'Barba com toalha quente é outro nível. Recomendo demais.', []],
  ['Barbearia Navalha de Ouro', 'lucas', 5, 'Corte perfeito e o pessoal é gente boa.', ['photo-1503951914875-452162b0f3f1']],
  ['Barbearia Navalha de Ouro', 'rafael', 4, null, []],
  ['Patas & Cia Pet Shop', 'camila', 5, 'Meu cachorro voltou cheiroso e tranquilo. O leva e traz é muito prático.', ['photo-1611173622933-91942d394b04']],
  ['Patas & Cia Pet Shop', 'juliana', 4, 'Ração com bom preço.', []],
  ['Academia Movimento', 'diego', 5, 'Equipamentos novos e professores sempre por perto.', []],
  ['Academia Movimento', 'fernanda', 4, 'Gosto das aulas de dança, só lota no fim da tarde.', []],
  ['Academia Movimento', 'lucas', 4, 'Boa academia pelo preço.', []],
  ['Auto Mecânica Taquarense', 'marcos', 5, 'Honestos, explicaram tudo antes de fazer o serviço.', []],
  ['Auto Mecânica Taquarense', 'diego', 4, 'Troca de óleo rápida, fiquei esperando só 40 minutos.', []],
  ['Ateliê Vestir Bem', 'ana', 5, 'Roupas lindas e fizeram a barra da calça na hora.', []],
  ['Ateliê Vestir Bem', 'camila', 4, 'Boa variedade de vestidos.', []],
  ['Eletro Luz Serviços Elétricos', 'marcos', 5, 'Atenderam uma emergência num domingo. Serviço impecável.', []],
  ['Eletro Luz Serviços Elétricos', 'juliana', 4, 'Orçamento rápido e preço justo.', []],
  ['Brilho Limpeza', 'fernanda', 5, 'Deixaram o apartamento brilhando depois da reforma.', []],
  ['Brilho Limpeza', 'camila', 4, 'Pontuais e cuidadosas.', []],
  ['Conecta Assistência Técnica', 'lucas', 5, 'Trocaram a tela do meu celular no mesmo dia.', []],
  ['Conecta Assistência Técnica', 'rafael', 3, 'Resolveram o problema, mas demorou mais do que o combinado.', []],
  ['Constrular Materiais', 'marcos', 4, 'Tem de tudo e entregam rápido.', []],
  ['Constrular Materiais', 'diego', 4, null, []],
  ['Café Recanto', 'ana', 5, 'Cappuccino perfeito e o lugar é muito aconchegante.', ['photo-1541167760496-1628856ab772']],
  ['Café Recanto', 'fernanda', 5, 'Meu lugar favorito para estudar.', []],
  ['Café Recanto', 'juliana', 4, 'O açaí é muito bom!', []],
];

// Anúncios: banners (carrossel) e faixas (entre as seções)
const ANUNCIOS = [
  { empresa: 'Bella Massa Pizzaria', formato: 'banner', porDia: 20, imagem: 'photo-1769521140317-5c6dcd1266e7', destino: 'oferta' },
  { empresa: 'Studio Bela Hair', formato: 'banner', porDia: 12, imagem: 'photo-1781450090585-1a511b7066d9', destino: 'empresa' },
  { empresa: 'Mercado Bom Preço', formato: 'banner', porDia: 8, imagem: 'photo-1488459716781-31db52582fe9', destino: 'oferta' },
  { empresa: 'Café Recanto', formato: 'banner', porDia: 5, imagem: 'photo-1509042239860-f550ce710b93', destino: 'empresa' },
  { empresa: 'Academia Movimento', formato: 'faixa', porDia: 8, imagem: 'photo-1757924284732-4189190321cf', destino: 'empresa' },
  { empresa: 'Ateliê Vestir Bem', formato: 'faixa', porDia: 5, imagem: 'photo-1490481651871-ab68de25d43d', destino: 'link' },
  { empresa: 'Lancheria do Beto', formato: 'faixa', porDia: 3, imagem: 'photo-1763689389824-dd2cea2e5772', destino: 'oferta' },
];

module.exports = { foto, RUAS, DONOS, CLIENTES, EMPRESAS, AVALIACOES, ANUNCIOS };
