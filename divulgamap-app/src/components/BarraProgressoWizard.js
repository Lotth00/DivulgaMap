import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Etapas do cadastro de empresa (M21 a M23)
export const TOTAL_ETAPAS = 12;

// Barra fina com o quanto do cadastro já foi feito
export default function BarraProgressoWizard({ passo, total = TOTAL_ETAPAS }) {
  const porcentagem = Math.min(100, Math.max(0, (passo / total) * 100));
  return (
    <View style={styles.container} accessibilityLabel={`Etapa ${passo} de ${total}`}>
      <View style={styles.trilho}>
        <LinearGradient
          colors={[colors.gradienteTopo, colors.gradienteBase]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.preenchido, { width: `${porcentagem}%` }]}
        />
      </View>
      <Text style={styles.texto}>Etapa {passo} de {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  trilho: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.cinzaInput, overflow: 'hidden' },
  preenchido: { height: 6, borderRadius: 3 },
  texto: { ...tipografia.pequeno, color: colors.textoSecundario, marginLeft: 10 },
});
