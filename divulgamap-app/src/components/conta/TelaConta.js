import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cabecalho from '../Cabecalho';
import Carregando from '../Carregando';
import ErroComTentarDeNovo from '../ErroComTentarDeNovo';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Moldura das telas de conta: cabeçalho, título com linha, texto de apoio, conteúdo e rodapé fixo
export default function TelaConta({
  navigation, titulo, descricao, centralizado = false,
  carregando = false, falhou = false, onTentarDeNovo, rodape, children,
}) {
  const insets = useSafeAreaInsets();

  let corpo = children;
  if (carregando) corpo = <Carregando />;
  else if (falhou) corpo = <ErroComTentarDeNovo onTentarDeNovo={onTentarDeNovo} />;

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding">
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.cabecalhoTexto}>
          <Text style={[styles.titulo, centralizado && styles.centro]}>{titulo}</Text>
        </View>
        {descricao ? <Text style={[styles.descricao, centralizado && styles.centro]}>{descricao}</Text> : null}
        {corpo}
      </ScrollView>
      {rodape ? <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>{rodape}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  cabecalhoTexto: { borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara, paddingBottom: 6, marginBottom: 12 },
  titulo: { ...tipografia.tituloTela, fontSize: fs(20), color: colors.pretoTexto },
  centro: { textAlign: 'center' },
  descricao: { ...tipografia.corpo, color: colors.pretoTexto, marginBottom: 24 },
  rodape: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: colors.bordaClara, marginHorizontal: 20 },
});
