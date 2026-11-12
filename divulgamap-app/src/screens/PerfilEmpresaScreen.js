import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Share, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Cabecalho from '../components/Cabecalho';
import Carregando from '../components/Carregando';
import EstadoVazio from '../components/EstadoVazio';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import CabecalhoEmpresa from '../components/perfilEmpresa/CabecalhoEmpresa';
import AbaGeral from '../components/perfilEmpresa/AbaGeral';
import AbaCardapio from '../components/perfilEmpresa/AbaCardapio';
import AbaAvaliacoes from '../components/perfilEmpresa/AbaAvaliacoes';
import AbaFotos from '../components/perfilEmpresa/AbaFotos';
import AbaSobre from '../components/perfilEmpresa/AbaSobre';
import ModalAvaliar from '../components/ModalAvaliar';
import ModalSalvar from '../components/ModalSalvar';
import ModalAcessoNecessario from '../components/ModalAcessoNecessario';
import MenuPopup from '../components/MenuPopup';
import { linkWhatsapp, conversar } from '../components/perfilEmpresa/util';
import TabelaProdutos from './empresa/TabelaProdutos';
import AbaOfertasDono from './empresa/AbaOfertasDono';
import { adicionarEmpresa } from './empresa/util';
import colors from '../theme/colors';
import tipografia, { fs } from '../theme/tipografia';

