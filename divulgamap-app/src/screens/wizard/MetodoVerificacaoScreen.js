import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const METODOS = [
  { id: 'sms', icone: 'chatbox-ellipses-outline', titulo: 'SMS', texto: 'O código chegará por SMS para confirmar que o número é seu.' },
  { id: 'email', icone: 'mail-outline', titulo: 'E-mail', texto: 'O código chegará por e-mail para provar que é você.' },
];

// Etapa 6 (Figma 627:1169): escolha entre SMS e e-mail para receber o código
export default function MetodoVerificacaoScreen({ navigation }) {
  const { empresa } = useWizard();
  const [metodo, setMetodo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const jaVerificada = !!empresa?.verificado_em;

  async function avancar() {
    if (jaVerificada) {
      navigation.navigate('WizardHorario');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/empresas/${empresa.id_empresa}/enviar-codigo`, { metodo });
      navigation.navigate('WizardVerificacao', { metodo });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={6}
      titulo="Método de verificação"
      descricao={
        jaVerificada
          ? 'Esta empresa já foi verificada. Pode seguir para a próxima etapa.'
          : `Vamos enviar um código de verificação${empresa?.telefone ? ` (telefone ${empresa.telefone})` : ''}. Ele será usado para confirmar que você administra esta empresa.`
      }
      erro={erro}
      podeAvancar={jaVerificada || !!metodo}
      enviando={enviando}
      onAvancar={avancar}
    >
      {!jaVerificada &&
        METODOS.map((m) => {
          const escolhido = metodo === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.cartao, escolhido && styles.cartaoEscolhido]}
              onPress={() => setMetodo(m.id)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: escolhido }}
            >
              <View style={styles.icone}>
                <Ionicons name={m.icone} size={20} color={colors.pretoTexto} />
              </View>
              <View style={styles.textos}>
                <Text style={styles.titulo}>{m.titulo}</Text>
                <Text style={styles.texto}>{m.texto}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 12,
    backgroundColor: colors.fundoCaixa, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 14,
  },
  cartaoEscolhido: { borderColor: colors.pretoTexto },
  icone: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gradienteBase, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, marginLeft: 22 },
  titulo: { ...tipografia.corpo, color: colors.pretoTexto },
  texto: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
});
