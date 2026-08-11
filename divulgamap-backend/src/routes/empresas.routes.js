const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarAdmin = require('../middlewares/admin');

const router = express.Router();

// LISTAR empresas (rota pública) — só empresas já APROVADAS aparecem aqui
router.get('/', async (req, res) => {
  try {
    const { categoria, busca } = req.query;

    let sql = `
      SELECT
        e.id_empresa,
        e.nome_fantasia,
        e.tipo,
        e.descricao,
        e.telefone,
        e.site,
        e.google_maps_url,
        e.nota_media,
        en.endereco,
        en.bairro,
        en.latitude,
        en.longitude,
        STRING_AGG(DISTINCT c.nome, ', ') AS categorias
      FROM empresas e
      LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
      LEFT JOIN empresa_categoria ec ON ec.empresa_id = e.id_empresa
      LEFT JOIN categorias c ON c.id_categoria = ec.categoria_id
      WHERE e.status = 'aprovada'
    `;
    const valores = [];

    if (categoria) {
      valores.push(categoria);
      sql += ` AND e.id_empresa IN (
        SELECT ec2.empresa_id FROM empresa_categoria ec2
        JOIN categorias c2 ON c2.id_categoria = ec2.categoria_id
        WHERE c2.nome = $${valores.length}
      )`;
    }

    if (busca) {
      valores.push(`%${busca}%`);
      sql += ` AND e.nome_fantasia ILIKE $${valores.length}`;
    }

    sql += ` GROUP BY e.id_empresa, en.endereco, en.bairro, en.latitude, en.longitude`;

    const resultado = await pool.query(sql, valores);
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar empresas.' });
  }
});

// Devolve o rascunho mais recente (ainda não enviado para aprovação) do usuário logado
router.get('/rascunho-atual', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT e.*, en.endereco, en.bairro, en.latitude, en.longitude
       FROM empresas e
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
       WHERE e.id_usuario = $1 AND e.status = 'rascunho'
       ORDER BY e.data_cadastro DESC LIMIT 1`,
      [req.usuario.id]
    );

    if (!resultado.rows[0]) {
      return res.json({ existeRascunho: false });
    }

    return res.json({ existeRascunho: true, empresa: resultado.rows[0] });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar rascunho.' });
  }
});

router.get('/pendentes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM empresas WHERE status = 'pendente_aprovacao' ORDER BY enviada_para_aprovacao_em ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar empresas pendentes.' });
  }
});

// DETALHE de uma empresa (pública, mas só se estiver aprovada)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT e.*, en.endereco, en.bairro, en.latitude, en.longitude
       FROM empresas e
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
       WHERE e.id_empresa = $1 AND e.status = 'aprovada'`,
      [id]
    );
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar empresa.' });
  }
});

// PASSO 1: cria o rascunho com nome + categoria
router.post('/rascunho', verificarToken, async (req, res) => {
  try {
    const { nome_fantasia, categorias } = req.body; // categorias: array de nomes

    const novaEmpresa = await pool.query(
      `INSERT INTO empresas (id_usuario, nome_fantasia, status)
       VALUES ($1, $2, 'rascunho') RETURNING *`,
      [req.usuario.id, nome_fantasia]
    );
    const empresa = novaEmpresa.rows[0];

    for (const nomeCategoria of categorias || []) {
      const categoria = await pool.query('SELECT id_categoria FROM categorias WHERE nome = $1', [nomeCategoria]);
      if (categoria.rows[0]) {
        await pool.query(
          'INSERT INTO empresa_categoria (empresa_id, categoria_id) VALUES ($1, $2)',
          [empresa.id_empresa, categoria.rows[0].id_categoria]
        );
      }
    }

    return res.status(201).json(empresa);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar rascunho de empresa.' });
  }
});

