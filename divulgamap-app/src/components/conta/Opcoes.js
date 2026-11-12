import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CaixaGradiente from '../CaixaGradiente';
import { avisarEmBreve } from './util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Caixa das opções: borda em degradê (padrão) ou cinza
export function Caixa({ cinza = false, children, estilo }) {
  if (cinza) return <View style={[styles.caixaCinza, estilo]}>{children}</View>;
  return <CaixaGradiente estilo={estilo} estiloConteudo={styles.caixa}>{children}</CaixaGradiente>;
}

// Título de bloco com a linha em degradê embaixo ("Suas atividades", "Sua conta")
export function TituloCaixa({ texto }) {
  return (
    <View style={styles.tituloCaixa}>
      <Text style={styles.textoTituloCaixa}>{texto}</Text>
      <LinearGradient colors={[colors.menuInicio, colors.gradienteBase]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.linhaDegrade} />
    </View>
  );
}

// Linha com seta; "detalhe" é um texto menor embaixo; desativada fica apagada e avisa "em breve"
export function OpcaoSeta({ texto, detalhe, onPress, desativada = false }) {
  return (
    <TouchableOpacity
      onPress={desativada ? () => avisarEmBreve(texto) : onPress}
      style={[styles.linha, desativada && styles.apagada]}
      activeOpacity={0.6}
    >
      <View style={styles.textos}>
        <Text style={styles.texto}>{texto}</Text>
        {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.pretoTexto} />
    </TouchableOpacity>
  );
}

// Chave liga/desliga do Figma (trilho amarelo e bolinha preta)
export function Chave({ ligada, onMudar, desativada = false, rotulo }) {
  return (
    <TouchableOpacity
      onPress={() => onMudar(!ligada)}
      disabled={desativada}
      style={[styles.trilho, ligada ? styles.trilhoLigado : styles.trilhoDesligado, desativada && styles.apagada]}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: ligada, disabled: desativada }}
      accessibilityLabel={rotulo}
    >
      <View style={[styles.bolinha, ligada ? styles.bolinhaLigada : styles.bolinhaDesligada]} />
    </TouchableOpacity>
  );
}

// Linha com chave à direita
export function OpcaoChave({ texto, detalhe, ligada, onMudar, desativada = false }) {
  return (
    <View style={[styles.linha, desativada && styles.apagada]}>
      <View style={styles.textos}>
        <Text style={styles.texto}>{texto}</Text>
        {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
      </View>
      <Chave ligada={ligada} onMudar={onMudar} desativada={desativada} rotulo={texto} />
    </View>
  );
}

// Linha de escolha única (bolinha marcada)
export function OpcaoRadio({ texto, detalhe, marcada, onPress, desativada = false }) {
  return (
    <TouchableOpacity
      onPress={desativada ? () => avisarEmBreve(texto) : onPress}
      style={[styles.linha, desativada && styles.apagada]}
      activeOpacity={0.6}
      accessibilityRole="radio"
      accessibilityState={{ selected: marcada }}
    >
      <View style={styles.textos}>
        <Text style={styles.texto}>{texto}</Text>
        {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
      </View>
      <Ionicons name={marcada ? 'radio-button-on' : 'radio-button-off'} size={26} color={colors.pretoTexto} />
    </TouchableOpacity>
  );
}

// Parágrafo dentro das caixas
export function Paragrafo({ children, estilo }) {
  return <Text style={[styles.paragrafo, estilo]}>{children}</Text>;
}

const styles = StyleSheet.create({
  caixa: { paddingVertical: 6, paddingHorizontal: 20 },
  caixaCinza: {
    borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 20, backgroundColor: colors.fundoCaixa,
    paddingVertical: 6, paddingHorizontal: 20,
  },
  tituloCaixa: { marginTop: 8, marginBottom: 4 },
  textoTituloCaixa: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto, marginBottom: 4 },
  linhaDegrade: { height: 2, borderRadius: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  textos: { flex: 1, marginRight: 10 },
  texto: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
  apagada: { opacity: 0.45 },
  paragrafo: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginVertical: 8 },
  trilho: { width: 46, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.pretoTexto, justifyContent: 'center', paddingHorizontal: 3 },
  trilhoLigado: { backgroundColor: colors.menuFim },
  trilhoDesligado: { backgroundColor: colors.brancoFundo },
  bolinha: { width: 17, height: 17, borderRadius: 9 },
  bolinhaLigada: { alignSelf: 'flex-end', backgroundColor: colors.pretoTexto },
  bolinhaDesligada: { alignSelf: 'flex-start', backgroundColor: colors.cinzaPlaceholder },
});
