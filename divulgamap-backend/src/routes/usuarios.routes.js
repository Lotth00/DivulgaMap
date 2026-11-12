const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const registrarLog = require('../utils/registrarLog');
const avisoPorEmail = require('../utils/avisoPorEmail');

const router = express.Router();

// Campos devolvidos do usuário (nunca a senha)
const CAMPOS_USUARIO = `id_usuario AS id, nome, email, tipo, telefone, foto_perfil_url, biografia,
  to_char(data_nascimento, 'YYYY-MM-DD') AS data_nascimento, conta_privada, notificacoes_ativas, preferencias_notificacao, data_cadastro,
  to_char(senha_atualizada_em, 'YYYY-MM-DD') AS senha_atualizada_em`;

function textoOpcional(valor, tamanhoMaximo) {
  if (valor === null) return { valor: null };
  if (typeof valor !== 'string' || valor.trim().length > tamanhoMaximo) return { erro: true };
  return { valor: valor.trim() || null };
}

// Assuntos das notificações que a pessoa pode ligar ou desligar
const ASSUNTOS_NOTIFICACAO = ['ofertas_gerais', 'empresas_proximas', 'recomendacoes'];

// Regras de cada campo editável: devolve { valor } ou { erro: mensagem }
const REGRAS_PERFIL = {
  nome: (v) =>
    typeof v === 'string' && v.trim() && v.trim().length <= 100 ? { valor: v.trim() } : { erro: 'nome é obrigatório e pode ter até 100 letras.' },
  telefone: (v) => (textoOpcional(v, 20).erro ? { erro: 'telefone pode ter até 20 caracteres.' } : textoOpcional(v, 20)),
  biografia: (v) => (textoOpcional(v, 500).erro ? { erro: 'biografia pode ter até 500 letras.' } : textoOpcional(v, 500)),
  foto_perfil_url: (v) => {
    if (v === null) return { valor: null };
    return typeof v === 'string' && /^https:\/\/\S+$/.test(v.trim()) && v.trim().length <= 255
      ? { valor: v.trim() }
      : { erro: 'foto_perfil_url precisa ser um endereço https de até 255 caracteres.' };
  },
  data_nascimento: (v) => {
    if (v === null) return { valor: null };
    const certo = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const data = certo ? new Date(`${v}T00:00:00Z`) : null;
    const valida = data && !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === v;
    return valida && data <= new Date() && data.getUTCFullYear() >= 1900
      ? { valor: v }
      : { erro: 'data_nascimento precisa ser uma data válida no passado (AAAA-MM-DD).' };
  },
  conta_privada: (v) => (typeof v === 'boolean' ? { valor: v } : { erro: 'conta_privada deve ser true ou false.' }),
  notificacoes_ativas: (v) => (typeof v === 'boolean' ? { valor: v } : { erro: 'notificacoes_ativas deve ser true ou false.' }),
  preferencias_notificacao: (v) => {
    const certo = v && typeof v === 'object' && !Array.isArray(v)
      && Object.keys(v).length === ASSUNTOS_NOTIFICACAO.length
      && ASSUNTOS_NOTIFICACAO.every((assunto) => typeof v[assunto] === 'boolean');
    return certo
      ? { valor: JSON.stringify(Object.fromEntries(ASSUNTOS_NOTIFICACAO.map((a) => [a, v[a]]))) }
      : { erro: `preferencias_notificacao deve ter ${ASSUNTOS_NOTIFICACAO.join(', ')}, cada um true ou false.` };
  },
};

