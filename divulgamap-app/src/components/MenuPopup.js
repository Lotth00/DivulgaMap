import React, { useState } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const DISTANCIA_DO_TOQUE = 14;
const SOBRA_DIREITA = 8;

// Ponto tocado na tela, para abrir o menu junto do ⋮ (use no onPress do botão)
export function ancoraDoToque(evento) {
  return { x: evento.nativeEvent.pageX, y: evento.nativeEvent.pageY };
}

// Menu pequeno que abre no canto, abaixo do ⋮ do cabeçalho, junto do ponto tocado (ancora) ou no meio da tela
// (centralizado); "perigo" pinta a opção de vermelho, "detalhe" mostra um texto menor embaixo e "aviso" vai acima das opções
export default function MenuPopup({ visivel, titulo, aviso, opcoes = [], centralizado = false, ancora, onFechar }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [alturaCaixa, setAlturaCaixa] = useState(0);

  let posicao = [styles.canto, { top: insets.top + 50 }];
  if (centralizado) {
    posicao = styles.centro;
  } else if (ancora) {
    // Logo abaixo do toque; se não couber, logo acima
    const embaixo = ancora.y + DISTANCIA_DO_TOQUE;
    const cabeEmbaixo = embaixo + alturaCaixa <= height - insets.bottom - 8;
    posicao = [
      styles.canto,
      {
        top: cabeEmbaixo ? embaixo : Math.max(insets.top + 8, ancora.y - DISTANCIA_DO_TOQUE - alturaCaixa),
        right: Math.max(8, width - ancora.x - SOBRA_DIREITA),
        opacity: alturaCaixa ? 1 : 0,
      },
    ];
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onFechar}>
      <Pressable style={[StyleSheet.absoluteFill, centralizado && styles.fundoEscuro]} onPress={onFechar} />
      <View pointerEvents="box-none" style={posicao}>
        <View
          style={[styles.caixa, centralizado && styles.caixaCentro]}
          onLayout={(e) => setAlturaCaixa(e.nativeEvent.layout.height)}
        >
          {titulo ? <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text> : null}
          {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
          {opcoes.map((opcao, indice) => (
            <TouchableOpacity
              key={`${indice}-${opcao.texto}`}
              onPress={() => {
                onFechar();
                opcao.onPress();
              }}
              style={styles.opcao}
              activeOpacity={0.6}
            >
              <Text style={[styles.texto, opcao.perigo && styles.perigo]} numberOfLines={1}>{opcao.texto}</Text>
              {opcao.detalhe ? <Text style={styles.detalhe}>{opcao.detalhe}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  canto: { position: 'absolute', right: 14 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  fundoEscuro: { backgroundColor: 'rgba(0,0,0,0.3)' },
  caixaCentro: { alignSelf: 'stretch', paddingVertical: 8 },
  titulo: { ...tipografia.legenda, color: colors.textoSecundario, paddingHorizontal: 14, paddingVertical: 6, maxWidth: 260 },
  aviso: { ...tipografia.legenda, color: colors.textoSecundario, paddingHorizontal: 14, paddingVertical: 6, maxWidth: 240 },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario },
  caixa: {
    minWidth: 170, backgroundColor: colors.brancoFundo, borderRadius: 8, paddingVertical: 4,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  opcao: { paddingVertical: 8, paddingHorizontal: 14 },
  texto: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  perigo: { color: colors.vermelhoAviso },
});
