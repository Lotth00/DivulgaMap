import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import Estrelas from './Estrelas';
import BotaoGradiente from './BotaoGradiente';
import { escolherEEnviarFoto } from '../screens/empresa/util';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const TAMANHO_MAXIMO = 1000;
const MAXIMO_FOTOS = 5;
const TEXTO_NOTA = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

// Criar, editar ou excluir a avaliação da pessoa logada para uma empresa
export default function ModalAvaliar({ visivel, empresa, avaliacaoAtual, onFechar, onMudou }) {
  const insets = useSafeAreaInsets();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Ao abrir, começa com a avaliação que já existe (ou em branco)
  useEffect(() => {
    if (!visivel) return;
    setNota(avaliacaoAtual?.nota ?? 0);
    setComentario(avaliacaoAtual?.comentario ?? '');
    setFotos(avaliacaoAtual?.fotos ?? []);
  }, [visivel, avaliacaoAtual]);

  async function adicionarFoto() {
    setEnviandoFoto(true);
    try {
      const url = await escolherEEnviarFoto('divulgamap/avaliacoes');
      if (url) setFotos((atual) => [...atual, url]);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a foto', erro.message);
    } finally {
      setEnviandoFoto(false);
    }
  }

  function removerFoto(url) {
    setFotos((atual) => atual.filter((f) => f !== url));
  }

  function mensagemDeErro(erro) {
    return erro.response?.data?.erro || 'Confira sua conexão e tente de novo.';
  }

  async function salvar() {
    setEnviando(true);
    try {
      const corpo = { nota, comentario: comentario.trim() || null, fotos };
      if (avaliacaoAtual) {
        await api.put(`/avaliacoes/${avaliacaoAtual.id_avaliacao}`, corpo);
      } else {
        await api.post('/avaliacoes', { ...corpo, empresa_id: empresa.id_empresa });
      }
      onFechar();
      onMudou();
    } catch (erro) {
      Alert.alert('Não foi possível salvar', mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  function excluir() {
    Alert.alert('Excluir avaliação', 'Sua avaliação vai sumir desta empresa.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setEnviando(true);
          try {
            await api.delete(`/avaliacoes/${avaliacaoAtual.id_avaliacao}`);
            onFechar();
            onMudou();
          } catch (erro) {
            Alert.alert('Não foi possível excluir', mensagemDeErro(erro));
          } finally {
            setEnviando(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <Pressable style={styles.fundo} onPress={onFechar} />
        <View style={[styles.folha, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.titulo}>{avaliacaoAtual ? 'Editar sua avaliação' : 'Avaliar'}</Text>
          <Text style={styles.empresa} numberOfLines={1}>{empresa?.nome_fantasia}</Text>

          <View style={styles.estrelas}>
            <Estrelas nota={nota} tamanho={38} onMudar={setNota} />
            <Text style={styles.textoNota}>{nota ? TEXTO_NOTA[nota] : 'Toque nas estrelas'}</Text>
          </View>

          <TextInput
            style={styles.campo}
            placeholder="Conte como foi sua experiência (opcional)"
            placeholderTextColor={colors.cinzaPlaceholder}
            value={comentario}
            onChangeText={setComentario}
            maxLength={TAMANHO_MAXIMO}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.contador}>{comentario.length}/{TAMANHO_MAXIMO}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotos} keyboardShouldPersistTaps="handled">
            {fotos.map((url) => (
              <View key={url} style={styles.foto}>
                <Image source={{ uri: url }} style={styles.imagemFoto} />
                <TouchableOpacity onPress={() => removerFoto(url)} style={styles.removerFoto} accessibilityLabel="Remover foto">
                  <Ionicons name="close" size={14} color={colors.brancoFundo} />
                </TouchableOpacity>
              </View>
            ))}
            {fotos.length < MAXIMO_FOTOS && (
              <TouchableOpacity onPress={adicionarFoto} disabled={enviandoFoto} style={[styles.foto, styles.adicionarFoto]} accessibilityLabel="Adicionar foto">
                {enviandoFoto
                  ? <ActivityIndicator color={colors.pretoTexto} />
                  : (
                    <>
                      <Ionicons name="camera-outline" size={22} color={colors.textoSecundario} />
                      <Text style={styles.textoAdicionar}>{fotos.length ? `${fotos.length}/${MAXIMO_FOTOS}` : 'Foto'}</Text>
                    </>
                  )}
              </TouchableOpacity>
            )}
          </ScrollView>

          <BotaoGradiente titulo="Publicar" onPress={salvar} desativado={!nota || enviandoFoto} carregando={enviando} />

          {avaliacaoAtual && (
            <TouchableOpacity onPress={excluir} disabled={enviando} style={styles.excluir}>
              <Text style={styles.textoExcluir}>Excluir minha avaliação</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto },
  empresa: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  estrelas: { alignItems: 'center', marginVertical: 16 },
  textoNota: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
  campo: {
    ...tipografia.corpoMedio, color: colors.pretoTexto, backgroundColor: colors.brancoFundo,
    borderWidth: 1, borderColor: colors.bordaClara, borderRadius: 12, padding: 12, minHeight: 110,
  },
  contador: { ...tipografia.pequeno, color: colors.textoSecundario, alignSelf: 'flex-end', marginTop: 4, marginBottom: 12 },
  fotos: { marginBottom: 14, flexGrow: 0 },
  foto: { width: 72, height: 72, borderRadius: 10, marginRight: 8, overflow: 'hidden' },
  imagemFoto: { width: '100%', height: '100%' },
  removerFoto: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  adicionarFoto: {
    borderWidth: 1.5, borderColor: colors.bordaClara, borderStyle: 'dashed', backgroundColor: colors.brancoFundo,
    alignItems: 'center', justifyContent: 'center',
  },
  textoAdicionar: { ...tipografia.pequeno, color: colors.textoSecundario, marginTop: 2 },
  excluir: { alignItems: 'center', paddingVertical: 14 },
  textoExcluir: { ...tipografia.corpoMedio, color: colors.vermelhoAviso },
});
