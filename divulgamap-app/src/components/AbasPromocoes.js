import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Abas em pílula (Especiais / Relâmpago)
export default function AbasPromocoes({ abas, selecionada, onSelecionar }) {
  return (
    <View style={styles.container}>
      {abas.map((aba) => {
        const ativa = aba.valor === selecionada;
        return (
          <TouchableOpacity
            key={aba.valor}
            onPress={() => onSelecionar(aba.valor)}
            activeOpacity={0.8}
            style={[styles.aba, ativa && styles.abaAtiva]}
            accessibilityState={{ selected: ativa }}
          >
            <Text style={[styles.texto, ativa && styles.textoAtivo]}>{aba.rotulo}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 14 },
  aba: {
    paddingVertical: 4, paddingHorizontal: 22, borderRadius: 10, marginRight: 12,
    backgroundColor: colors.brancoFundo,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  abaAtiva: { backgroundColor: colors.pretoTexto },
  texto: { ...tipografia.corpo, fontSize: 18, color: colors.textoSecundario },
  textoAtivo: { color: colors.brancoFundo },
});
