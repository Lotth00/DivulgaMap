import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BotaoGradiente from './BotaoGradiente';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Aviso quando não há nada para mostrar, com ação opcional
export default function EstadoVazio({ icone = 'file-tray-outline', mensagem, textoAcao, onAcao }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icone} size={40} color={colors.cinzaPlaceholder} />
      <Text style={styles.mensagem}>{mensagem}</Text>
      {textoAcao && onAcao && <BotaoGradiente titulo={textoAcao} onPress={onAcao} estilo={styles.botao} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  mensagem: { ...tipografia.corpo, color: colors.textoSecundario, textAlign: 'center', marginTop: 10 },
  botao: { marginTop: 16, alignSelf: 'stretch' },
});
