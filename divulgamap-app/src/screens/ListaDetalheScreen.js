import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import Cabecalho from '../components/Cabecalho';
import ImagemItem from '../components/ImagemItem';
import Carregando from '../components/Carregando';
import EstadoVazio from '../components/EstadoVazio';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import MenuOpcoes from '../components/MenuOpcoes';
import ModalNomeLista from '../components/ModalNomeLista';
import { NOME_FAVORITOS, textoTotal, renomearLista, confirmarExclusaoLista } from '../components/listasSalvas';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Linha de apoio de cada tipo de item
function subtitulo(item) {
  if (item.tipo_item === 'promocao') return `Oferta - ${item.empresa_nome ?? ''}`;
  if (item.tipo_item === 'produto') return `Produto - ${item.empresa_nome ?? ''}`;
  return item.categoria ?? 'Empresa';
}

// Itens salvos numa lista: abrir, remover, renomear ou excluir a lista
export default function ListaDetalheScreen({ route, navigation }) {
  const [lista, setLista] = useState(route.params?.lista ?? null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [menuDoItem, setMenuDoItem] = useState(null);
  const [menuDaLista, setMenuDaLista] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const idLista = lista?.id_lista;

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get(`/salvos/lista/${idLista}`);
      setItens(resposta.data);
    } catch (erro) {
      if (erro.response?.status === 404) {
        navigation.goBack();
        return;
      }
      setFalhou(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [idLista, navigation]);

  // Atualiza ao voltar de uma empresa ou oferta
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function abrir(item) {
    if (item.tipo_item === 'promocao') navigation.navigate('Oferta', { id: item.item_id });
    else if (item.tipo_item === 'produto') navigation.navigate('Empresa', { id: item.empresa_id, aba: 'cardapio', produtoId: item.item_id });
    else navigation.navigate('Empresa', { id: item.item_id });
  }

  async function remover(item) {
    const anteriores = itens;
    setItens((atuais) => atuais.filter((i) => i.id_salvo !== item.id_salvo));
    try {
      await api.delete(`/salvos/${item.id_salvo}`);
    } catch (erro) {
      setItens(anteriores);
      Alert.alert('Não foi possível remover', 'Confira sua conexão e tente de novo.');
    }
  }

  async function renomear(nome) {
    setEnviando(true);
    const atualizada = await renomearLista(lista, nome);
    setEnviando(false);
    if (atualizada) {
      setLista((atual) => ({ ...atual, nome: atualizada.nome }));
      setRenomeando(false);
    }
  }

  const fixa = lista?.nome === NOME_FAVORITOS;

  function renderItem({ item }) {
    return (
      <TouchableOpacity style={styles.item} onPress={() => abrir(item)} activeOpacity={0.7}>
        <ImagemItem uri={item.foto} categoria={item.categoria} largura={64} raio={10} />
        <View style={styles.textos}>
          <Text style={styles.nome} numberOfLines={1}>{item.nome}</Text>
          <Text style={styles.apoio} numberOfLines={1}>{subtitulo(item)}</Text>
          {item.encerrada ? <Text style={styles.encerrada}>Encerrada</Text> : null}
        </View>
        <TouchableOpacity onPress={() => setMenuDoItem(item)} style={styles.botaoMenu} accessibilityLabel={`Opções de ${item.nome}`}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.iconeMenu} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  let corpo;
  if (carregando) corpo = <Carregando />;
  else if (falhou && !itens.length) corpo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
  else {
    corpo = (
      <FlatList
        data={itens}
        keyExtractor={(item) => String(item.id_salvo)}
        renderItem={renderItem}
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => { setAtualizando(true); carregar(); }} />}
        ListHeaderComponent={
          <View style={styles.topo}>
            <Text style={styles.titulo} numberOfLines={2}>{lista?.nome}</Text>
            <Text style={styles.total}>{textoTotal(itens.length)}</Text>
          </View>
        }
        ListEmptyComponent={
          <EstadoVazio
            icone={fixa ? 'heart-outline' : 'bookmark-outline'}
            mensagem="Salve empresas e ofertas pelo marcador no perfil ou na oferta, e elas aparecem aqui."
          />
        }
      />
    );
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} onMenu={() => setMenuDaLista(true)} />
      {corpo}

      <MenuOpcoes
        visivel={!!menuDoItem}
        titulo={menuDoItem?.nome}
        opcoes={menuDoItem ? [{ icone: 'trash-outline', texto: 'Remover da lista', perigo: true, onPress: () => remover(menuDoItem) }] : []}
        onFechar={() => setMenuDoItem(null)}
      />
      <MenuOpcoes
        visivel={menuDaLista}
        titulo={lista?.nome}
        aviso={fixa ? 'A lista Favoritos é fixa: não pode ser renomeada nem excluída.' : null}
        opcoes={fixa ? [] : [
          { icone: 'create-outline', texto: 'Renomear', onPress: () => setRenomeando(true) },
          { icone: 'trash-outline', texto: 'Excluir lista', perigo: true, onPress: () => confirmarExclusaoLista(lista, () => navigation.goBack()) },
        ]}
        onFechar={() => setMenuDaLista(false)}
      />
      <ModalNomeLista
        visivel={renomeando}
        titulo="Renomear lista"
        nomeInicial={lista?.nome ?? ''}
        textoBotao="Salvar"
        enviando={enviando}
        onConfirmar={renomear}
        onFechar={() => setRenomeando(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  topo: { marginBottom: 16 },
  titulo: { ...tipografia.tituloTela, fontSize: 24, color: colors.pretoTexto },
  total: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara },
  textos: { flex: 1, marginLeft: 12 },
  nome: { ...tipografia.corpo, fontSize: 18, color: colors.pretoTexto },
  apoio: { ...tipografia.legenda, fontSize: 14, color: colors.textoSecundario },
  encerrada: { ...tipografia.legenda, color: colors.vermelhoAviso },
  botaoMenu: { padding: 8, marginRight: -8 },
});
