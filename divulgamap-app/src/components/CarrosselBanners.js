import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import colors from '../theme/colors';
import { useVisivelNaTela, SeloAnuncio } from './AnuncioFaixa';

const TEMPO_POR_BANNER = 5000;

// Carrossel dos anúncios em banner: troca sozinho, dá para deslizar, e as bolinhas mostram em qual está
export default function CarrosselBanners({ banners = [], margemLateral = 20, ativo = true, onImpressao, onTocar }) {
  const { width } = useWindowDimensions();
  const largura = width - margemLateral * 2;
  const [atual, setAtual] = useState(0);
  const rolagem = useRef(null);
  const [ref, visivel] = useVisivelNaTela(ativo && banners.length > 0);

  // Lista nova volta para o primeiro
  useEffect(() => {
    setAtual(0);
    rolagem.current?.scrollTo({ x: 0, animated: false });
  }, [banners]);

  // Impressão do banner que está na tela
  const idAtual = banners[atual]?.id_anuncio;
  useEffect(() => {
    if (visivel && idAtual) onImpressao?.(idAtual);
  }, [visivel, idAtual, onImpressao]);

  // Próximo banner a cada intervalo; recomeça a contar quando a pessoa desliza
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const relogio = setTimeout(() => {
      const proximo = (atual + 1) % banners.length;
      rolagem.current?.scrollTo({ x: proximo * largura, animated: true });
      setAtual(proximo);
    }, TEMPO_POR_BANNER);
    return () => clearTimeout(relogio);
  }, [atual, banners.length, largura]);

  function aoParar(evento) {
    setAtual(Math.round(evento.nativeEvent.contentOffset.x / largura));
  }

  if (banners.length === 0) return null;

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      <ScrollView
        ref={rolagem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoParar}
        style={{ width: largura }}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id_anuncio}
            onPress={() => onTocar?.(banner)}
            activeOpacity={0.9}
            style={[styles.banner, { width: largura }]}
            accessibilityRole="link"
            accessibilityLabel={`Anúncio de ${banner.empresa_nome}`}
          >
            <Image source={{ uri: banner.imagem_url }} style={styles.imagem} resizeMode="cover" />
            <SeloAnuncio />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.bolinhas}>
          {banners.map((banner, indice) => (
            <View key={banner.id_anuncio} style={[styles.bolinha, indice === atual && styles.bolinhaAtual]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  banner: { height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cinzaInput },
  imagem: { width: '100%', height: '100%' },
  bolinhas: { flexDirection: 'row', marginTop: 8 },
  bolinha: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.bordaClara, marginHorizontal: 4 },
  bolinhaAtual: { backgroundColor: colors.textoSecundario },
});
