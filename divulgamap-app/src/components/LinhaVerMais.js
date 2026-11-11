import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Linha com texto à direita ("——— Ver mais", "——— Ver mais fotos")
export default function LinhaVerMais({ texto = 'Ver mais', onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.traco} />
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <Text style={styles.texto}>{texto}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  traco: { flex: 1, height: 1.5, backgroundColor: colors.bordaClara, marginRight: 10 },
  texto: { ...tipografia.corpo, color: colors.pretoTexto },
});
