import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, TextInput, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BotaoGradiente from '../BotaoGradiente';
import BotaoOlho from '../BotaoOlho';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Campo único para editar um dado (nome, telefone, data, senha), com máscara e validação opcionais
export default function ModalEditarTexto({
  visivel, titulo, ajuda, valorInicial = '', placeholder, teclado = 'default', senha = false,
  mascara, validar, maxLength = 100, textoBotao = 'Salvar', enviando, onConfirmar, onFechar,
}) {
  const insets = useSafeAreaInsets();
  const [valor, setValor] = useState(valorInicial);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  useEffect(() => {
    if (visivel) {
      setValor(valorInicial);
      setSenhaVisivel(false);
    }
  }, [visivel, valorInicial]);

  const limpo = valor.trim();
  const valido = limpo.length > 0 && (!validar || validar(limpo));

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <Pressable style={styles.fundo} onPress={onFechar} />
        <View style={[styles.folha, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.titulo}>{titulo}</Text>
          {ajuda ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
          <View>
            <TextInput
              style={[styles.campo, senha && styles.campoComOlho]}
              placeholder={placeholder}
              placeholderTextColor={colors.cinzaPlaceholder}
              value={valor}
              onChangeText={(texto) => setValor(mascara ? mascara(texto) : texto)}
              keyboardType={teclado}
              secureTextEntry={senha && !senhaVisivel}
              autoCapitalize={senha ? 'none' : 'sentences'}
              maxLength={maxLength}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => valido && onConfirmar(limpo)}
            />
            {senha && (
              <View style={styles.olho}>
                <BotaoOlho visivel={senhaVisivel} onAlternar={() => setSenhaVisivel((v) => !v)} />
              </View>
            )}
          </View>
          <BotaoGradiente
            titulo={textoBotao}
            onPress={() => onConfirmar(limpo)}
            desativado={!valido || (!senha && limpo === valorInicial)}
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
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto },
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
  campo: {
    ...tipografia.corpo, color: colors.pretoTexto, backgroundColor: colors.brancoFundo,
    borderWidth: 1, borderColor: colors.bordaClara, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 14, marginBottom: 16,
  },
  campoComOlho: { paddingRight: 46 },
  // Olho por cima do campo, centralizado na altura dele (descontadas as margens)
  olho: { position: 'absolute', right: 12, top: 14, bottom: 16, justifyContent: 'center' },
});
