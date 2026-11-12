import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ImagemItem from '../components/ImagemItem';
import TituloSecao from '../components/TituloSecao';
import LinhaVerMais from '../components/LinhaVerMais';
import BotaoGradiente from '../components/BotaoGradiente';
import Carregando from '../components/Carregando';
import EstadoVazio from '../components/EstadoVazio';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import MenuPopup, { ancoraDoToque } from '../components/MenuPopup';
import colors from '../theme/colors';
import tipografia, { fs } from '../theme/tipografia';

const RECENTES_INICIAIS = 3;
const COR_ESTRELA = '#B5CC18';
const RECENTES_MAXIMO = 50;

const SEM_RESULTADOS = { empresas: [], produtos: [], ofertas: [] };

// O que mostrar nos resultados
const TIPOS_RESULTADO = [
  { valor: 'empresas', rotulo: 'Empresas' },
  { valor: 'produtos', rotulo: 'Produtos e serviços' },
  { valor: 'ofertas', rotulo: 'Ofertas' },
];

// "5.5" → "R$5,50"
function formatarPreco(valor, unidade) {
  const texto = `R$${Number(valor).toFixed(2).replace('.', ',')}`;
  return unidade && unidade !== 'un' ? `${texto}/${unidade.charAt(0).toUpperCase()}${unidade.slice(1)}` : texto;
}

