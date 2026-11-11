import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const RAIO = 20;

// Cantos arredondados conforme a posição do item no grupo
const CANTOS = {
  unico: { borderRadius: RAIO },
  primeiro: { borderTopLeftRadius: RAIO, borderTopRightRadius: RAIO },
  meio: {},
  ultimo: { borderBottomLeftRadius: RAIO, borderBottomRightRadius: RAIO },
};

// Faixa de menu da tela Conta (Figma 126:914): ícone, texto e conteúdo opcional à direita
export default function ItemMenu({ icone, texto, onPress, posicao = 'unico', direita, desativado = false }) {
  const cantos = CANTOS[posicao] || CANTOS.unico;
  return (
    <TouchableOpacity onPress={onPress} disabled={desativado || !onPress} activeOpacity={0.7} style={[cantos, posicao !== 'primeiro' && posicao !== 'unico' && styles.divisoria]}>
      <LinearGradient
        colors={[colors.menuInicio, colors.menuFim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fundo, cantos, desativado && styles.desativado]}
      >
        {icone && <Ionicons name={icone} size={20} color={colors.pretoTexto} style={styles.icone} />}
        <Text style={styles.texto} numberOfLines={1}>{texto}</Text>
        {direita && <View style={styles.direita}>{direita}</View>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fundo: { height: 45, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  divisoria: { borderTopWidth: 1, borderTopColor: colors.menuDivisoria },
  icone: { marginRight: 10, width: 24, textAlign: 'center' },
  texto: { ...tipografia.corpo, color: colors.textoPrincipal, flex: 1 },
  direita: { marginLeft: 8 },
  desativado: { opacity: 0.45 },
});