const MOTIVOS_DENUNCIA = [
  { valor: 'informacoes_incorretas', rotulo: 'Informações incorretas' },
  { valor: 'nao_existe', rotulo: 'A empresa não existe mais' },
  { valor: 'duplicada', rotulo: 'Empresa repetida no app' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

// Nome da aba de produtos conforme o ramo da empresa
function rotuloDosProdutos(empresa) {
  if (empresa?.categorias?.includes('Alimentação')) return 'Cardápio';
  if (empresa?.tipo === 'servico') return 'Serviços';
  return 'Produtos';
}

// Perfil público da empresa, com as abas Geral, Cardápio, Avaliações, Fotos e Sobre
export default function PerfilEmpresaScreen({ route, navigation }) {
  const { id, aba: abaInicial = 'geral', produtoId } = route.params ?? {};
  const { logado, usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const rolagem = useRef(null);
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [pedidoLogin, setPedidoLogin] = useState(null);
  const [salvo, setSalvo] = useState(false);

  const [empresa, setEmpresa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [falhouExtras, setFalhouExtras] = useState(false);
  const [aba, setAba] = useState(abaInicial);
  const [dono, setDono] = useState(false);
  const [promocoesDono, setPromocoesDono] = useState([]);
  const [editandoProdutos, setEditandoProdutos] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    setFalhouExtras(false);
    const [dados, listaProdutos, listaAvaliacoes, listaOfertas] = await Promise.allSettled([
      api.get(`/empresas/${id}`),
      api.get(`/produtos/empresa/${id}`),
      api.get(`/avaliacoes/empresa/${id}`),
      api.get('/promocoes/ativas', { params: { empresa: id, limite: 50 } }),
    ]);

    if (dados.status === 'rejected') {
      if (dados.reason?.response?.status === 404) setNaoEncontrada(true);
      else setFalhou(true);
      setCarregando(false);
      return;
    }
    setNaoEncontrada(false);
    setEmpresa(dados.value.data);
    if (listaProdutos.status === 'fulfilled') setProdutos(listaProdutos.value.data);
    if (listaAvaliacoes.status === 'fulfilled') setAvaliacoes(listaAvaliacoes.value.data);
    if (listaOfertas.status === 'fulfilled') setOfertas(listaOfertas.value.data);
    setFalhouExtras([listaProdutos, listaAvaliacoes, listaOfertas].some((r) => r.status === 'rejected'));
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Modo dono: a empresa está entre as do usuário logado
  useEffect(() => {
    if (!logado || !id) {
      setDono(false);
      return;
    }
    api.get('/empresas/minhas')
      .then((resposta) => setDono(resposta.data.some((e) => e.id_empresa === Number(id))))
      .catch(() => setDono(false));
  }, [logado, id]);

  // Produtos e todas as ofertas do dono, de novo ao voltar do formulário
  const carregarDono = useCallback(async () => {
    if (!dono) return;
    const [dados, listaProdutos, listaPromocoes, listaOfertas] = await Promise.allSettled([
      api.get(`/empresas/${id}`),
      api.get(`/produtos/empresa/${id}`),
      api.get(`/promocoes/empresa/${id}`),
      api.get('/promocoes/ativas', { params: { empresa: id, limite: 50 } }),
    ]);
    if (dados.status === 'fulfilled') setEmpresa(dados.value.data);
    if (listaProdutos.status === 'fulfilled') setProdutos(listaProdutos.value.data);
    if (listaPromocoes.status === 'fulfilled') setPromocoesDono(listaPromocoes.value.data);
    if (listaOfertas.status === 'fulfilled') setOfertas(listaOfertas.value.data);
  }, [dono, id]);

  useFocusEffect(useCallback(() => { carregarDono(); }, [carregarDono]));

  // Se a empresa já está salva em alguma lista da pessoa
  useEffect(() => {
    if (!logado || !id) {
      setSalvo(false);
      return;
    }
    api.get('/salvos/item', { params: { tipo_item: 'empresa', item_id: id } })
      .then((resposta) => setSalvo(resposta.data.length > 0))
      .catch(() => {});
  }, [logado, id]);

  // Nota, total e lista de avaliações de novo, sem o carregando da tela
  async function atualizarAvaliacoes() {
    try {
      const [dados, lista] = await Promise.all([api.get(`/empresas/${id}`), api.get(`/avaliacoes/empresa/${id}`)]);
      setEmpresa(dados.data);
      setAvaliacoes(lista.data);
    } catch (erro) {
      // Fica a versão anterior
    }
  }

  const minhaAvaliacao = logado ? avaliacoes.find((a) => a.usuario_id === usuario?.id) ?? null : null;

  function abrirAvaliar() {
    if (!logado) return setPedidoLogin('Para avaliar empresas, faça\nlogin ou crie uma conta');
    setModal('avaliar');
  }

  function abrirSalvar() {
    if (!logado) return setPedidoLogin('Para salvar empresas nas suas\nlistas, faça login ou crie uma conta');
    setModal('salvar');
  }

  // Registro no histórico de quem está logado
  useEffect(() => {
    if (!logado || !id) return;
    api.post('/historico', { tipo_acao: 'visualizacao', tipo_item: 'empresa', item_id: id }).catch(() => {});
  }, [logado, id]);

  function abrirOferta(oferta) {
    navigation.push('Oferta', { id: oferta.id, oferta });
  }

  async function compartilhar() {
    setMenu(null);
    if (!empresa) return;
    const endereco = [empresa?.endereco, empresa?.bairro].filter(Boolean).join(' - ');
    const mapa = empresa?.google_maps_url
      || (empresa?.latitude ? `https://www.google.com/maps/search/?api=1&query=${empresa?.latitude},${empresa?.longitude}` : '');
    try {
      await Share.share({ message: [`${empresa?.nome_fantasia} no DivulgaMap`, endereco, mapa].filter(Boolean).join('\n') });
    } catch (erro) {
      // Compartilhamento cancelado
    }
  }

  function abrirDenuncia() {
    if (!logado) {
      setMenu(null);
      setPedidoLogin('Para denunciar uma empresa, faça\nlogin ou crie uma conta');
      return;
    }
    setMenu('denuncia');
  }

  async function denunciar(motivo) {
    setMenu(null);
    try {
      await api.post(`/empresas/${id}/denunciar`, { motivo });
      Alert.alert('Denúncia enviada', 'Obrigado! A equipe do DivulgaMap vai analisar.');
    } catch (erro) {
      Alert.alert('Não foi possível enviar', 'Confira sua conexão e tente de novo.');
    }
  }

  function irPara(novaAba) {
    setAba(novaAba);
    rolagem.current?.scrollTo({ y: 0, animated: true });
  }

  let conteudo;
  if (carregando && !empresa) {
    conteudo = <Carregando />;
  } else if (naoEncontrada) {
    conteudo = <EstadoVazio icone="storefront-outline" mensagem="Esta empresa não está disponível." textoAcao="Voltar" onAcao={() => navigation.goBack()} />;
  } else if (falhou && !empresa) {
    conteudo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
  } else {
    const abas = [
      { valor: 'geral', rotulo: 'Geral' },
      { valor: 'cardapio', rotulo: rotuloDosProdutos(empresa) },
      ...(dono ? [{ valor: 'ofertas', rotulo: 'Ofertas' }] : []),
      { valor: 'avaliacoes', rotulo: 'Avaliações' },
      { valor: 'fotos', rotulo: 'Fotos' },
      { valor: 'sobre', rotulo: 'Sobre' },
    ];

    let corpo;
    if (falhouExtras && ['cardapio', 'avaliacoes'].includes(aba)) {
      corpo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
    } else if (aba === 'cardapio' && dono && editandoProdutos) {
      corpo = (
        <TabelaProdutos
          empresaId={empresa.id_empresa}
          produtos={produtos}
          categoriaEmpresa={empresa.categorias?.[0]}
          onMudou={carregarDono}
          onFechar={() => setEditandoProdutos(false)}
        />
      );
    } else if (aba === 'ofertas' && dono) {
      corpo = (
        <AbaOfertasDono
          empresaId={empresa.id_empresa}
          promocoes={promocoesDono}
          navigation={navigation}
          onMudou={carregarDono}
        />
      );
    } else if (aba === 'cardapio') {
      corpo = (
        <>
          {dono && (
            <TouchableOpacity onPress={() => setEditandoProdutos(true)} style={styles.editar} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color={colors.pretoTexto} />
              <Text style={styles.textoEditar}>Editar itens</Text>
            </TouchableOpacity>
          )}
          <AbaCardapio
          produtos={produtos}
          ofertas={ofertas}
          categoriaEmpresa={empresa.categorias?.[0]}
          rotulo={abas[1].rotulo}
          produtoEmDestaque={produtoId}
          onAbrirOferta={abrirOferta}
          />
        </>
      );
    } else if (aba === 'avaliacoes') {
      corpo = <AbaAvaliacoes empresa={empresa} avaliacoes={avaliacoes} minhaAvaliacao={minhaAvaliacao} onAvaliar={abrirAvaliar} />;
    } else if (aba === 'fotos') {
      corpo = <AbaFotos fotos={empresa.fotos ?? []} />;
    } else if (aba === 'sobre') {
      corpo = <AbaSobre empresa={empresa} />;
    } else {
      corpo = (
        <AbaGeral
          empresa={empresa}
          ofertas={ofertas}
          avaliacoes={avaliacoes}
          minhaAvaliacao={minhaAvaliacao}
          onAvaliar={abrirAvaliar}
          onIrPara={irPara}
          onAbrirOferta={abrirOferta}
        />
      );
    }

    conteudo = (
      <ScrollView ref={rolagem} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <CabecalhoEmpresa empresa={empresa} />

        <View style={styles.faixaAbas}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abas}>
            {abas.map((item) => {
              const ativa = item.valor === aba;
              return (
                <TouchableOpacity
                  key={item.valor}
                  onPress={() => setAba(item.valor)}
                  style={styles.toqueAba}
                  accessibilityState={{ selected: ativa }}
                >
                  {ativa ? (
                    <LinearGradient colors={[colors.abaInicio, colors.abaFim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aba}>
                      <Text style={styles.textoAba}>{item.rotulo}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.aba}>
                      <Text style={styles.textoAba}>{item.rotulo}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {corpo}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding">
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} onMenu={empresa ? () => setMenu('principal') : undefined} />
      {conteudo}

      {empresa && linkWhatsapp(empresa.telefone) && (
        <TouchableOpacity
          onPress={() => conversar(empresa.telefone)}
          style={[styles.flutuante, { bottom: insets.bottom + 20 }]}
          activeOpacity={0.85}
          accessibilityLabel="Conversar pelo WhatsApp"
        >
          <LinearGradient colors={[colors.menuInicio, colors.menuFim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circuloFlutuante}>
            <Ionicons name="logo-whatsapp" size={28} color={colors.pretoTexto} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {empresa && (
        <>
          <ModalAvaliar
            visivel={modal === 'avaliar'}
            empresa={empresa}
            avaliacaoAtual={minhaAvaliacao}
            onFechar={() => setModal(null)}
            onMudou={atualizarAvaliacoes}
          />
          <ModalSalvar
            visivel={modal === 'salvar'}
            tipoItem="empresa"
            itemId={empresa.id_empresa}
            nomeItem={empresa.nome_fantasia}
            onFechar={() => setModal(null)}
            onMudou={setSalvo}
          />
        </>
      )}
      <ModalAcessoNecessario
        visivel={!!pedidoLogin}
        mensagem={pedidoLogin ?? ''}
        navigation={navigation}
        onFechar={() => setPedidoLogin(null)}
      />

      <MenuPopup
        visivel={menu === 'principal'}
        opcoes={dono ? [
          { texto: 'Editar perfil', onPress: () => navigation.navigate('EditarEmpresa', { id: empresa.id_empresa }) },
          { texto: 'Anúncios', onPress: () => navigation.navigate('MeusAnuncios', { empresaId: empresa.id_empresa, empresaNome: empresa.nome_fantasia }) },
          { texto: 'Compartilhar', onPress: compartilhar },
          { texto: 'Adicionar outra empresa', onPress: () => adicionarEmpresa(navigation) },
        ] : [
          { texto: salvo ? 'Salvo nas suas listas' : 'Salvar', onPress: abrirSalvar },
          { texto: 'Compartilhar', onPress: compartilhar },
          { texto: 'Denunciar empresa', onPress: abrirDenuncia, perigo: true },
        ]}
        onFechar={() => setMenu(null)}
      />
      <MenuPopup
        visivel={menu === 'denuncia'}
        opcoes={MOTIVOS_DENUNCIA.map((m) => ({ texto: m.rotulo, onPress: () => denunciar(m.valor) }))}
        onFechar={() => setMenu(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: 20, paddingBottom: 100 },
  faixaAbas: {
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.bordaClara,
    marginTop: 18, marginBottom: 18, paddingVertical: 8,
  },
  abas: { alignItems: 'center' },
  toqueAba: { marginRight: 14 },
  aba: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  textoAba: { ...tipografia.corpo, fontSize: fs(15), color: colors.pretoTexto },
  flutuante: {
    position: 'absolute', right: 20, borderRadius: 30,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  circuloFlutuante: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  editar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 8 },
  textoEditar: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 6 },
});
