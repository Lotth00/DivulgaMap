const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Ordem das seções na página do Swagger
const ORDEM_DAS_SECOES = ['auth', 'usuarios', 'empresas', 'produtos', 'promocoes', 'avaliacoes', 'listas', 'salvos', 'horarios'];

// Documento OpenAPI base
const documento = {
  openapi: '3.0.3',
  info: {
    title: 'DivulgaMap API',
    version: '1.0.0',
    description:
      'API do DivulgaMap: empresas, produtos e promoções de Taquara/RS.\n\n' +
      'Rotas com cadeado exigem login: faça `POST /auth/login`, copie o `token` e cole em **Authorize**.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Servidor local' },
    { url: 'https://divulgamap.onrender.com', description: 'Render' },
  ],
  tags: [],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: { erro: { type: 'string', example: 'Mensagem explicando o problema.' } },
      },
    },
    parameters: {
      IdEmpresa: { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Número da empresa (id_empresa)', example: 1 },
      EmpresaId: { in: 'path', name: 'empresaId', required: true, schema: { type: 'integer' }, description: 'Número da empresa (id_empresa)', example: 1 },
      IdSolicitacao: { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Número da solicitação (id_solicitacao)', example: 1 },
    },
    responses: {
      DadosInvalidos: {
        description: 'Dados enviados errados ou faltando',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
      SemToken: {
        description: 'Sem token (faça login e use o Authorize)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Token não fornecido.' } } },
      },
      Proibido: {
        description: 'Token inválido ou expirado, ou sem permissão para esta ação',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Token inválido ou expirado.' } } },
      },
      NaoEncontrado: {
        description: 'Não encontrado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
      ErroServidor: {
        description: 'Erro no servidor (veja o terminal do backend)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      },
    },
  },
};

// Junção de todos os .yaml desta pasta
const arquivos = fs
  .readdirSync(__dirname)
  .filter((nome) => nome.endsWith('.yaml'))
  .sort((a, b) => {
    const posicao = (nome) => {
      const indice = ORDEM_DAS_SECOES.indexOf(path.basename(nome, '.yaml'));
      return indice === -1 ? ORDEM_DAS_SECOES.length : indice;
    };
    return posicao(a) - posicao(b) || a.localeCompare(b);
  });

for (const arquivo of arquivos) {
  const parte = YAML.parse(fs.readFileSync(path.join(__dirname, arquivo), 'utf8')) || {};
  documento.tags.push(...(parte.tags || []));
  Object.assign(documento.paths, parte.paths);
  Object.assign(documento.components.schemas, parte.components?.schemas);
  Object.assign(documento.components.parameters, parte.components?.parameters);
}

module.exports = documento;
