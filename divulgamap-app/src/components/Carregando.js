import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Indicador de carregamento, com texto opcional
export default function Carregando({ mensagem }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.pretoTexto} />
      {mensagem && <Text style={styles.mensagem}>{mensagem}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  mensagem: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 10 },
});
