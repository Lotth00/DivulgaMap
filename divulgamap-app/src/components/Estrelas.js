import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

// Cinco estrelas: só exibe a nota (com meia estrela) ou, com onMudar, deixa escolher de 1 a 5
export default function Estrelas({ nota = 0, tamanho = 18, onMudar }) {
  const valor = Number(nota) || 0;
  return (
    <View style={styles.linha} accessibilityLabel={`Nota ${valor.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((posicao) => {
        const nome = valor >= posicao ? 'star' : valor >= posicao - 0.5 ? 'star-half' : 'star-outline';
        const icone = (
          <Ionicons name={nome} size={tamanho} color={nome === 'star-outline' ? colors.estrelaVazia : colors.estrela} />
        );
        return onMudar ? (
          <TouchableOpacity key={posicao} onPress={() => onMudar(posicao)} style={styles.toque} accessibilityLabel={`${posicao} estrelas`}>
            {icone}
          </TouchableOpacity>
        ) : (
          <View key={posicao} style={styles.espaco}>{icone}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
  toque: { padding: 4 },
  espaco: { marginRight: 2 },
});
