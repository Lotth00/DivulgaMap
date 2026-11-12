import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const ESPERA_ATE_AVISAR = 5000;

// true quando algo continua carregando depois de alguns segundos (servidor gratuito acordando)
export function useDemorou(ativo, espera = ESPERA_ATE_AVISAR) {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    if (!ativo) {
      setDemorou(false);
      return undefined;
    }
    const relogio = setTimeout(() => setDemorou(true), espera);
    return () => clearTimeout(relogio);
  }, [ativo, espera]);
  return demorou;
}

// Aviso de que o servidor está acordando (aparece só depois da espera)
export default function AvisoConectando({ ativo, estilo }) {
  const demorou = useDemorou(ativo);
  if (!demorou) return null;
  return (
    <Text style={[styles.texto, estilo]}>
      Conectando ao servidor… Na primeira vez do dia ele pode levar até 1 minuto para acordar.
    </Text>
  );
}

const styles = StyleSheet.create({
  texto: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
});
