import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Menu pequeno que abre no canto, abaixo do ⋮ do cabeçalho, ou no meio da tela (centralizado);
// "perigo" pinta a opção de vermelho e "detalhe" mostra um texto menor embaixo
export default function MenuPopup({ visivel, titulo, opcoes = [], centralizado = false, onFechar }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={[StyleSheet.absoluteFill, centralizado && styles.fundoEscuro]} onPress={onFechar} />
      <View
        pointerEvents="box-none"
        style={centralizado ? styles.centro : [styles.canto, { top: insets.top + 48 }]}
      >
        <View style={[styles.caixa, centralizado && styles.caixaCentro]}>
          {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
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
  titulo: { ...tipografia.legenda, color: colors.textoSecundario, paddingHorizontal: 14, paddingVertical: 6 },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario },
  caixa: {
    minWidth: 170, backgroundColor: colors.brancoFundo, borderRadius: 8, paddingVertical: 4,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  opcao: { paddingVertical: 8, paddingHorizontal: 14 },
  texto: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  perigo: { color: colors.vermelhoAviso },
});
