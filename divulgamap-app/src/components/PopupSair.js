import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Confirmação para sair da conta
export default function PopupSair({ visivel, onCancelar, onConfirmar }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <Pressable style={styles.fundo} onPress={onCancelar}>
        <Pressable style={styles.cartao} onPress={() => {}}>
          <Text style={styles.pergunta}>Tem certeza que quer sair de sua conta?</Text>
          <View style={styles.divisoria} />
          <TouchableOpacity onPress={onConfirmar} style={styles.opcao} activeOpacity={0.6}>
            <Text style={styles.textoSair}>Sair</Text>
          </TouchableOpacity>
          <View style={styles.divisoria} />
          <TouchableOpacity onPress={onCancelar} style={styles.opcao} activeOpacity={0.6}>
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 60 },
  cartao: {
    backgroundColor: colors.brancoFundo, borderRadius: 8, paddingTop: 12,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  pergunta: { ...tipografia.corpoMedio, color: colors.pretoTexto, textAlign: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  divisoria: { height: 1, backgroundColor: colors.bordaClara, marginHorizontal: 12 },
  opcao: { paddingVertical: 10, alignItems: 'center' },
  textoSair: { ...tipografia.corpoMedio, color: colors.vermelhoAviso },
  textoCancelar: { ...tipografia.corpoMedio, color: colors.pretoTexto },
});
