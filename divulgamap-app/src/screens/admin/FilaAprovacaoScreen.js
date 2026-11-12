import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import AbasPromocoes from '../../components/AbasPromocoes';
import EstadoVazio from '../../components/EstadoVazio';
import ImagemItem from '../../components/ImagemItem';
import ModalEditarTexto from '../../components/conta/ModalEditarTexto';
import { mensagemDeErro } from '../empresa/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const TIPOS_EMPRESA = { comercio: 'Comércio', servico: 'Serviços', ambos: 'Comércio e serviços' };
const MOTIVOS_DENUNCIA = {
  duplicada: 'Empresa duplicada',
  informacoes_incorretas: 'Informações incorretas',
  nao_existe: 'Empresa não existe',
  outro: 'Outro motivo',
};
const SITUACAO_EMPRESA = { aprovada: 'aprovada', pendente_aprovacao: 'em análise', rejeitada: 'rejeitada', rascunho: 'rascunho' };

const dois = (n) => String(n).padStart(2, '0');

// Data e hora no formato DD/MM/AAAA HH:MM
function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

// Linha "rótulo: valor" (some quando não há valor)
function Linha({ icone, texto }) {
  if (!texto) return null;
  return (
    <View style={styles.linha}>
      <Ionicons name={icone} size={16} color={colors.textoSecundario} style={styles.iconeLinha} />
      <Text style={styles.textoLinha}>{texto}</Text>
    </View>
  );
}

// Par de botões: confirmar (preto) e recusar (contorno)
function Acoes({ textoSim, textoNao, onSim, onNao, ocupado }) {
  return (
    <View style={styles.acoes}>
      <TouchableOpacity onPress={onNao} disabled={ocupado} style={[styles.botao, styles.botaoNao]} activeOpacity={0.8}>
        <Text style={[styles.textoBotao, styles.textoBotaoNao]}>{textoNao}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSim} disabled={ocupado} style={[styles.botao, styles.botaoSim, ocupado && styles.ocupado]} activeOpacity={0.8}>
        <Text style={[styles.textoBotao, styles.textoBotaoSim]}>{ocupado ? 'Enviando...' : textoSim}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Cartão de uma empresa esperando aprovação
function CartaoEmpresaPendente({ empresa, ocupado, onAprovar, onRejeitar }) {
  const endereco = [empresa.endereco, empresa.bairro].filter(Boolean).join(' · ');
  const verificacao = empresa.verificado_em
    ? `Verificada por ${empresa.metodo_verificacao === 'sms' ? 'SMS' : 'e-mail'} em ${dataHora(empresa.verificado_em)}`
    : 'Sem verificação';
  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        <ImagemItem uri={empresa.foto_perfil_url ?? empresa.fotos?.[0]} categoria={empresa.categorias?.[0]} largura={56} raio={28} />
        <View style={styles.topoTexto}>
          <Text style={styles.nome} numberOfLines={2}>{empresa.nome_fantasia}</Text>
          <Text style={styles.detalhe} numberOfLines={2}>
            {[empresa.ramo, TIPOS_EMPRESA[empresa.tipo], ...(empresa.categorias ?? [])].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {empresa.descricao ? <Text style={styles.descricao}>{empresa.descricao}</Text> : null}
      <Linha icone="location-outline" texto={endereco} />
      <Linha icone="flag-outline" texto={empresa.referencia ? `Referência: ${empresa.referencia}` : null} />
      <Linha icone="call-outline" texto={empresa.telefone} />
      <Linha icone="globe-outline" texto={empresa.site} />
      <Linha icone="person-outline" texto={`${empresa.dono_nome} (${empresa.dono_email})`} />
      <Linha icone="shield-checkmark-outline" texto={verificacao} />
      <Linha icone="pricetags-outline" texto={`${empresa.total_produtos} ${empresa.total_produtos === 1 ? 'item' : 'itens'} na planilha`} />
      <Linha icone="time-outline" texto={`Enviada em ${dataHora(empresa.enviada_para_aprovacao_em)}`} />

      {empresa.fotos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotos}>
          {empresa.fotos.map((url) => <Image key={url} source={{ uri: url }} style={styles.foto} />)}
        </ScrollView>
      )}

      <Acoes textoSim="Aprovar" textoNao="Rejeitar" onSim={onAprovar} onNao={onRejeitar} ocupado={ocupado} />
    </View>
  );
}

