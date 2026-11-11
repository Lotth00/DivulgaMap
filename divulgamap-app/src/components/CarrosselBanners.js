import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { fontes } from '../theme/tipografia';

// Banners de exemplo (substituídos pelos anúncios reais na M28)
export const BANNERS_EXEMPLO = [
  { id: 'b1', titulo: 'Anuncie aqui', texto: 'Sua empresa em destaque para toda Taquara', icone: 'megaphone', cores: ['#FFB800', '#FFE066'] },
  { id: 'b2', titulo: 'Ofertas da semana', texto: 'Descontos perto de você', icone: 'pricetags', cores: ['#C7FF78', '#F8FF44'] },
  { id: 'b3', titulo: 'Comércio local', texto: 'Descubra lojas e serviços da cidade', icone: 'storefront', cores: ['#7FD4FF', '#C9F0FF'] },
  { id: 'b4', titulo: 'Moda', texto: 'Novidades nas lojas do centro', icone: 'shirt', cores: ['#FF9EC4', '#FFD6E7'] },
  { id: 'b5', titulo: 'Serviços', texto: 'Profissionais perto de você', icone: 'construct', cores: ['#B9A6FF', '#E3DBFF'] },
];

// Carrossel de banners com bolinhas
export default function CarrosselBanners({ banners = BANNERS_EXEMPLO, margemLateral = 20 }) {
  const { width } = useWindowDimensions();
  const largura = width - margemLateral * 2;
  const [atual, setAtual] = useState(0);

  function aoParar(evento) {
    setAtual(Math.round(evento.nativeEvent.contentOffset.x / largura));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoParar}
        style={{ width: largura }}
      >
        {banners.map((banner) => (
          <LinearGradient
            key={banner.id}
            colors={banner.cores}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, { width: largura }]}
          >
            <View style={styles.textos}>
              <Text style={styles.titulo} numberOfLines={1}>{banner.titulo}</Text>
              <Text style={styles.texto} numberOfLines={2}>{banner.texto}</Text>
            </View>
            <Ionicons name={banner.icone} size={64} color="rgba(0,0,0,0.75)" />
          </LinearGradient>
        ))}
      </ScrollView>

      <View style={styles.bolinhas}>
        {banners.map((banner, indice) => (
          <View key={banner.id} style={[styles.bolinha, indice === atual && styles.bolinhaAtual]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  banner: {
    height: 150, borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, overflow: 'hidden',
  },
  textos: { flex: 1, marginRight: 12 },
  titulo: { fontFamily: fontes.destaque, fontSize: 30, color: colors.pretoTexto },
  texto: { fontFamily: fontes.media, fontSize: 14, color: colors.pretoTexto },
  bolinhas: { flexDirection: 'row', marginTop: 8 },
  bolinha: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.bordaClara, marginHorizontal: 4 },
  bolinhaAtual: { backgroundColor: colors.textoSecundario },
});
