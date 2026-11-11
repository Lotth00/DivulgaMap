import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

const RAIO = 20;
const BORDA = 2;

// Caixa com borda em degradê verde → amarelo (cartão do perfil, grupo de opções das Configurações)
export default function CaixaGradiente({ children, estilo, estiloConteudo }) {
  return (
    <LinearGradient
      colors={[colors.menuInicio, colors.menuFim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.borda, estilo]}
    >
      <View style={[styles.conteudo, estiloConteudo]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  borda: { borderRadius: RAIO, padding: BORDA },
  conteudo: { borderRadius: RAIO - BORDA, backgroundColor: colors.fundoCaixa, paddingVertical: 8, paddingHorizontal: 18 },
});
