import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import Estrelas from './Estrelas';
import BotaoGradiente from './BotaoGradiente';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const TAMANHO_MAXIMO = 1000;
const TEXTO_NOTA = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

// Criar, editar ou excluir a avaliação da pessoa logada para uma empresa
export default function ModalAvaliar({ visivel, empresa, avaliacaoAtual, onFechar, onMudou }) {
  const insets = useSafeAreaInsets();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Ao abrir, começa com a avaliação que já existe (ou em branco)
  useEffect(() => {
    if (!visivel) return;
    setNota(avaliacaoAtual?.nota ?? 0);
    setComentario(avaliacaoAtual?.comentario ?? '');
  }, [visivel, avaliacaoAtual]);

  function mensagemDeErro(erro) {
    return erro.response?.data?.erro || 'Confira sua conexão e tente de novo.';
  }

  async function salvar() {
    setEnviando(true);
    try {
      const corpo = { nota, comentario: comentario.trim() || null };
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
      <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          <BotaoGradiente titulo="Publicar" onPress={salvar} desativado={!nota} carregando={enviando} />

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
  excluir: { alignItems: 'center', paddingVertical: 14 },
  textoExcluir: { ...tipografia.corpoMedio, color: colors.vermelhoAviso },
});
