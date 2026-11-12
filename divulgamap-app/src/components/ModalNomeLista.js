import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotaoGradiente from './BotaoGradiente';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const TAMANHO_MAXIMO = 100;

// Nome de uma lista, para criar ou renomear
export default function ModalNomeLista({ visivel, titulo, nomeInicial = '', textoBotao, enviando, onConfirmar, onFechar }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState(nomeInicial);

  useEffect(() => {
    if (visivel) setNome(nomeInicial);
  }, [visivel, nomeInicial]);

  const limpo = nome.trim();

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <Pressable style={styles.fundo} onPress={onFechar} />
        <View style={[styles.folha, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.titulo}>{titulo}</Text>
          <TextInput
            style={styles.campo}
            placeholder="Nome da lista"
            placeholderTextColor={colors.cinzaPlaceholder}
            value={nome}
            onChangeText={setNome}
            maxLength={TAMANHO_MAXIMO}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => limpo && onConfirmar(limpo)}
          />
          <BotaoGradiente
            titulo={textoBotao}
            onPress={() => onConfirmar(limpo)}
            desativado={!limpo || limpo === nomeInicial}
            carregando={enviando}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto, marginBottom: 14 },
  campo: {
    ...tipografia.corpo, color: colors.pretoTexto, backgroundColor: colors.brancoFundo,
    borderWidth: 1, borderColor: colors.bordaClara, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
});
