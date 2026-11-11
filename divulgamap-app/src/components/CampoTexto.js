import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Campo com borda cinza e contador opcional ("48/200"), como em Editar perfil
export default function CampoTexto({ valor, onMudar, placeholder, limite, multilinha = false, estilo, ...resto }) {
  return (
    <View style={estilo}>
      <TextInput
        value={valor}
        onChangeText={onMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.cinzaPlaceholder}
        maxLength={limite}
        multiline={multilinha}
        textAlignVertical={multilinha ? 'top' : 'center'}
        underlineColorAndroid="transparent"
        cursorColor={colors.pretoTexto}
        selectionColor={colors.menuInicio}
        style={[styles.campo, multilinha && styles.multilinha]}
        {...resto}
      />
      {limite && <Text style={styles.contador}>{(valor || '').length}/{limite}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fundo explícito: sem ele, o Android desenha a linha padrão embaixo do texto
  campo: { ...tipografia.corpo, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.pretoTexto },
  multilinha: { minHeight: 68 },
  contador: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'right', marginTop: 4, marginRight: 16 },
});
