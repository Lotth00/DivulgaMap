import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Mensagem de erro com botão para tentar de novo
export default function ErroComTentarDeNovo({ mensagem = 'Não foi possível carregar. Confira sua conexão.', onTentarDeNovo }) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.vermelhoAviso} />
      <Text style={styles.mensagem}>{mensagem}</Text>
      {onTentarDeNovo && (
        <TouchableOpacity onPress={onTentarDeNovo} style={styles.botao}>
          <Text style={styles.textoBotao}>Tentar de novo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  mensagem: { ...tipografia.corpo, color: colors.textoSecundario, textAlign: 'center', marginTop: 10 },
  botao: { marginTop: 14, backgroundColor: colors.pretoTexto, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  textoBotao: { ...tipografia.botao, color: colors.brancoFundo },
});
