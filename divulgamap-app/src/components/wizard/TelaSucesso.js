import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cabecalho from '../Cabecalho';
import BotaoGradiente from '../BotaoGradiente';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const ILUSTRACAO = require('../../../assets/images/sucesso-checklist.png');

// Tela de sucesso do cadastro (Figma: "Verificação validada" e "Enviado com sucesso"): sem voltar
export default function TelaSucesso({ titulo, texto, textoBotao = 'Avançar', onAvancar }) {
  const insets = useSafeAreaInsets();

  // Botão voltar do Android faz o mesmo que "Avançar"
  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      onAvancar();
      return true;
    });
    return () => assinatura.remove();
  }, [onAvancar]);

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <Cabecalho />
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Image source={ILUSTRACAO} style={styles.ilustracao} resizeMode="contain" />
        <View style={styles.divisoria} />
        <Text style={styles.texto}>{texto}</Text>
      </View>
      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <BotaoGradiente titulo={textoBotao} onPress={onAvancar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 70 },
  titulo: { ...tipografia.tituloTela, fontSize: fs(20), lineHeight: fs(32), color: colors.pretoTexto, textAlign: 'center', maxWidth: 260 },
  ilustracao: { width: 170, height: 170, marginTop: 40, marginBottom: 40 },
  divisoria: { alignSelf: 'stretch', height: 1.5, backgroundColor: colors.bordaClara, marginBottom: 18 },
  texto: { ...tipografia.legenda, fontSize: fs(14), lineHeight: fs(22), color: colors.pretoTexto, textAlign: 'center' },
  rodape: { marginHorizontal: 20, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: colors.bordaClara },
});
