import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Pressable, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import BotaoGradiente from './BotaoGradiente';
import Carregando from './Carregando';
import ErroComTentarDeNovo from './ErroComTentarDeNovo';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Escolher em quais listas o item fica salvo (tocar marca ou desmarca)
export default function ModalSalvar({ visivel, tipoItem, itemId, nomeItem, onFechar, onMudou }) {
  const insets = useSafeAreaInsets();
  const [listas, setListas] = useState([]);
  const [salvoEm, setSalvoEm] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [ocupada, setOcupada] = useState(null);
  const [novaLista, setNovaLista] = useState('');
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const [respostaListas, respostaItem] = await Promise.all([
        api.get('/listas/minhas'),
        api.get('/salvos/item', { params: { tipo_item: tipoItem, item_id: itemId } }),
      ]);
      setListas(respostaListas.data);
      setSalvoEm(Object.fromEntries(respostaItem.data.map((s) => [s.lista_id, s.id_salvo])));
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [tipoItem, itemId]);

  useEffect(() => {
    if (visivel) carregar();
  }, [visivel, carregar]);

  // Avisa a tela se o item ficou salvo em alguma lista
  function atualizar(novo) {
    setSalvoEm(novo);
    onMudou?.(Object.keys(novo).length > 0);
  }

  async function alternar(lista) {
    setOcupada(lista.id_lista);
    try {
      const idSalvo = salvoEm[lista.id_lista];
      if (idSalvo) {
        await api.delete(`/salvos/${idSalvo}`);
        const { [lista.id_lista]: _, ...resto } = salvoEm;
        atualizar(resto);
      } else {
        const resposta = await api.post('/salvos', { lista_id: lista.id_lista, tipo_item: tipoItem, item_id: itemId });
        atualizar({ ...salvoEm, [lista.id_lista]: resposta.data.id_salvo });
      }
    } catch (erro) {
      if (erro.response?.status === 409) {
        Alert.alert('Já está salvo', `Este item já está em "${lista.nome}".`);
        carregar();
      } else {
        Alert.alert('Não foi possível salvar', erro.response?.data?.erro || 'Confira sua conexão e tente de novo.');
      }
    } finally {
      setOcupada(null);
    }
  }

  // Cria a lista e já salva o item nela
  async function criarLista() {
    const nome = novaLista.trim();
    if (!nome) return;
    setCriando(true);
    try {
      const resposta = await api.post('/listas', { nome });
      const lista = resposta.data;
      setListas((atuais) => [lista, ...atuais]);
      setNovaLista('');
      const salvo = await api.post('/salvos', { lista_id: lista.id_lista, tipo_item: tipoItem, item_id: itemId });
      atualizar({ ...salvoEm, [lista.id_lista]: salvo.data.id_salvo });
    } catch (erro) {
      Alert.alert('Não foi possível criar a lista', erro.response?.data?.erro || 'Confira sua conexão e tente de novo.');
    } finally {
      setCriando(false);
    }
  }

  let conteudo;
  if (carregando && !listas.length) conteudo = <Carregando />;
  else if (falhou) conteudo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
  else {
    conteudo = (
      <ScrollView style={styles.lista} keyboardShouldPersistTaps="handled">
        {listas.map((lista) => {
          const salvo = !!salvoEm[lista.id_lista];
          return (
            <TouchableOpacity
              key={lista.id_lista}
              style={styles.linha}
              onPress={() => alternar(lista)}
              disabled={ocupada !== null}
              activeOpacity={0.6}
              accessibilityState={{ checked: salvo }}
            >
              <Ionicons name={lista.nome === 'Favoritos' ? 'star-outline' : 'bookmark-outline'} size={22} color={colors.pretoTexto} />
              <View style={styles.textosLinha}>
                <Text style={styles.nomeLista} numberOfLines={1}>{lista.nome}</Text>
              </View>
              <Ionicons
                name={salvo ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={salvo ? colors.verdePreco : colors.cinzaPlaceholder}
                style={{ opacity: ocupada === lista.id_lista ? 0.4 : 1 }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <Pressable style={styles.fundo} onPress={onFechar} />
        <View style={[styles.folha, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.titulo}>Salvar em</Text>
          {nomeItem ? <Text style={styles.item} numberOfLines={1}>{nomeItem}</Text> : null}

          {conteudo}

          <View style={styles.novaLista}>
            <TextInput
              style={styles.campo}
              placeholder="Nova lista"
              placeholderTextColor={colors.cinzaPlaceholder}
              value={novaLista}
              onChangeText={setNovaLista}
              maxLength={100}
              onSubmitEditing={criarLista}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={criarLista} disabled={!novaLista.trim() || criando} style={styles.botaoCriar} accessibilityLabel="Criar lista">
              <Ionicons name="add-circle" size={34} color={novaLista.trim() ? colors.pretoTexto : colors.cinzaPlaceholder} />
            </TouchableOpacity>
          </View>

          <BotaoGradiente titulo="Pronto" onPress={onFechar} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, maxHeight: '80%' },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto },
  item: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginBottom: 8 },
  lista: { flexGrow: 0 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  textosLinha: { flex: 1, marginHorizontal: 12 },
  nomeLista: { ...tipografia.corpo, color: colors.pretoTexto },
  novaLista: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  campo: {
    flex: 1, ...tipografia.corpoMedio, color: colors.pretoTexto, backgroundColor: colors.brancoFundo,
    borderWidth: 1, borderColor: colors.bordaClara, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  botaoCriar: { marginLeft: 8 },
});
