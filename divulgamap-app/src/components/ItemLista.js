import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Opção dentro de uma CaixaGradiente: texto e seta (ou outro conteúdo à direita)
export default function ItemLista({ texto, descricao, onPress, direita, desativado = false }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={desativado || !onPress} activeOpacity={0.6} style={[styles.linha, desativado && styles.desativado]}>
      <View style={styles.textos}>
        <Text style={styles.texto}>{texto}</Text>
        {descricao && <Text style={styles.descricao}>{descricao}</Text>}
      </View>
      {direita ?? <Ionicons name="chevron-forward" size={22} color={colors.pretoTexto} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  textos: { flex: 1, marginRight: 8 },
  texto: { fontFamily: tipografia.corpo.fontFamily, includeFontPadding: false, fontSize: 17, color: colors.pretoTexto },
  descricao: { ...tipografia.legenda, color: colors.textoSecundario },
  desativado: { opacity: 0.45 },
});