// Cartão de uma reivindicação ou denúncia
function CartaoSolicitacao({ solicitacao, ocupado, onAprovar, onRecusar, onAbrirEmpresa }) {
  const reivindicacao = solicitacao.tipo === 'reivindicacao';
  const situacao = SITUACAO_EMPRESA[solicitacao.status_empresa] ?? solicitacao.status_empresa;
  return (
    <View style={styles.cartao}>
      <View style={styles.selo}>
        <Ionicons name={reivindicacao ? 'key-outline' : 'warning-outline'} size={16} color={colors.pretoTexto} />
        <Text style={styles.textoSelo}>
          {reivindicacao ? 'Pedido para ser dono' : `Denúncia · ${MOTIVOS_DENUNCIA[solicitacao.motivo] ?? 'sem motivo'}`}
        </Text>
      </View>

      <TouchableOpacity onPress={onAbrirEmpresa} disabled={solicitacao.status_empresa !== 'aprovada'} activeOpacity={0.7}>
        <Text style={styles.nome}>{solicitacao.nome_fantasia}</Text>
      </TouchableOpacity>
      <Text style={styles.detalhe}>Empresa {situacao}</Text>

      <Linha icone="person-outline" texto={`${solicitacao.solicitante_nome} (${solicitacao.solicitante_email})`} />
      <Linha icone="chatbubble-outline" texto={solicitacao.mensagem ? `"${solicitacao.mensagem}"` : 'Sem mensagem'} />
      <Linha icone="time-outline" texto={`Enviada em ${dataHora(solicitacao.criado_em)}`} />

      <Text style={styles.ajuda}>
        {reivindicacao
          ? 'Aceitar passa a empresa para quem pediu e recusa os outros pedidos para ela.'
          : 'Aceitar tira a empresa do mapa, com a denúncia como motivo.'}
      </Text>
      <Acoes textoSim="Aceitar" textoNao="Recusar" onSim={onAprovar} onNao={onRecusar} ocupado={ocupado} />
    </View>
  );
}

