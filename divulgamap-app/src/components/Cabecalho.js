import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

// Cabeçalho das telas internas: voltar, logo e menu ⋮ (cada botão só aparece se tiver ação)
export default function Cabecalho({ onVoltar, onMenu }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onVoltar} disabled={!onVoltar} style={styles.botao} accessibilityLabel="Voltar">
        {onVoltar && <Ionicons name="arrow-back" size={28} color={colors.pretoTexto} />}
      </TouchableOpacity>

      <Image source={require('../../assets/images/logo-wordmark.png')} style={styles.logo} resizeMode="contain" />

      <TouchableOpacity onPress={onMenu} disabled={!onMenu} style={styles.botao} accessibilityLabel="Mais opções">
        {onMenu && <Ionicons name="ellipsis-vertical" size={22} color={colors.pretoTexto} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  botao: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 130, height: 32 },
});
