import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import colors from '../theme/colors';
import { useVisivelNaTela, SeloAnuncio } from './AnuncioFaixa';

const TEMPO_POR_BANNER = 5000;
const ESPACO_ENTRE = 10;
// Espera o fim da animação antes de saltar da cópia para o banner real
const TEMPO_SALTO = 400;

// Carrossel infinito dos anúncios em banner: troca sozinho, dá para deslizar para os dois lados,
// mostra a ponta dos vizinhos e as bolinhas indicam em qual está
export default function CarrosselBanners({ banners = [], margemLateral = 20, ativo = true, onImpressao, onTocar }) {
  const { width } = useWindowDimensions();
  const largura = width - margemLateral * 2;
  // Distância de um banner ao próximo (largura + espaço)
  const passo = largura + ESPACO_ENTRE;
  const total = banners.length;
  const emLoop = total > 1;

  // Com loop: cópia do último no começo e do primeiro no fim
  const itens = emLoop ? [banners[total - 1], ...banners, banners[0]] : banners;
  const inicio = emLoop ? 1 : 0;

  // Posição na lista com as cópias; "atual" é o banner real (para bolinhas e impressão)
  const [posicao, setPosicao] = useState(inicio);
  const atual = emLoop ? (posicao - 1 + total) % total : 0;
  const rolagem = useRef(null);
  const [ref, visivel] = useVisivelNaTela(ativo && total > 0);

  function irPara(novaPosicao, animado) {
    rolagem.current?.scrollTo({ x: novaPosicao * passo, animated: animado });
    setPosicao(novaPosicao);
  }

  // Lista nova volta para o primeiro
  useEffect(() => {
    irPara(inicio, false);
  }, [banners]);

  // Impressão do banner que está na tela
  const idAtual = banners[atual]?.id_anuncio;
  useEffect(() => {
    if (visivel && idAtual) onImpressao?.(idAtual);
  }, [visivel, idAtual, onImpressao]);

  // Numa cópia, salta para o banner real igual; senão, avança a cada intervalo
  useEffect(() => {
    if (!emLoop) return undefined;
    if (posicao === 0 || posicao === total + 1) {
      const salto = setTimeout(() => irPara(posicao === 0 ? total : 1, false), TEMPO_SALTO);
      return () => clearTimeout(salto);
    }
    const relogio = setTimeout(() => irPara(posicao + 1, true), TEMPO_POR_BANNER);
    return () => clearTimeout(relogio);
  }, [posicao, emLoop, total, passo]);

  function aoParar(evento) {
    setPosicao(Math.round(evento.nativeEvent.contentOffset.x / passo));
  }

  if (total === 0) return null;

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      <ScrollView
        ref={rolagem}
        horizontal
        snapToInterval={passo}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: inicio * passo, y: 0 }}
        onContentSizeChange={() => rolagem.current?.scrollTo({ x: posicao * passo, animated: false })}
        onMomentumScrollEnd={aoParar}
        style={{ marginHorizontal: -margemLateral }}
        contentContainerStyle={{ paddingHorizontal: margemLateral - ESPACO_ENTRE / 2 }}
      >
        {itens.map((banner, indice) => (
          <TouchableOpacity
            key={`${banner.id_anuncio}-${indice}`}
            onPress={() => onTocar?.(banner)}
            activeOpacity={0.9}
            style={[styles.banner, { width: largura, marginHorizontal: ESPACO_ENTRE / 2 }]}
            accessibilityRole="link"
            accessibilityLabel={`Anúncio de ${banner.empresa_nome}`}
          >
            <Image source={{ uri: banner.imagem_url }} style={styles.imagem} resizeMode="cover" />
            <SeloAnuncio />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {emLoop && (
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
  container: { marginTop: 8, marginBottom: 18 },
  banner: { height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cinzaInput },
  imagem: { width: '100%', height: '100%' },
  bolinhas: { flexDirection: 'row', alignSelf: 'center', marginTop: 8 },
  bolinha: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.bordaClara, marginHorizontal: 4 },
  bolinhaAtual: { backgroundColor: colors.textoSecundario },
});
