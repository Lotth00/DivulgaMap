const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const documentoApi = require('./openapi');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const empresasRoutes = require('./routes/empresas.routes');
const promocoesRoutes = require('./routes/promocoes.routes');
const produtosRoutes = require('./routes/produtos.routes');
const avaliacoesRoutes = require('./routes/avaliacoes.routes');
const listasRoutes = require('./routes/listas.routes');
const salvosRoutes = require('./routes/salvos.routes');
const horariosRoutes = require('./routes/horarios.routes');

const app = express();

app.use(cors());         
app.use(express.json()); 


app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/empresas', empresasRoutes);
app.use('/promocoes', promocoesRoutes);
app.use('/produtos', produtosRoutes);
app.use('/avaliacoes', avaliacoesRoutes);
app.use('/listas', listasRoutes);
app.use('/salvos', salvosRoutes);
app.use('/horarios', horariosRoutes);

// Documentação da API (Swagger)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(documentoApi, {
  customSiteTitle: 'DivulgaMap API',
  swaggerOptions: { persistAuthorization: true },
}));


module.exports = app;