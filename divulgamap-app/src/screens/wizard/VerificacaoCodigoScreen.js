import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const DIGITOS = 6;
const ESPERA_REENVIO = 60; // segundos

// Etapa 7 (Figma 642:1149): código de 6 dígitos, com reenvio
export default function VerificacaoCodigoScreen({ navigation, route }) {
  const { empresa } = useWizard();
  const metodo = route.params?.metodo ?? 'email';
  const [codigo, setCodigo] = useState('');
  const [espera, setEspera] = useState(ESPERA_REENVIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const campo = useRef(null);

  // Contagem até liberar o "Reenviar"
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function reenviar() {
    setErro(null);
    setAviso(null);
    try {
      await api.post(`/empresas/${empresa.id_empresa}/enviar-codigo`, { metodo });
      setCodigo('');
      setEspera(ESPERA_REENVIO);
      setAviso('Enviamos um código novo.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function confirmar() {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await api.post(`/empresas/${empresa.id_empresa}/confirmar-codigo`, { codigo });
      navigation.navigate('WizardHorario');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const destino = metodo === 'sms'
    ? `por SMS${empresa?.telefone ? ` para o número ${empresa.telefone}` : ''}`
    : 'para o e-mail da sua conta';

  return (
    <TelaWizard
      navigation={navigation}
      passo={7}
      titulo="Verificação"
      descricao={`Foi enviado um código ${destino}. Ele será usado para verificar se você administra esta empresa.`}
      erro={erro}
      podeAvancar={codigo.length === DIGITOS}
      enviando={enviando}
      onAvancar={confirmar}
    >
      {/* Um campo invisível recebe o código; as caixas só mostram os dígitos */}
      <TouchableOpacity style={styles.caixas} activeOpacity={1} onPress={() => campo.current?.focus()}>
        {Array.from({ length: DIGITOS }).map((_, i) => (
          <View key={i} style={[styles.caixa, i === codigo.length && styles.caixaAtual]}>
            <Text style={[styles.digito, !codigo[i] && styles.vazio]}>{codigo[i] ?? '0'}</Text>
          </View>
        ))}
      </TouchableOpacity>
      <TextInput
        ref={campo}
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, DIGITOS))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={DIGITOS}
        autoFocus
        style={styles.oculto}
        accessibilityLabel="Código de verificação"
      />

      {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
      <TouchableOpacity onPress={reenviar} disabled={espera > 0} style={styles.reenviar}>
        <Text style={[styles.textoReenviar, espera > 0 && styles.desativado]}>
          {espera > 0 ? `Reenviar código em ${espera}s` : 'Reenviar código'}
        </Text>
      </TouchableOpacity>
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  caixas: { flexDirection: 'row', justifyContent: 'space-between' },
  caixa: {
    width: 46, height: 58, borderRadius: 10, borderWidth: 2, borderColor: colors.bordaClara,
    backgroundColor: colors.fundoCaixa, alignItems: 'center', justifyContent: 'center',
  },
  caixaAtual: { borderColor: colors.pretoTexto },
  digito: { ...tipografia.corpo, color: colors.pretoTexto },
  vazio: { color: colors.cinzaPlaceholder },
  oculto: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  aviso: { ...tipografia.legenda, color: colors.verdePreco, marginTop: 12 },
  reenviar: { marginTop: 18, alignSelf: 'flex-start' },
  textoReenviar: { ...tipografia.corpoMedio, color: colors.pretoTexto, textDecorationLine: 'underline' },
  desativado: { color: colors.cinzaPlaceholder, textDecorationLine: 'none' },
});
