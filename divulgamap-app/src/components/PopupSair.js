import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Confirmação para sair da conta
export default function PopupSair({ visivel, onCancelar, onConfirmar }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <Pressable style={styles.fundo} onPress={onCancelar}>
        <Pressable style={styles.cartao} onPress={() => {}}>
          <View style={styles.icone}>
            <Ionicons name="log-out-outline" size={30} color={colors.pretoTexto} />
          </View>
          <Text style={styles.titulo}>Sair da conta?</Text>
          <Text style={styles.texto}>Você pode entrar de novo quando quiser.</Text>
          <View style={styles.botoes}>
            <TouchableOpacity onPress={onCancelar} style={[styles.botao, styles.cancelar]} activeOpacity={0.7}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirmar} style={[styles.botao, styles.sair]} activeOpacity={0.7}>
              <Text style={styles.textoSair}>Sair</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 },
  cartao: { backgroundColor: colors.fundoTela, borderRadius: 24, padding: 24, alignItems: 'center' },
  icone: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.menuInicio, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto },
  texto: { ...tipografia.corpoMedio, color: colors.textoSecundario, textAlign: 'center', marginTop: 6 },
  botoes: { flexDirection: 'row', marginTop: 22, alignSelf: 'stretch' },
  botao: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelar: { borderWidth: 1.5, borderColor: colors.bordaClara, marginRight: 8 },
  sair: { backgroundColor: colors.pretoTexto, marginLeft: 8 },
  textoCancelar: { ...tipografia.botao, color: colors.pretoTexto },
  textoSair: { ...tipografia.botao, color: colors.brancoFundo },
});
