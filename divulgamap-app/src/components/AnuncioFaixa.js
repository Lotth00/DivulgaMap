import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { fontes, fs } from '../theme/tipografia';

// Anúncios menores de exemplo (substituídos pelos reais na M28)
export const ANUNCIOS_EXEMPLO = [
  { id: 'a1', titulo: 'Anuncie aqui', texto: 'Seu negócio entre as seções do app', icone: 'megaphone-outline' },
  { id: 'a2', titulo: 'Impulsione sua oferta', texto: 'Mais gente vendo o que você vende', icone: 'trending-up-outline' },
  { id: 'a3', titulo: 'Comércio de Taquara', texto: 'Compre perto, ajude a cidade', icone: 'storefront-outline' },
];

// Faixa de anúncio entre as seções do Explorar
export default function AnuncioFaixa({ anuncio }) {
  return (
    <LinearGradient
      colors={[colors.padraoInicio, colors.padraoFim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.faixa}
    >
      <Ionicons name={anuncio.icone} size={28} color={colors.iconePadrao} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>{anuncio.titulo}</Text>
        <Text style={styles.texto} numberOfLines={1}>{anuncio.texto}</Text>
      </View>
      <Text style={styles.rotulo}>Anúncio</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  faixa: { height: 52, borderRadius: 6, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 16 },
  textos: { flex: 1, marginLeft: 14 },
  titulo: { fontFamily: fontes.seminegrito, includeFontPadding: false, fontSize: fs(15), color: colors.pretoTexto },
  texto: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(12), color: colors.textoSecundario },
  rotulo: { position: 'absolute', top: 4, right: 8, fontFamily: fontes.regular, fontSize: fs(9), color: colors.textoSecundario },
});