async function geocodificarEndereco(endereco, bairro) {
  const consulta = `${endereco}, ${bairro}, Taquara - RS, Brasil`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`;

  const resposta = await fetch(url, {
    headers: { 'User-Agent': 'DivulgaMap (divulgamap.oficial@gmail.com)' },
  });
  const dados = await resposta.json();

  if (!dados[0]) return null;

  return { latitude: parseFloat(dados[0].lat), longitude: parseFloat(dados[0].lon) };
}

// PASSOS 2/3/5/8/9: atualiza qualquer campo do rascunho, um pedaço por vez
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Segurança: confirma que a empresa é do usuário logado antes de deixar editar
    const empresaAtual = await pool.query('SELECT * FROM empresas WHERE id_empresa = $1', [id]);
    if (!empresaAtual.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (empresaAtual.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode editar esta empresa.' });
    }

    const {
      tipo,                                   // passo 2
      endereco, bairro,                       // passo 3
      telefone, site, google_maps_url,        // passo 5
      horarios,                               // passo 8 — array: [{ dia_semana, abertura, fechamento, fechado }]
      descricao,                              // passo 9
    } = req.body;

    const atualizada = await pool.query(
      `UPDATE empresas SET
        tipo = COALESCE($1, tipo),
        telefone = COALESCE($2, telefone),
        site = COALESCE($3, site),
        google_maps_url = COALESCE($4, google_maps_url),
        descricao = COALESCE($5, descricao)
       WHERE id_empresa = $6
       RETURNING *`,
      [tipo, telefone, site, google_maps_url, descricao, id]
    );

    // Campos de endereço
    if (endereco || bairro) {
      const enderecoExistente = await pool.query('SELECT * FROM enderecos WHERE empresa_id = $1', [id]);

      if (enderecoExistente.rows[0]) {
        // Edição: só regeocodifica se endereco ou bairro realmente mudaram
        const enderecoFinal = endereco || enderecoExistente.rows[0].endereco;
        const bairroFinal = bairro || enderecoExistente.rows[0].bairro;

        let coordenadas = { latitude: enderecoExistente.rows[0].latitude, longitude: enderecoExistente.rows[0].longitude };
        if (endereco || bairro) {
          const novasCoordenadas = await geocodificarEndereco(enderecoFinal, bairroFinal);
          if (!novasCoordenadas) {
            return res.status(400).json({ erro: 'Não conseguimos localizar esse endereço no mapa. Confira o endereço e o bairro.' });
          }
          coordenadas = novasCoordenadas;
        }

        await pool.query(
          `UPDATE enderecos SET endereco = $1, bairro = $2, latitude = $3, longitude = $4
           WHERE empresa_id = $5`,
          [enderecoFinal, bairroFinal, coordenadas.latitude, coordenadas.longitude, id]
        );
      } else {
        // Primeiro cadastro: endereco e bairro
        if (!endereco || !bairro) {
          return res.status(400).json({ erro: 'endereco e bairro são obrigatórios.' });
        }

        const coordenadas = await geocodificarEndereco(endereco, bairro);
        if (!coordenadas) {
          return res.status(400).json({ erro: 'Não conseguimos localizar esse endereço no mapa. Confira o endereço e o bairro.' });
        }

        await pool.query(
          `INSERT INTO enderecos (empresa_id, endereco, bairro, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, endereco, bairro, coordenadas.latitude, coordenadas.longitude]
        );
      }
    }

    // Horários
    if (Array.isArray(horarios)) {
      for (const dia of horarios) {
        const horarioExistente = await pool.query(
          'SELECT * FROM horarios WHERE empresa_id = $1 AND dia_semana = $2',
          [id, dia.dia_semana]
        );

        if (horarioExistente.rows[0]) {
          await pool.query(
            `UPDATE horarios SET
              abertura = $1, fechamento = $2, fechado = $3
             WHERE empresa_id = $4 AND dia_semana = $5`,
            [dia.abertura, dia.fechamento, dia.fechado || false, id, dia.dia_semana]
          );
        } else {
          await pool.query(
            `INSERT INTO horarios (empresa_id, dia_semana, abertura, fechamento, fechado)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, dia.dia_semana, dia.abertura, dia.fechamento, dia.fechado || false]
          );
        }
      }
    }

    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao atualizar empresa.' });
  }
});

// PASSO 4: checa se já existe uma empresa aprovada com nome ou endereço parecido
router.post('/verificar-duplicidade', verificarToken, async (req, res) => {
  try {
    const { nome_fantasia, endereco } = req.body;

    const resultado = await pool.query(
      `SELECT e.id_empresa, e.nome_fantasia, en.endereco
       FROM empresas e
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
       WHERE e.status = 'aprovada'
         AND (e.nome_fantasia ILIKE $1 OR en.endereco ILIKE $2)`,
      [`%${nome_fantasia}%`, `%${endereco}%`]
    );

    return res.json({
      possivelDuplicata: resultado.rows.length > 0,
      correspondencias: resultado.rows,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao verificar duplicidade.' });
  }
});

// Passo 4 (opcional): "essa empresa já cadastrada é minha" → pede pra assumir o cadastro
router.post('/:id/reivindicar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body; // ex: "sou o dono, meu CNPJ é..."

    const empresa = await pool.query(`SELECT * FROM empresas WHERE id_empresa = $1 AND status = 'aprovada'`, [id]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    const solicitacao = await pool.query(
      `INSERT INTO solicitacoes_empresa (empresa_id, id_usuario, tipo, mensagem)
       VALUES ($1, $2, 'reivindicacao', $3) RETURNING *`,
      [id, req.usuario.id, mensagem]
    );

    await notificarAdminPorEmail(
      'Nova reivindicação de empresa',
      `A empresa "${empresa.rows[0].nome_fantasia}" (id ${id}) foi reivindicada por outro usuário. Mensagem: ${mensagem || '(nenhuma)'}`
    );

    return res.status(201).json(solicitacao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar reivindicação.' });
  }
});

// Passo 4: "essa empresa parece errada/duplicada/falsa" → denúncia
router.post('/:id/denunciar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, mensagem } = req.body;

    const empresa = await pool.query('SELECT * FROM empresas WHERE id_empresa = $1', [id]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    const solicitacao = await pool.query(
      `INSERT INTO solicitacoes_empresa (empresa_id, id_usuario, tipo, motivo, mensagem)
       VALUES ($1, $2, 'denuncia', $3, $4) RETURNING *`,
      [id, req.usuario.id, motivo, mensagem]
    );

    await notificarAdminPorEmail(
      'Nova denúncia de empresa',
      `A empresa "${empresa.rows[0].nome_fantasia}" (id ${id}) foi denunciada. Motivo: ${motivo}. Mensagem: ${mensagem || '(nenhuma)'}`
    );

    return res.status(201).json(solicitacao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar denúncia.' });
  }
});

async function notificarAdminPorEmail(assunto, texto) {
  const nodemailer = require('nodemailer');
  const transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
  });

  await transportador.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `[DivulgaMap] ${assunto}`,
    text: texto,
  });
}

// PASSO 6: gera e envia o código (por e-mail)
router.post('/:id/enviar-codigo', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo } = req.body; // 'email' ou 'sms'

    const codigo = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000); // válido por 10 minutos

    await pool.query(
      `INSERT INTO codigos_verificacao (empresa_id, codigo, metodo, expira_em)
       VALUES ($1, $2, $3, $4)`,
      [id, codigo, metodo, expiraEm]
    );

    if (metodo === 'email') {
      const nodemailer = require('nodemailer');
      const transportador = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
      });

      const usuario = await pool.query('SELECT email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

      await transportador.sendMail({
        from: process.env.EMAIL_USER,
        to: usuario.rows[0].email,
        subject: 'Seu código de verificação — DivulgaMap',
        text: `Seu código é: ${codigo}. Ele expira em 10 minutos.`,
      });
    } else if (metodo === 'sms') {
      // TODO: integrar com um serviço de SMS pago (ex: Twilio) quando o app tiver receita
      console.log(`[SMS simulado] Código para empresa ${id}: ${codigo}`);
    }

    return res.json({ mensagem: 'Código enviado.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar código.' });
  }
});

// PASSO 7: confirma o código digitado
router.post('/:id/confirmar-codigo', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo } = req.body;

    const resultado = await pool.query(
      `SELECT * FROM codigos_verificacao
       WHERE empresa_id = $1 AND codigo = $2 AND usado = FALSE AND expira_em > NOW()
       ORDER BY criado_em DESC LIMIT 1`,
      [id, codigo]
    );

    const registro = resultado.rows[0];
    if (!registro) {
      return res.status(400).json({ erro: 'Código inválido ou expirado.' });
    }

    await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE id_codigo = $1', [registro.id_codigo]);
    await pool.query(
      'UPDATE empresas SET verificado_em = NOW(), metodo_verificacao = $1 WHERE id_empresa = $2',
      [registro.metodo, id]
    );

    return res.json({ verificado: true });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao confirmar código.' });
  }
});

// PASSO 10: guarda a URL de uma foto (upload do app pro Cloudinary)
router.post('/:id/fotos', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, ordem } = req.body;

    const foto = await pool.query(
      'INSERT INTO fotos_empresa (empresa_id, url, ordem) VALUES ($1, $2, $3) RETURNING *',
      [id, url, ordem || 0]
    );

    return res.status(201).json(foto.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar foto.' });
  }
});

// PASSO 13: muda o status de rascunho para "esperando aprovação"
router.post('/:id/submeter', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const empresa = await pool.query('SELECT * FROM empresas WHERE id_empresa = $1', [id]);
    const dadosEmpresa = empresa.rows[0];

    if (!dadosEmpresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (dadosEmpresa.id_usuario !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode enviar esta empresa para aprovação.' });
    }
    if (!dadosEmpresa.verificado_em) {
      return res.status(400).json({ erro: 'Complete a verificação (SMS/e-mail) antes de enviar.' });
    }

    // CORREÇÃO: antes, nada aqui checava se a empresa já tinha um endereço cadastrado —
    // como latitude/longitude moram na tabela enderecos (não em empresas), era possível
    // aprovar uma empresa sem endereço, e ela nunca apareceria no mapa da ExplorarScreen
    // (que filtra quem não tem latitude/longitude). Endereço é essencial pro propósito
    // do app, então vira uma checagem obrigatória do passo 13, igual nome/tipo/telefone.
    const endereco = await pool.query('SELECT 1 FROM enderecos WHERE empresa_id = $1', [id]);
    if (!endereco.rows[0]) {
      return res.status(400).json({ erro: 'Cadastre o endereço (passo 3) antes de enviar para aprovação.' });
    }

    const camposObrigatorios = ['nome_fantasia', 'tipo', 'telefone'];
    const faltando = camposObrigatorios.filter((campo) => !dadosEmpresa[campo]);
    if (faltando.length > 0) {
      return res.status(400).json({ erro: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
    }

    // Propositalmente FORA dessa checagem (ou seja, opcionais e podem ser preenchidos
    // depois de aprovada): site, google_maps_url, horarios, descricao, fotos e a
    // planilha de produtos. Endereço, nome_fantasia, tipo e telefone bloqueiam o envio
    // para aprovação.

    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'pendente_aprovacao', enviada_para_aprovacao_em = NOW()
       WHERE id_empresa = $1 RETURNING *`,
      [id]
    );

    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar empresa para aprovação.' });
  }
});

