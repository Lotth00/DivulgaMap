import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Campo de texto das etapas do cadastro (borda cinza e cantos arredondados, como no Figma)
export default function CampoWizard({ estilo, ...props }) {
  return (
    <TextInput
      placeholderTextColor={colors.cinzaPlaceholder}
      style={[styles.campo, estilo]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  campo: {
    ...tipografia.corpoMedio, color: colors.pretoTexto, backgroundColor: colors.fundoCaixa,
    borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14,
  },
});
