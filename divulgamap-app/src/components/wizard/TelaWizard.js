import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cabecalho from '../Cabecalho';
import BotaoGradiente from '../BotaoGradiente';
import BarraProgressoWizard from '../BarraProgressoWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Moldura das etapas do cadastro de empresa: cabeçalho, progresso, título, texto, conteúdo e "Avançar"
export default function TelaWizard({
  navigation, passo, titulo, descricao, erro, textoBotao = 'Avançar',
  podeAvancar = true, enviando = false, onAvancar, children,
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding">
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} />
      <BarraProgressoWizard passo={passo} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.linhaTitulo}>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
        {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}
        {children}
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      </ScrollView>
      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <BotaoGradiente titulo={textoBotao} onPress={onAvancar} desativado={!podeAvancar} carregando={enviando} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  linhaTitulo: { borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara, paddingBottom: 6, marginBottom: 10 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto },
  descricao: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginBottom: 20 },
  erro: { ...tipografia.legenda, color: colors.vermelhoAviso, marginTop: 12 },
  rodape: { marginHorizontal: 20, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: colors.bordaClara },
});