// GET /usuarios/me — dados do usuário logado
router.get('/me', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id_usuario = $1`, [req.usuario.id]);
    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json(usuario);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
});

// PUT /usuarios/me — só os campos enviados mudam; null apaga (menos o nome)
router.put('/me', verificarToken, async (req, res) => {
  try {
    const corpo = req.body ?? {};
    const sets = [];
    const valores = [];

    for (const [campo, regra] of Object.entries(REGRAS_PERFIL)) {
      if (!(campo in corpo)) continue;
      const resultadoRegra = regra(corpo[campo]);
      if (resultadoRegra.erro) {
        return res.status(400).json({ erro: resultadoRegra.erro });
      }
      valores.push(resultadoRegra.valor);
      sets.push(`${campo} = $${valores.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ erro: `Envie ao menos um destes campos: ${Object.keys(REGRAS_PERFIL).join(', ')}.` });
    }

    valores.push(req.usuario.id);
    const resultado = await pool.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = $${valores.length} RETURNING ${CAMPOS_USUARIO}`,
      valores
    );
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    await registrarLog(req, { acao: 'dados_alterados', detalhes: { campos: Object.keys(REGRAS_PERFIL).filter((c) => c in corpo) } });
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

// Avaliações e fotos feitas por um usuário (só de empresas aprovadas)
async function montarPerfil(usuarioId) {
  const [avaliacoes, fotos] = await Promise.all([
      pool.query(
        `SELECT a.id_avaliacao, a.empresa_id, e.nome_fantasia AS empresa_nome, a.nota, a.comentario,
                a.criado_em, a.editado_em,
                COALESCE(e.ramo, (SELECT c.nome FROM empresa_categoria ec JOIN categorias c ON c.id_categoria = ec.categoria_id
                 WHERE ec.empresa_id = e.id_empresa ORDER BY c.nome LIMIT 1)) AS empresa_categoria,
                COALESCE((SELECT json_agg(f.url ORDER BY f.ordem, f.id_foto)
                          FROM fotos_avaliacao f WHERE f.avaliacao_id = a.id_avaliacao), '[]') AS fotos
         FROM avaliacoes a
         JOIN empresas e ON e.id_empresa = a.empresa_id
         WHERE a.usuario_id = $1 AND e.status = 'aprovada'
         ORDER BY a.criado_em DESC`,
        [usuarioId]
      ),
      pool.query(
        `SELECT f.id_foto, f.url, f.avaliacao_id, a.empresa_id, e.nome_fantasia AS empresa_nome, f.criado_em
         FROM fotos_avaliacao f
         JOIN avaliacoes a ON a.id_avaliacao = f.avaliacao_id
         JOIN empresas e ON e.id_empresa = a.empresa_id
         WHERE a.usuario_id = $1 AND e.status = 'aprovada'
         ORDER BY f.criado_em DESC, f.id_foto DESC`,
        [usuarioId]
      ),
    ]);

  return {
    total_avaliacoes: avaliacoes.rows.length,
    total_fotos: fotos.rows.length,
    avaliacoes: avaliacoes.rows,
    fotos: fotos.rows,
  };
}

// Ações que a própria pessoa vê na atividade da conta
const ACOES_DA_CONTA = ['login', 'login_falhou', 'senha_trocada', 'senha_codigo_pedido', 'senha_codigo_errado', 'senha_atual_errada', 'dados_alterados'];
const LIMITE_ATIVIDADE = 30;

// GET /usuarios/me/atividade — últimos logins e mudanças de segurança da própria conta
router.get('/me/atividade', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_log, acao, detalhes, ip, aparelho, criado_em
       FROM logs_atividade
       WHERE id_usuario = $1 AND acao = ANY($2::text[])
       ORDER BY criado_em DESC, id_log DESC
       LIMIT $3`,
      [req.usuario.id, ACOES_DA_CONTA, LIMITE_ATIVIDADE]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar a atividade da conta.' });
  }
});

