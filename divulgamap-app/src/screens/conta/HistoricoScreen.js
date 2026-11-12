import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import ImagemItem from '../../components/ImagemItem';
import LinhaVerMais from '../../components/LinhaVerMais';
import EstadoVazio from '../../components/EstadoVazio';
import MenuPopup, { ancoraDoToque } from '../../components/MenuPopup';
import ModalSalvar from '../../components/ModalSalvar';
import { tempoDesde } from '../../components/perfilEmpresa/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const LIMITE = 50;
const ITENS_INICIAIS = 10;
const COR_ESTRELA = '#B8D400';

// "Oferta - Padaria", "Produto - Loja" ou a categoria da empresa
function subtitulo(item) {
  if (item.tipo_acao === 'busca') return 'Pesquisa';
  if (item.tipo_item === 'promocao') return `Oferta - ${item.empresa_nome ?? ''}`;
  if (item.tipo_item === 'produto') return `Produto - ${item.empresa_nome ?? ''}`;
  return item.categoria ?? '';
}

// Histórico (Figma 593:1273): o que a pessoa buscou e viu, com filtro, salvar, remover e limpar
export default function HistoricoScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [verTodos, setVerTodos] = useState(false);
  const [menu, setMenu] = useState(null);
  const [salvando, setSalvando] = useState(null);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get('/historico/meus', { params: { limite: LIMITE } });
      setItens(resposta.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function abrir(item) {
    if (item.tipo_acao === 'busca') navigation.navigate('Pesquisa', { termo: item.termo });
    else if (item.tipo_item === 'empresa') navigation.navigate('Empresa', { id: item.item_id });
    else if (item.tipo_item === 'promocao') navigation.navigate('Oferta', { id: item.item_id });
    else if (item.tipo_item === 'produto') navigation.navigate('Empresa', { id: item.empresa_id, aba: 'cardapio', produtoId: item.item_id });
  }

  async function remover(item) {
    const anteriores = itens;
    setItens((atual) => atual.filter((i) => i.id_historico !== item.id_historico));
    try {
      await api.delete(`/historico/${item.id_historico}`);
    } catch (erro) {
      setItens(anteriores);
      Alert.alert('Não foi possível remover', 'Confira sua conexão e tente de novo.');
    }
  }

  function limparTudo() {
    Alert.alert('Limpar histórico', 'Todas as buscas e os itens vistos vão sumir. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/historico');
            setItens([]);
          } catch (erro) {
            Alert.alert('Não foi possível limpar', 'Confira sua conexão e tente de novo.');
          }
        },
      },
    ]);
  }

  const termo = filtro.trim().toLowerCase();
  const filtrados = termo
    ? itens.filter((i) => `${i.nome ?? ''} ${i.termo ?? ''} ${subtitulo(i)}`.toLowerCase().includes(termo))
    : itens;
  const visiveis = verTodos || termo ? filtrados : filtrados.slice(0, ITENS_INICIAIS);

  return (
    <TelaConta
      navigation={navigation}
      titulo="Histórico"
      descricao="As suas últimas buscas e o que você viu no app. Ele também ajuda a mostrar primeiro o que combina com você."
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
    >
      <View style={styles.busca}>
        <TextInput
          value={filtro}
          onChangeText={setFiltro}
          placeholder="O que você procura?"
          placeholderTextColor={colors.textoSecundario}
          style={styles.campoBusca}
          returnKeyType="search"
        />
        {filtro ? (
          <TouchableOpacity onPress={() => setFiltro('')} accessibilityLabel="Limpar filtro">
            <Ionicons name="close" size={20} color={colors.textoSecundario} />
          </TouchableOpacity>
        ) : <Ionicons name="search" size={20} color={colors.textoSecundario} />}
      </View>

      {visiveis.length === 0 ? (
        <EstadoVazio
          icone="time-outline"
          mensagem={termo ? 'Nada no histórico com esse nome.' : 'O seu histórico está vazio. O que você buscar e ver aparece aqui.'}
        />
      ) : (
        visiveis.map((item) => (
          <TouchableOpacity key={item.id_historico} onPress={() => abrir(item)} style={styles.item} activeOpacity={0.7}>
            {item.tipo_acao === 'busca' ? (
              <View style={styles.iconeBusca}><Ionicons name="search" size={26} color={colors.textoSecundario} /></View>
            ) : (
              <ImagemItem uri={item.foto} categoria={item.categoria} largura={56} raio={10} />
            )}
            <View style={styles.textos}>
              <Text style={styles.nome} numberOfLines={1}>{item.nome ?? item.termo}</Text>
              <Text style={styles.apoio} numberOfLines={1}>{subtitulo(item)}</Text>
              <Text style={styles.apoio}>
                {item.tipo_acao === 'busca' ? 'Buscado' : 'Visto'} · {tempoDesde(item.criado_em)}
                {item.encerrada ? <Text style={styles.encerrada}>   Encerrada</Text> : null}
              </Text>
            </View>
            {item.tipo_item && (
              <TouchableOpacity onPress={() => setSalvando(item)} style={styles.botao} accessibilityLabel="Salvar">
                <Ionicons name={item.salvo ? 'star' : 'star-outline'} size={24} color={COR_ESTRELA} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={(e) => setMenu({ item, ancora: ancoraDoToque(e) })} style={styles.botao} accessibilityLabel="Mais opções">
              <Ionicons name="ellipsis-vertical" size={20} color={colors.pretoTexto} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      {!termo && filtrados.length > ITENS_INICIAIS && (
        <LinhaVerMais texto={verTodos ? 'Ver menos' : 'Ver mais'} onPress={() => setVerTodos(!verTodos)} />
      )}
      {itens.length > 0 && (
        <TouchableOpacity onPress={limparTudo} style={styles.limpar}>
          <Ionicons name="trash-outline" size={18} color={colors.vermelhoAviso} />
          <Text style={styles.textoLimpar}>Limpar todo o histórico</Text>
        </TouchableOpacity>
      )}

      <MenuPopup
        visivel={!!menu}
        ancora={menu?.ancora}
        opcoes={menu ? [
          ...(menu.item.tipo_acao === 'busca' ? [] : [{ texto: 'Abrir', onPress: () => abrir(menu.item) }]),
          { texto: 'Remover do histórico', perigo: true, onPress: () => remover(menu.item) },
        ] : []}
        onFechar={() => setMenu(null)}
      />
      <ModalSalvar
        visivel={!!salvando}
        tipoItem={salvando?.tipo_item}
        itemId={salvando?.item_id}
        nomeItem={salvando?.nome}
        onFechar={() => setSalvando(null)}
        onMudou={carregar}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  busca: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.fundoCaixa, borderRadius: 24,
    paddingHorizontal: 18, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  campoBusca: { ...tipografia.corpo, color: colors.pretoTexto, flex: 1, paddingVertical: 10 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  iconeBusca: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.cinzaInput, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, marginLeft: 12 },
  nome: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto },
  apoio: { ...tipografia.legenda, color: colors.textoSecundario },
  encerrada: { color: colors.vermelhoAviso },
  botao: { paddingHorizontal: 6, paddingVertical: 6 },
  limpar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 14, padding: 8 },
  textoLimpar: { ...tipografia.corpoMedio, color: colors.vermelhoAviso, marginLeft: 6 },
});
