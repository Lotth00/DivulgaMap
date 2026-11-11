import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, Share, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import { linkWhatsapp, conversar } from '../components/perfilEmpresa/util';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const MOTIVOS_DENUNCIA = [
  { valor: 'informacoes_incorretas', rotulo: 'Informações incorretas' },
  { valor: 'nao_existe', rotulo: 'A empresa não existe mais' },
  { valor: 'duplicada', rotulo: 'Empresa repetida no app' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

// Opção do menu ⋮
function OpcaoMenu({ icone, texto, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.opcao} activeOpacity={0.6}>
      {icone && <Ionicons name={icone} size={22} color={colors.pretoTexto} style={styles.iconeOpcao} />}
      <Text style={styles.textoOpcao}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Nome da aba de produtos conforme o ramo da empresa
function rotuloDosProdutos(empresa) {
  if (empresa?.categorias?.includes('Alimentação')) return 'Cardápio';
  if (empresa?.tipo === 'servico') return 'Serviços';
  return 'Produtos';
}

// Perfil público da empresa, com as abas Geral, Cardápio, Avaliações, Fotos e Sobre
export default function PerfilEmpresaScreen({ route, navigation }) {
  const { id, aba: abaInicial = 'geral', produtoId } = route.params ?? {};
  const { logado } = useAuth();
  const insets = useSafeAreaInsets();
  const rolagem = useRef(null);
  const [menu, setMenu] = useState(null);

  const [empresa, setEmpresa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [falhouExtras, setFalhouExtras] = useState(false);
  const [aba, setAba] = useState(abaInicial);

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
      Alert.alert('Entre na sua conta', 'Para denunciar uma empresa, faça login.');
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
      { valor: 'avaliacoes', rotulo: 'Avaliações' },
      { valor: 'fotos', rotulo: 'Fotos' },
      { valor: 'sobre', rotulo: 'Sobre' },
    ];

    let corpo;
    if (falhouExtras && ['cardapio', 'avaliacoes'].includes(aba)) {
      corpo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
    } else if (aba === 'cardapio') {
      corpo = (
        <AbaCardapio
          produtos={produtos}
          ofertas={ofertas}
          categoriaEmpresa={empresa.categorias?.[0]}
          rotulo={abas[1].rotulo}
          produtoEmDestaque={produtoId}
          onAbrirOferta={abrirOferta}
        />
      );
    } else if (aba === 'avaliacoes') {
      corpo = <AbaAvaliacoes empresa={empresa} avaliacoes={avaliacoes} />;
    } else if (aba === 'fotos') {
      corpo = <AbaFotos fotos={empresa.fotos ?? []} />;
    } else if (aba === 'sobre') {
      corpo = <AbaSobre empresa={empresa} />;
    } else {
      corpo = <AbaGeral empresa={empresa} ofertas={ofertas} avaliacoes={avaliacoes} onIrPara={irPara} onAbrirOferta={abrirOferta} />;
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
    <View style={styles.tela}>
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

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.fundoMenu} onPress={() => setMenu(null)} />
        <View style={[styles.folhaMenu, { paddingBottom: insets.bottom + 16 }]}>
          {menu === 'denuncia' ? (
            <>
              <Text style={styles.tituloMenu}>Qual o problema?</Text>
              {MOTIVOS_DENUNCIA.map((m) => (
                <OpcaoMenu key={m.valor} texto={m.rotulo} onPress={() => denunciar(m.valor)} />
              ))}
            </>
          ) : (
            <>
              <OpcaoMenu icone="share-social-outline" texto="Compartilhar" onPress={compartilhar} />
              <OpcaoMenu icone="flag-outline" texto="Denunciar empresa" onPress={abrirDenuncia} />
            </>
          )}
          <OpcaoMenu texto="Cancelar" onPress={() => setMenu(null)} />
        </View>
      </Modal>
    </View>
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
  textoAba: { ...tipografia.corpo, fontSize: 18, color: colors.pretoTexto },
  flutuante: {
    position: 'absolute', right: 20, borderRadius: 30,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  circuloFlutuante: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  fundoMenu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folhaMenu: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20 },
  tituloMenu: { ...tipografia.tituloSecao, color: colors.textoSecundario, paddingVertical: 8 },
  opcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconeOpcao: { marginRight: 14 },
  textoOpcao: { ...tipografia.corpo, color: colors.pretoTexto },
});