// GET /usuarios/me/perfil — o próprio perfil (sempre completo)
router.get('/me/perfil', verificarToken, async (req, res) => {
  try {
    return res.json(await montarPerfil(req.usuario.id));
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// Id de quem está logado, se houver token válido (rota pública não exige login)
function usuarioOpcional(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// GET /usuarios/:id/perfil — perfil de outra pessoa; conta privada mostra só nome e foto
router.get('/:id/perfil', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = Number.isInteger(id) && id > 0
      ? await pool.query(
          'SELECT id_usuario AS id, nome, foto_perfil_url, biografia, conta_privada FROM usuarios WHERE id_usuario = $1',
          [id]
        )
      : { rows: [] };
    if (!usuario.rows[0]) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const { biografia, conta_privada, ...basico } = usuario.rows[0];
    if (conta_privada && usuarioOpcional(req) !== id) {
      return res.json({ ...basico, conta_privada: true });
    }
    return res.json({ ...basico, biografia, conta_privada, ...(await montarPerfil(id)) });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// DELETE /usuarios/me — confere a senha e apaga a conta com tudo o que é dela (empresas incluídas)
router.delete('/me', verificarToken, async (req, res) => {
  const senha = req.body?.senha;
  if (typeof senha !== 'string' || !senha) {
    return res.status(400).json({ erro: 'senha é obrigatória para excluir a conta.' });
  }

  const cliente = await pool.connect();
  try {
    const resultado = await cliente.query('SELECT senha_hash, tipo FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    if (usuario.tipo === 'admin') {
      return res.status(403).json({ erro: 'A conta de administradora não pode ser excluída por aqui.' });
    }
    // Senha errada responde 403 (o 401 faria o app encerrar a sessão)
    if (!(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(403).json({ erro: 'Senha incorreta.' });
    }

    await registrarLog(req, { acao: 'conta_excluida', detalhes: { id_usuario_excluido: req.usuario.id } });
    await cliente.query('BEGIN');

    // Empresas de outras pessoas que esta conta avaliou (a nota delas muda)
    const avaliadas = await cliente.query(
      `SELECT DISTINCT a.empresa_id FROM avaliacoes a
       JOIN empresas e ON e.id_empresa = a.empresa_id
       WHERE a.usuario_id = $1 AND e.id_usuario <> $1`,
      [req.usuario.id]
    );

    // O banco apaga em cascata empresas, avaliações, listas, salvos, histórico e códigos
    await cliente.query('DELETE FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

    for (const { empresa_id } of avaliadas.rows) {
      await cliente.query(
        `UPDATE empresas SET
           nota_media = COALESCE((SELECT AVG(nota) FROM avaliacoes WHERE empresa_id = $1), 0),
           total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE empresa_id = $1)
         WHERE id_empresa = $1`,
        [empresa_id]
      );
    }

    await cliente.query('COMMIT');
    return res.json({ mensagem: 'Conta excluída.' });
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao excluir conta.' });
  } finally {
    cliente.release();
  }
});

const TAMANHO_MINIMO_SENHA = 6;
const MAXIMO_TENTATIVAS_CODIGO = 5;
const ESPERA_ENTRE_CODIGOS_SEGUNDOS = 60;

// PASSO 1 da troca de senha: gera um código de 6 dígitos e envia para o e-mail
router.post('/me/solicitar-codigo-senha', verificarToken, async (req, res) => {
  try {
    // Um código por minuto, para não lotar o e-mail
    const recente = await pool.query(
      `SELECT 1 FROM codigos_verificacao_senha
       WHERE usuario_id = $1 AND criado_em > NOW() - make_interval(secs => $2)`,
      [req.usuario.id, ESPERA_ENTRE_CODIGOS_SEGUNDOS]
    );
    if (recente.rows[0]) {
      return res.status(429).json({ erro: 'Espere um minuto para pedir outro código.' });
    }

    const codigo = String(require('crypto').randomInt(100000, 1000000));

    // O código novo anula os anteriores; vale por 10 minutos
    await pool.query(
      'UPDATE codigos_verificacao_senha SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE',
      [req.usuario.id]
    );
    await pool.query(
      `INSERT INTO codigos_verificacao_senha (usuario_id, codigo, expira_em)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [req.usuario.id, codigo]
    );

    const nodemailer = require('nodemailer');
    const transportador = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
    });

    const usuario = await pool.query('SELECT email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: usuario.rows[0].email,
      subject: 'Código para trocar sua senha — DivulgaMap',
      text: `Seu código é: ${codigo}. Se você não pediu essa troca de senha, ignore este e-mail.`,
    });

    await registrarLog(req, { acao: 'senha_codigo_pedido' });
    return res.json({ mensagem: 'Código enviado para o seu e-mail.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar código.' });
  }
});

// Troca de senha: com a senha atual ou, se a pessoa esqueceu, com o código enviado por e-mail
router.put('/me/senha', verificarToken, async (req, res) => {
  try {
    const { codigo, senhaAtual, novaSenha, desconectarOutros } = req.body ?? {};

    if (typeof novaSenha !== 'string' || novaSenha.length < TAMANHO_MINIMO_SENHA) {
      return res.status(400).json({ erro: `A senha nova precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` });
    }

    let idCodigo = null;
    if (typeof senhaAtual === 'string' && senhaAtual) {
      // Senha atual errada responde 403 (o 401 faria o app encerrar a sessão)
      const atual = await pool.query('SELECT senha_hash FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
      if (!atual.rows[0] || !(await bcrypt.compare(senhaAtual, atual.rows[0].senha_hash))) {
        await registrarLog(req, { acao: 'senha_atual_errada' });
        return res.status(403).json({ erro: 'A senha atual está incorreta.' });
      }
    } else {
      if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo.trim())) {
        return res.status(400).json({ erro: 'Informe a senha atual ou o código de 6 números enviado por e-mail.' });
      }

      // Código em vigor (o mais recente, ainda não usado)
      const ativo = await pool.query(
        `SELECT id_codigo, codigo, tentativas FROM codigos_verificacao_senha
         WHERE usuario_id = $1 AND usado = FALSE AND expira_em > NOW()
         ORDER BY criado_em DESC LIMIT 1`,
        [req.usuario.id]
      );
      const registro = ativo.rows[0];
      if (!registro) {
        return res.status(400).json({ erro: 'Código expirado. Peça um código novo.' });
      }

      // Código errado conta tentativa; na quinta, o código deixa de valer
      if (registro.codigo !== codigo.trim()) {
        const tentativas = registro.tentativas + 1;
        await pool.query(
          'UPDATE codigos_verificacao_senha SET tentativas = $1, usado = $2 WHERE id_codigo = $3',
          [tentativas, tentativas >= MAXIMO_TENTATIVAS_CODIGO, registro.id_codigo]
        );
        const restantes = MAXIMO_TENTATIVAS_CODIGO - tentativas;
        await registrarLog(req, { acao: 'senha_codigo_errado', detalhes: { tentativa: tentativas } });
        return res.status(400).json({
          erro: restantes > 0
            ? `Código incorreto. Você ainda tem ${restantes} ${restantes === 1 ? 'tentativa' : 'tentativas'}.`
            : 'Código incorreto. Este código foi bloqueado; peça um novo.',
        });
      }
      idCodigo = registro.id_codigo;
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const desconectar = desconectarOutros === true;
    // Momento do corte em segundos, o mesmo usado no login novo deste aparelho
    const agora = Math.floor(Date.now() / 1000);

    // Com "desconectar outros", os logins anteriores deixam de valer (ver middlewares/auth.js)
    const atualizado = await pool.query(
      `UPDATE usuarios SET senha_hash = $1, senha_atualizada_em = NOW() AT TIME ZONE 'UTC',
         sessoes_validas_desde = CASE WHEN $2 THEN to_timestamp($3) AT TIME ZONE 'UTC' ELSE sessoes_validas_desde END
       WHERE id_usuario = $4 RETURNING id_usuario, nome, tipo`,
      [senhaHash, desconectar, agora, req.usuario.id]
    );
    if (idCodigo) {
      await pool.query('UPDATE codigos_verificacao_senha SET usado = TRUE WHERE id_codigo = $1', [idCodigo]);
    }

    await registrarLog(req, {
      acao: 'senha_trocada',
      detalhes: { metodo: idCodigo ? 'codigo_por_email' : 'senha_atual', desconectou_outros: desconectar },
    });
    const conta = await pool.query('SELECT email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
    await avisoPorEmail(
      conta.rows[0]?.email,
      'Sua senha foi alterada',
      `A senha da sua conta no DivulgaMap foi alterada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`
    );

    // Este aparelho recebe um login novo para continuar conectado
    if (desconectar) {
      const usuario = atualizado.rows[0];
      const token = jwt.sign({ id: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo, iat: agora }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ mensagem: 'Senha alterada com sucesso.', token });
    }
    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao trocar senha.' });
  }
});

module.exports = router;