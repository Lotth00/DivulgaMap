import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import colors from '../theme/colors';
import { fontes, fs } from '../theme/tipografia';

const INTERVALO_VISIBILIDADE = 800;

// Impressão ou clique de um anúncio (falha não atrapalha a tela)
export function registrarEventoAnuncio(id, tipo) {
  api.post(`/anuncios/${id}/${tipo}`).catch(() => {});
}

// Toque no anúncio: conta o clique e abre o destino (link, oferta ou empresa)
export function abrirAnuncio(anuncio, navigation) {
  registrarEventoAnuncio(anuncio.id_anuncio, 'clique');
  if (anuncio.destino === 'link' && anuncio.link_externo) {
    WebBrowser.openBrowserAsync(anuncio.link_externo).catch(() => {});
  } else if (anuncio.destino === 'oferta' && anuncio.promocao_id) {
    navigation.navigate('Oferta', { id: anuncio.promocao_id });
  } else {
    navigation.navigate('Empresa', { id: anuncio.empresa_id });
  }
}

// Diz se o elemento está pelo menos pela metade dentro da tela (conferido de tempos em tempos enquanto ativo)
export function useVisivelNaTela(ativo) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (!ativo) {
      setVisivel(false);
      return undefined;
    }
    function conferir() {
      ref.current?.measureInWindow((x, y, largura, altura) => {
        const meio = y + altura / 2;
        setVisivel(altura > 0 && meio >= 0 && meio <= height);
      });
    }
    conferir();
    const relogio = setInterval(conferir, INTERVALO_VISIBILIDADE);
    return () => clearInterval(relogio);
  }, [ativo, height]);

  return [ref, visivel];
}

// Selo "Anúncio" no canto
export function SeloAnuncio() {
  return (
    <View style={styles.selo}>
      <Text style={styles.textoSelo}>Anúncio</Text>
    </View>
  );
}

// Faixa de anúncio entre as seções do Explorar
export default function AnuncioFaixa({ anuncio, ativo = true, onImpressao, onPress }) {
  const [ref, visivel] = useVisivelNaTela(ativo);

  useEffect(() => {
    if (visivel) onImpressao?.(anuncio.id_anuncio);
  }, [visivel, anuncio.id_anuncio, onImpressao]);

  return (
    <View ref={ref} collapsable={false} style={styles.faixa}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.toque}
        accessibilityRole="link"
        accessibilityLabel={`Anúncio de ${anuncio.empresa_nome}`}
      >
        <Image source={{ uri: anuncio.imagem_url }} style={styles.imagem} resizeMode="cover" />
        <SeloAnuncio />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { height: 64, borderRadius: 6, overflow: 'hidden', marginVertical: 16, backgroundColor: colors.cinzaInput },
  toque: { flex: 1 },
  imagem: { width: '100%', height: '100%' },
  selo: {
    position: 'absolute', top: 4, right: 6, backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  textoSelo: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(9), color: colors.textoSecundario },
});
