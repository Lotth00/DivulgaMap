import React, { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

// Ícone padrão de cada categoria, quando não há foto
const ICONE_POR_CATEGORIA = {
  'Alimentação': 'fast-food',
  'Moda': 'shirt',
  'Bem-Estar': 'leaf',
  'Serviços Gerais': 'construct',
  'Tecnologia': 'hardware-chip',
  'Construção': 'hammer',
};

// Foto do item ou, sem foto (ou se ela falhar), o ícone da categoria
export default function ImagemItem({ uri, categoria, largura = 64, altura, raio = 8, ajuste = 'cover', estilo }) {
  const [falhou, setFalhou] = useState(false);
  const tamanho = { width: largura, height: altura ?? largura, borderRadius: raio };

  if (uri && !falhou) {
    return <Image source={{ uri }} style={[tamanho, estilo]} resizeMode={ajuste} onError={() => setFalhou(true)} />;
  }

  const icone = ICONE_POR_CATEGORIA[categoria] || 'storefront';
  return (
    <LinearGradient
      colors={[colors.padraoInicio, colors.padraoFim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[tamanho, styles.padrao, estilo]}
    >
      <Ionicons name={icone} size={Math.round(Math.min(largura, altura ?? largura) * 0.45)} color={colors.iconePadrao} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  padrao: { alignItems: 'center', justifyContent: 'center' },
});
