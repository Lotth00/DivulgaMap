import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa } from '../../components/conta/Opcoes';
import { PERGUNTAS_AJUDA } from './textos';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Ajuda: perguntas frequentes que abrem e fecham
export default function AjudaScreen({ navigation }) {
  const [aberta, setAberta] = useState(null);
  return (
    <TelaConta
      navigation={navigation}
      titulo="Ajuda"
      descricao="Toque numa pergunta para ver a resposta. Se não achar o que procura, use Relatar problema."
    >
      <Caixa cinza>
        {PERGUNTAS_AJUDA.map((item, indice) => {
          const estaAberta = aberta === indice;
          return (
            <View key={item.pergunta} style={indice > 0 && styles.divisoria}>
              <TouchableOpacity
                onPress={() => setAberta(estaAberta ? null : indice)}
                style={styles.pergunta}
                activeOpacity={0.6}
                accessibilityState={{ expanded: estaAberta }}
              >
                <Text style={styles.textoPergunta}>{item.pergunta}</Text>
                <Ionicons name={estaAberta ? 'chevron-up' : 'chevron-down'} size={20} color={colors.pretoTexto} />
              </TouchableOpacity>
              {estaAberta && <Text style={styles.resposta}>{item.resposta}</Text>}
            </View>
          );
        })}
      </Caixa>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  divisoria: { borderTopWidth: 1, borderTopColor: colors.bordaClara },
  pergunta: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  textoPergunta: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto, flex: 1, marginRight: 8 },
  resposta: { ...tipografia.corpoMedio, color: colors.textoSecundario, paddingBottom: 12 },
});
