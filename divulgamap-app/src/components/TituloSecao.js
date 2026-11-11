import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Título com linha: embaixo ("Configurações", "Ofertas próximas de você →") ou ao lado ("Fotos ———")
export default function TituloSecao({ titulo, onVerMais, linha = 'embaixo' }) {
  if (linha === 'lado') {
    return (
      <View style={styles.linhaLado}>
        <Text style={styles.tituloLado}>{titulo}</Text>
        <View style={styles.traco} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
      {onVerMais && (
        <TouchableOpacity onPress={onVerMais} style={styles.seta} accessibilityLabel={`Ver mais: ${titulo}`}>
          <Ionicons name="arrow-forward" size={24} color={colors.pretoTexto} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara, paddingBottom: 4, marginBottom: 14 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto, flex: 1 },
  seta: { paddingLeft: 8 },
  linhaLado: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tituloLado: { ...tipografia.tituloSecao, color: colors.pretoTexto, marginRight: 10 },
  traco: { flex: 1, height: 1.5, backgroundColor: colors.bordaClara },
});