// Fila de aprovação do admin: empresas novas e solicitações (reivindicações e denúncias)
export default function FilaAprovacaoScreen({ navigation }) {
  const [aba, setAba] = useState('empresas');
  const [empresas, setEmpresas] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [rejeitando, setRejeitando] = useState(null);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const [respostaEmpresas, respostaSolicitacoes] = await Promise.all([
        api.get('/empresas/pendentes'),
        api.get('/empresas/solicitacoes/pendentes'),
      ]);
      setEmpresas(respostaEmpresas.data);
      setSolicitacoes(respostaSolicitacoes.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  // Envia a decisão e tira o item da lista
  async function decidir(chave, requisicao, removerDaLista) {
    setOcupado(chave);
    try {
      await requisicao();
      removerDaLista();
      return true;
    } catch (erro) {
      Alert.alert('Não foi possível concluir', mensagemDeErro(erro));
      if (erro.response?.status === 400 || erro.response?.status === 404) carregar();
      return false;
    } finally {
      setOcupado(null);
    }
  }

  function aprovarEmpresa(empresa) {
    Alert.alert('Aprovar empresa', `"${empresa.nome_fantasia}" vai aparecer no mapa para todos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: () => decidir(
          `e${empresa.id_empresa}`,
          () => api.patch(`/empresas/${empresa.id_empresa}/aprovar`),
          () => setEmpresas((atual) => atual.filter((e) => e.id_empresa !== empresa.id_empresa))
        ),
      },
    ]);
  }

  async function rejeitarEmpresa(motivo) {
    const empresa = rejeitando;
    const ok = await decidir(
      `e${empresa.id_empresa}`,
      () => api.patch(`/empresas/${empresa.id_empresa}/rejeitar`, { motivo }),
      () => setEmpresas((atual) => atual.filter((e) => e.id_empresa !== empresa.id_empresa))
    );
    if (ok) setRejeitando(null);
  }

  function decidirSolicitacao(solicitacao, aceitar) {
    const reivindicacao = solicitacao.tipo === 'reivindicacao';
    let mensagem = 'O pedido será marcado como recusado.';
    if (aceitar) {
      mensagem = reivindicacao
        ? `"${solicitacao.nome_fantasia}" passa a ser de ${solicitacao.solicitante_nome}.`
        : `"${solicitacao.nome_fantasia}" sai do mapa e o dono vê a denúncia como motivo.`;
    }
    Alert.alert(aceitar ? 'Aceitar pedido' : 'Recusar pedido', mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: aceitar ? 'Aceitar' : 'Recusar',
        style: aceitar ? 'default' : 'destructive',
        onPress: () => decidir(
          `s${solicitacao.id_solicitacao}`,
          () => api.patch(`/empresas/solicitacoes/${solicitacao.id_solicitacao}/${aceitar ? 'aprovar' : 'rejeitar'}`),
          () => {
            // Aceitar uma reivindicação encerra as outras da mesma empresa
            const encerraOutras = aceitar && reivindicacao;
            setSolicitacoes((atual) => atual.filter((s) => s.id_solicitacao !== solicitacao.id_solicitacao
              && !(encerraOutras && s.tipo === 'reivindicacao' && s.empresa_id === solicitacao.empresa_id)));
          }
        ),
      },
    ]);
  }

  const abas = [
    { valor: 'empresas', rotulo: `Empresas (${empresas.length})` },
    { valor: 'solicitacoes', rotulo: `Solicitações (${solicitacoes.length})` },
  ];

  return (
    <TelaConta
      navigation={navigation}
      titulo="Aprovações"
      descricao="Empresas novas esperando aprovação e pedidos de usuários sobre empresas já cadastradas."
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
    >
      <TouchableOpacity onPress={() => navigation.navigate('RegistroAtividades')} style={styles.atalhoRegistro} activeOpacity={0.7}>
        <Ionicons name="document-text-outline" size={20} color={colors.pretoTexto} />
        <Text style={styles.textoAtalho}>Registro de atividades</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.pretoTexto} />
      </TouchableOpacity>
      <AbasPromocoes abas={abas} selecionada={aba} onSelecionar={setAba} />

      {aba === 'empresas' && (empresas.length === 0
        ? <EstadoVazio icone="checkmark-done-outline" mensagem="Nenhuma empresa esperando aprovação." />
        : empresas.map((empresa) => (
          <CartaoEmpresaPendente
            key={empresa.id_empresa}
            empresa={empresa}
            ocupado={ocupado === `e${empresa.id_empresa}`}
            onAprovar={() => aprovarEmpresa(empresa)}
            onRejeitar={() => setRejeitando(empresa)}
          />
        )))}

      {aba === 'solicitacoes' && (solicitacoes.length === 0
        ? <EstadoVazio icone="checkmark-done-outline" mensagem="Nenhuma solicitação esperando análise." />
        : solicitacoes.map((solicitacao) => (
          <CartaoSolicitacao
            key={solicitacao.id_solicitacao}
            solicitacao={solicitacao}
            ocupado={ocupado === `s${solicitacao.id_solicitacao}`}
            onAprovar={() => decidirSolicitacao(solicitacao, true)}
            onRecusar={() => decidirSolicitacao(solicitacao, false)}
            onAbrirEmpresa={() => navigation.navigate('Empresa', { id: solicitacao.empresa_id })}
          />
        )))}

      <ModalEditarTexto
        visivel={!!rejeitando}
        titulo="Motivo da rejeição"
        ajuda={rejeitando ? `O dono de "${rejeitando.nome_fantasia}" vai ver este motivo e poderá corrigir e reenviar.` : null}
        placeholder="Ex: Endereço incompleto"
        maxLength={500}
        textoBotao="Rejeitar"
        enviando={!!rejeitando && ocupado === `e${rejeitando.id_empresa}`}
        onConfirmar={rejeitarEmpresa}
        onFechar={() => setRejeitando(null)}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  atalhoRegistro: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, backgroundColor: colors.brancoFundo,
  },
  textoAtalho: { ...tipografia.corpo, color: colors.pretoTexto, flex: 1, marginLeft: 10 },
  cartao: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, padding: 14, marginBottom: 14, backgroundColor: colors.brancoFundo },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  topoTexto: { flex: 1, marginLeft: 12 },
  nome: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2, marginBottom: 6 },
  descricao: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginBottom: 8 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  iconeLinha: { marginRight: 8, marginTop: 2 },
  textoLinha: { ...tipografia.legenda, color: colors.pretoTexto, flex: 1 },
  fotos: { marginTop: 10 },
  foto: { width: 88, height: 88, borderRadius: 10, marginRight: 8, backgroundColor: colors.cinzaInput },
  selo: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.menuInicio, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  textoSelo: { ...tipografia.legenda, color: colors.pretoTexto, marginLeft: 6 },
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 10 },
  acoes: { flexDirection: 'row', marginTop: 14 },
  botao: { flex: 1, borderRadius: 24, paddingVertical: 9, alignItems: 'center' },
  botaoNao: { borderWidth: 1.5, borderColor: colors.pretoTexto, marginRight: 10 },
  botaoSim: { backgroundColor: colors.pretoTexto },
  ocupado: { opacity: 0.6 },
  textoBotao: { ...tipografia.botao },
  textoBotaoNao: { color: colors.pretoTexto },
  textoBotaoSim: { color: colors.brancoFundo },
});
