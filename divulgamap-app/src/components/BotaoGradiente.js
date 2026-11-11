import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Botão com degradê verde → amarelo
export default function BotaoGradiente({ titulo, onPress, desativado = false, carregando = false, estilo }) {
  const inativo = desativado || carregando;
  return (
    <TouchableOpacity onPress={onPress} disabled={inativo} activeOpacity={0.8} style={[styles.toque, estilo]}>
      <LinearGradient
        colors={[colors.gradienteTopo, colors.gradienteBase]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fundo, inativo && styles.inativo]}
      >
        {carregando ? <ActivityIndicator color={colors.pretoTexto} /> : <Text style={styles.texto}>{titulo}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toque: { borderRadius: 20 },
  fundo: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  inativo: { opacity: 0.5 },
  texto: { ...tipografia.botao, color: colors.pretoTexto },
});
