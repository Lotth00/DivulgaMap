import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import { avisarEmBreve } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Linha da caixa; as desativadas ficam apagadas e avisam "em breve"
function Opcao({ texto, onPress, desativada }) {
  return (
    <TouchableOpacity
      onPress={desativada ? () => avisarEmBreve(texto) : onPress}
      style={[styles.linha, desativada && styles.desativada]}
      activeOpacity={0.6}
    >
      <Text style={styles.texto}>{texto}</Text>
      {desativada && <Text style={styles.emBreve}>em breve</Text>}
      <Ionicons name="chevron-forward" size={24} color={colors.pretoTexto} />
    </TouchableOpacity>
  );
}

// Senha e segurança (Figma 522:1102)
export default function SenhaSegurancaScreen({ navigation }) {
  return (
    <TelaConta
      navigation={navigation}
      titulo="Senha e segurança"
      descricao="Troque a sua senha sempre que achar que outra pessoa pode conhecê-la."
    >
      <CaixaGradiente estiloConteudo={styles.caixa}>
        <Opcao texto="Alterar senha" onPress={() => navigation.navigate('TrocarSenha')} />
        <Opcao texto="Autenticação aprimorada" desativada />
        <Opcao texto="Login salvo" desativada />
        <Opcao texto="Onde você fez login" desativada />
      </CaixaGradiente>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  caixa: { paddingVertical: 6, paddingHorizontal: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  desativada: { opacity: 0.45 },
  texto: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto, flex: 1 },
  emBreve: { ...tipografia.pequeno, color: colors.textoSecundario, marginRight: 6 },
});
