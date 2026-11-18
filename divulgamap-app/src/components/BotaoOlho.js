import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

// Olho que mostra ou esconde a senha digitada
export default function BotaoOlho({ visivel, onAlternar, cor = colors.textoSecundario }) {
  return (
    <TouchableOpacity
      onPress={onAlternar}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={visivel ? 'Esconder senha' : 'Mostrar senha'}
    >
      <Ionicons name={visivel ? 'eye-off-outline' : 'eye-outline'} size={22} color={cor} />
    </TouchableOpacity>
  );
}