// Lista tudo que está esperando aprovação
router.patch('/:id/aprovar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'aprovada' WHERE id_empresa = $1 RETURNING *`,
      [id]
    );
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao aprovar empresa.' });
  }
});

router.patch('/:id/rejeitar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'rejeitada', motivo_rejeicao = $1 WHERE id_empresa = $2 RETURNING *`,
      [motivo, id]
    );
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao rejeitar empresa.' });
  }
});

// Lista tudo que está esperando revisão (reivindicações e denúncias)
router.get('/solicitacoes/pendentes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT s.*, e.nome_fantasia
       FROM solicitacoes_empresa s
       JOIN empresas e ON e.id_empresa = s.empresa_id
       WHERE s.status = 'pendente'
       ORDER BY s.criado_em ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar solicitações pendentes.' });
  }
});

router.patch('/solicitacoes/:id/aprovar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const solicitacao = await pool.query('SELECT * FROM solicitacoes_empresa WHERE id_solicitacao = $1', [id]);
    if (!solicitacao.rows[0]) {
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }
    const { tipo, empresa_id, id_usuario, motivo } = solicitacao.rows[0];

    if (tipo === 'reivindicacao') {
      // Aprovar reivindicação = transferir o dono do cadastro pra quem pediu
      await pool.query('UPDATE empresas SET id_usuario = $1 WHERE id_empresa = $2', [id_usuario, empresa_id]);
    } else if (tipo === 'denuncia') {
      await pool.query(
        `UPDATE empresas SET status = 'rejeitada', motivo_rejeicao = $1 WHERE id_empresa = $2`,
        [`Denúncia procedente: ${motivo || 'sem motivo especificado'}`, empresa_id]
      );
    }

    const atualizada = await pool.query(
      `UPDATE solicitacoes_empresa SET status = 'aprovada' WHERE id_solicitacao = $1 RETURNING *`,
      [id]
    );
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao aprovar solicitação.' });
  }
});

router.patch('/solicitacoes/:id/rejeitar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const atualizada = await pool.query(
      `UPDATE solicitacoes_empresa SET status = 'rejeitada' WHERE id_solicitacao = $1 RETURNING *`,
      [id]
    );
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao rejeitar solicitação.' });
  }
});

module.exports = router;