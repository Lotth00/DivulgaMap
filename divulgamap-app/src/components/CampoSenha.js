import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import BotaoOlho from './BotaoOlho';
import colors from '../theme/colors';

// Campo de senha cinza (Entrar e Criar conta), com texto preto e olho para mostrar a senha
export default function CampoSenha({ estiloCaixa, ...resto }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={[styles.caixa, estiloCaixa]}>
      <TextInput
        placeholderTextColor={colors.cinzaPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        {...resto}
        secureTextEntry={!visivel}
        style={styles.texto}
      />
      <BotaoOlho visivel={visivel} onAlternar={() => setVisivel((v) => !v)} />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cinzaInput,
    borderRadius: 10, marginBottom: 14, paddingRight: 12,
  },
  texto: { flex: 1, fontFamily: 'Poppins_400Regular', includeFontPadding: false, padding: 14, color: colors.pretoTexto },
});