// "5h", "4d", "agora"
function tempoDesde(data) {
  const minutos = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d`;
}

// Linha de apoio do item do histórico
function subtitulo(item) {
  if (item.tipo_item === 'promocao') return `Oferta - ${item.empresa_nome ?? ''}`;
  if (item.tipo_item === 'produto') return `Produto - ${item.empresa_nome ?? ''}`;
  return item.categoria ?? '';
}

// Botão em pílula do filtro
function Chip({ rotulo, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]} activeOpacity={0.8}>
      <Text style={styles.textoChip}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

export default function PesquisaScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { logado } = useAuth();

  const [busca, setBusca] = useState(route.params?.termo ?? '');
  const [menuRecente, setMenuRecente] = useState(null);
  const [resultados, setResultados] = useState(SEM_RESULTADOS);
  const [buscando, setBuscando] = useState(false);
  const [falhouBusca, setFalhouBusca] = useState(false);

  const [recentes, setRecentes] = useState([]);
  const [carregandoRecentes, setCarregandoRecentes] = useState(false);
  const [falhouRecentes, setFalhouRecentes] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const ultimaBusca = useRef(0);
  const idFavoritos = useRef(null);
  const termo = busca.trim();

  // Recentes ao abrir a tela e ao voltar para ela
  const carregarRecentes = useCallback(async () => {
    if (!logado) return;
    setCarregandoRecentes(true);
    setFalhouRecentes(false);
    try {
      const resposta = await api.get('/historico/meus', { params: { limite: RECENTES_MAXIMO } });
      setRecentes(resposta.data);
    } catch (erro) {
      setFalhouRecentes(true);
    } finally {
      setCarregandoRecentes(false);
    }
  }, [logado]);

  useFocusEffect(useCallback(() => { carregarRecentes(); }, [carregarRecentes]));

  useEffect(() => {
    api.get('/categorias').then((r) => setCategorias(r.data.map((c) => c.nome))).catch(() => {});
  }, []);

  // Busca depois que a pessoa para de digitar
  useEffect(() => {
    if (!termo && !categoria) {
      ultimaBusca.current++;
      setResultados(SEM_RESULTADOS);
      setBuscando(false);
      setFalhouBusca(false);
      return undefined;
    }
    const espera = setTimeout(buscar, termo ? 400 : 0);
    return () => clearTimeout(espera);
  }, [termo, categoria]);

  async function buscar() {
    const numero = ++ultimaBusca.current;
    setBuscando(true);
    setFalhouBusca(false);
    try {
      const parametros = {};
      if (termo) parametros.busca = termo;
      if (categoria) parametros.categoria = categoria;
      const [empresas, itens] = await Promise.all([
        api.get('/empresas', { params: parametros }),
        api.get('/busca/itens', { params: parametros }),
      ]);
      if (numero === ultimaBusca.current) {
        setResultados({ empresas: empresas.data, produtos: itens.data.produtos, ofertas: itens.data.ofertas });
      }
    } catch (erro) {
      if (numero === ultimaBusca.current) setFalhouBusca(true);
    } finally {
      if (numero === ultimaBusca.current) setBuscando(false);
    }
  }

  function registrar(corpo) {
    if (!logado) return Promise.resolve();
    return api.post('/historico', corpo).catch(() => {});
  }

  function registrarBusca() {
    if (termo) registrar({ tipo_acao: 'busca', termo });
  }

  // Abre o item: oferta e empresa têm tela própria; produto abre a empresa na aba de produtos
  function abrirItem(tipoItem, id, empresaId) {
    if (tipoItem === 'promocao') {
      navigation.navigate('Oferta', { id });
    } else if (tipoItem === 'empresa') {
      navigation.navigate('Empresa', { id });
    } else {
      registrar({ tipo_acao: 'visualizacao', tipo_item: 'produto', item_id: id });
      navigation.navigate('Empresa', { id: empresaId, aba: 'cardapio', produtoId: id });
    }
  }

  function abrirResultado(tipoItem, id, empresaId) {
    registrarBusca();
    abrirItem(tipoItem, id, empresaId);
  }

  function abrirRecente(item) {
    if (item.tipo_acao === 'busca') {
      setBusca(item.termo);
      return;
    }
    abrirItem(item.tipo_item, item.item_id, item.empresa_id);
  }

  async function removerRecente(item) {
    const anteriores = recentes;
    setRecentes((lista) => lista.filter((r) => r.id_historico !== item.id_historico));
    try {
      await api.delete(`/historico/${item.id_historico}`);
    } catch (erro) {
      setRecentes(anteriores);
      Alert.alert('Não foi possível remover', 'Confira sua conexão e tente de novo.');
    }
  }

  // Lista "Favoritos" (ou a primeira lista da pessoa)
  async function buscarIdFavoritos() {
    if (idFavoritos.current) return idFavoritos.current;
    const resposta = await api.get('/listas/minhas');
    const lista = resposta.data.find((l) => l.nome === 'Favoritos') ?? resposta.data[0];
    idFavoritos.current = lista?.id_lista ?? null;
    return idFavoritos.current;
  }

  function marcarSalvo(item, salvo) {
    setRecentes((lista) => lista.map((r) =>
      r.tipo_item === item.tipo_item && r.item_id === item.item_id ? { ...r, salvo } : r
    ));
  }

  async function alternarSalvo(item) {
    try {
      const listaId = await buscarIdFavoritos();
      if (!listaId) {
        Alert.alert('Sem listas', 'Crie uma lista na aba Salvos.');
        return;
      }
      if (!item.salvo) {
        marcarSalvo(item, true);
        try {
          await api.post('/salvos', { lista_id: listaId, tipo_item: item.tipo_item, item_id: item.item_id });
        } catch (erro) {
          if (erro.response?.status !== 409) throw erro;
        }
        return;
      }
      const itens = await api.get(`/salvos/lista/${listaId}`);
      const salvo = itens.data.find((s) => s.tipo_item === item.tipo_item && s.item_id === item.item_id);
      if (!salvo) {
        Alert.alert('Salvo em outra lista', 'Para remover, use a aba Salvos.');
        return;
      }
      marcarSalvo(item, false);
      await api.delete(`/salvos/${salvo.id_salvo}`);
    } catch (erro) {
      marcarSalvo(item, item.salvo);
      Alert.alert('Não foi possível salvar', 'Confira sua conexão e tente de novo.');
    }
  }

  const recentesVisiveis = verTodos ? recentes : recentes.slice(0, RECENTES_INICIAIS);
  const temFiltro = !!(categoria || tipo);
  const mostrandoResultados = !!(termo || categoria);

  // Seções que aparecem, conforme o filtro "Mostrar"
  const secoes = TIPOS_RESULTADO.filter((t) => !tipo || t.valor === tipo).map((t) => ({ ...t, itens: resultados[t.valor] }));
  const totalResultados = secoes.reduce((soma, secao) => soma + secao.itens.length, 0);

  // Linha de um resultado: foto, nome, textos de apoio e seta
  function linhaResultado({ chave, foto, categoriaItem, nome, apoio, extra, aoTocar }) {
    return (
      <TouchableOpacity key={chave} style={styles.item} onPress={aoTocar} activeOpacity={0.7}>
        <ImagemItem uri={foto} categoria={categoriaItem} largura={56} raio={10} />
        <View style={styles.textosItem}>
          <Text style={styles.nomeItem} numberOfLines={1}>{nome}</Text>
          {apoio ? <Text style={styles.apoioItem} numberOfLines={1}>{apoio}</Text> : null}
          {extra ? <Text style={styles.extraItem} numberOfLines={1}>{extra}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textoSecundario} />
      </TouchableOpacity>
    );
  }

  function itemDaSecao(valor, item) {
    if (valor === 'empresas') {
      return linhaResultado({
        chave: `e${item.id_empresa}`,
        categoriaItem: item.categorias?.split(', ')[0],
        nome: item.nome_fantasia,
        apoio: [item.categorias, item.bairro].filter(Boolean).join(' · '),
        aoTocar: () => abrirResultado('empresa', item.id_empresa),
      });
    }
    if (valor === 'produtos') {
      return linhaResultado({
        chave: `p${item.id}`,
        foto: item.foto,
        categoriaItem: item.categoria,
        nome: item.nome,
        apoio: `${item.tipo_item === 'servico' ? 'Serviço' : 'Produto'} - ${item.empresa_nome}`,
        extra: formatarPreco(item.preco, item.unidade_medida),
        aoTocar: () => abrirResultado('produto', item.id, item.empresa_id),
      });
    }
    const desconto = item.desconto_percentual ? `${Math.round(Number(item.desconto_percentual))}% OFF` : item.condicao;
    return linhaResultado({
      chave: `o${item.id}`,
      foto: item.foto,
      categoriaItem: item.categoria,
      nome: item.produto_nome || item.titulo,
      apoio: `Oferta - ${item.empresa_nome}`,
      extra: [item.preco_promocional ? formatarPreco(item.preco_promocional) : null, desconto].filter(Boolean).join(' · '),
      aoTocar: () => abrirResultado('promocao', item.id),
    });
  }

  function conteudoResultados() {
    if (buscando && totalResultados === 0) return <Carregando />;
    if (falhouBusca) return <ErroComTentarDeNovo onTentarDeNovo={buscar} />;
    if (totalResultados === 0) {
      return <EstadoVazio icone="search-outline" mensagem={termo ? `Nada encontrado para "${termo}".` : 'Nada encontrado com esse filtro.'} />;
    }
    return secoes.filter((secao) => secao.itens.length > 0).map((secao) => (
      <View key={secao.valor} style={styles.secao}>
        <TituloSecao titulo={secao.rotulo} linha="lado" />
        {secao.itens.map((item) => itemDaSecao(secao.valor, item))}
      </View>
    ));
  }

  function conteudoRecentes() {
    if (!logado) {
      return <EstadoVazio icone="time-outline" mensagem="Entre na sua conta para ver o que você buscou e viu." />;
    }
    if (carregandoRecentes && recentes.length === 0) return <Carregando />;
    if (falhouRecentes) return <ErroComTentarDeNovo onTentarDeNovo={carregarRecentes} />;
    if (recentes.length === 0) {
      return <EstadoVazio icone="time-outline" mensagem="O que você buscar e ver aparece aqui." />;
    }
    return (
      <>
        <TituloSecao titulo="Recentes" linha="lado" />
        {recentesVisiveis.map((item) => (
          <TouchableOpacity key={item.id_historico} style={styles.item} onPress={() => abrirRecente(item)} activeOpacity={0.7}>
            {item.tipo_acao === 'busca' ? (
              <View style={styles.iconeBusca}>
                <Ionicons name="time-outline" size={26} color={colors.textoSecundario} />
              </View>
            ) : (
              <ImagemItem uri={item.foto} categoria={item.categoria} largura={56} raio={10} />
            )}
            <View style={styles.textosItem}>
              <Text style={styles.nomeItem} numberOfLines={1}>{item.nome ?? item.termo}</Text>
              {item.tipo_acao === 'visualizacao' && (
                <Text style={styles.apoioItem} numberOfLines={1}>{subtitulo(item)}</Text>
              )}
              <Text style={styles.apoioItem}>
                {item.tipo_acao === 'busca' ? 'Buscado' : 'Visto'} · {tempoDesde(item.criado_em)}
                {item.encerrada ? <Text style={styles.encerrada}>   Encerrada</Text> : null}
              </Text>
            </View>
            {item.tipo_item && (
              <TouchableOpacity onPress={() => alternarSalvo(item)} style={styles.botaoIcone} accessibilityLabel={item.salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos'}>
                <Ionicons name={item.salvo ? 'star' : 'star-outline'} size={24} color={COR_ESTRELA} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={(e) => setMenuRecente({ item, ancora: ancoraDoToque(e) })} style={styles.botaoIcone} accessibilityLabel="Mais opções">
              <Ionicons name="ellipsis-vertical" size={22} color={colors.pretoTexto} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {recentes.length > RECENTES_INICIAIS && (
          <LinhaVerMais texto={verTodos ? 'Ver menos' : 'Ver mais'} onPress={() => setVerTodos((v) => !v)} />
        )}
      </>
    );
  }

  return (
    <View style={[styles.tela, { paddingTop: insets.top + 10 }]}>
      <StatusBar style="dark" />

      <View style={styles.barra}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={26} color={colors.pretoTexto} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="O que você procura?"
          placeholderTextColor={colors.cinzaPlaceholder}
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={registrarBusca}
          returnKeyType="search"
          autoFocus
        />
        {busca ? (
          <TouchableOpacity onPress={() => setBusca('')} accessibilityLabel="Limpar busca">
            <Ionicons name="close" size={22} color={colors.textoSecundario} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="mic-outline" size={22} color={colors.pretoTexto} />
        )}
      </View>

      <View style={styles.faixaFiltro}>
        <TouchableOpacity onPress={() => setFiltroAberto(true)} style={styles.botaoFiltro}>
          <Ionicons name="options-outline" size={22} color={colors.pretoTexto} />
          <Text style={styles.textoFiltro}>filtrar{temFiltro ? ' •' : ''}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {mostrandoResultados ? conteudoResultados() : conteudoRecentes()}
      </ScrollView>

      <Modal visible={filtroAberto} transparent animationType="slide" onRequestClose={() => setFiltroAberto(false)}>
        <Pressable style={styles.fundoModal} onPress={() => setFiltroAberto(false)} />
        <View style={[styles.folhaFiltro, { paddingBottom: insets.bottom + 20 }]}>
          <TituloSecao titulo="Categoria" linha="lado" />
          <View style={styles.chips}>
            {categorias.map((nome) => (
              <Chip key={nome} rotulo={nome} ativo={categoria === nome} onPress={() => setCategoria(categoria === nome ? null : nome)} />
            ))}
          </View>
          <TituloSecao titulo="Mostrar" linha="lado" />
          <View style={styles.chips}>
            {TIPOS_RESULTADO.map((t) => (
              <Chip key={t.valor} rotulo={t.rotulo} ativo={tipo === t.valor} onPress={() => setTipo(tipo === t.valor ? null : t.valor)} />
            ))}
          </View>
          <View style={styles.linhaBotoes}>
            <TouchableOpacity onPress={() => { setCategoria(null); setTipo(null); }} style={styles.limpar}>
              <Text style={styles.textoLimpar}>Limpar</Text>
            </TouchableOpacity>
            <BotaoGradiente titulo="Aplicar" onPress={() => setFiltroAberto(false)} estilo={styles.aplicar} />
          </View>
        </View>
      </Modal>

      <MenuPopup
        visivel={!!menuRecente}
        ancora={menuRecente?.ancora}
        opcoes={menuRecente ? [{ texto: 'Remover do histórico', perigo: true, onPress: () => removerRecente(menuRecente.item) }] : []}
        onFechar={() => setMenuRecente(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  barra: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.brancoFundo, borderRadius: 24, borderWidth: 1, borderColor: colors.bordaClara,
    paddingHorizontal: 14, paddingVertical: 6,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  voltar: { paddingRight: 10 },
  input: { flex: 1, ...tipografia.corpo, color: colors.pretoTexto, paddingVertical: 6 },
  faixaFiltro: { backgroundColor: colors.brancoFundo, paddingHorizontal: 20, paddingVertical: 6, alignItems: 'flex-end' },
  botaoFiltro: { flexDirection: 'row', alignItems: 'center' },
  textoFiltro: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto, marginLeft: 6 },
  conteudo: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconeBusca: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.cinzaInput, alignItems: 'center', justifyContent: 'center' },
  textosItem: { flex: 1, marginLeft: 12, marginRight: 4 },
  nomeItem: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto },
  secao: { marginBottom: 10 },
  extraItem: { ...tipografia.legenda, fontSize: fs(14), color: colors.verdePreco },
  apoioItem: { ...tipografia.legenda, fontSize: fs(14), color: colors.textoSecundario },
  encerrada: { color: colors.vermelhoAviso },
  botaoIcone: { padding: 6 },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folhaFiltro: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    backgroundColor: colors.brancoFundo, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 18, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 8,
  },
  chipAtivo: { backgroundColor: colors.gradienteBase, borderColor: colors.gradienteBase },
  textoChip: { ...tipografia.legenda, fontSize: fs(14), color: colors.pretoTexto },
  linhaBotoes: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  limpar: { paddingVertical: 10, paddingHorizontal: 16 },
  textoLimpar: { ...tipografia.botao, color: colors.textoSecundario },
  aplicar: { flex: 1 },
});
