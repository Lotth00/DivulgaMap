import React from 'react';
import { Text, StyleSheet } from 'react-native';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, TituloCaixa, Paragrafo } from '../../components/conta/Opcoes';
import { POLITICA_PRIVACIDADE, TERMOS_DE_USO } from './textos';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const DOCUMENTOS = {
  privacidade: { titulo: 'Política de privacidade', secoes: POLITICA_PRIVACIDADE },
  termos: { titulo: 'Termos de uso', secoes: TERMOS_DE_USO },
};

// Política de privacidade ou Termos de uso, em blocos
export default function TextoLegalScreen({ route, navigation }) {
  const documento = DOCUMENTOS[route.params?.tipo] ?? DOCUMENTOS.privacidade;
  return (
    <TelaConta navigation={navigation} titulo={documento.titulo}>
      {documento.secoes.map((secao) => (
        <Caixa cinza key={secao.titulo} estilo={styles.bloco}>
          <TituloCaixa texto={secao.titulo} />
          <Paragrafo>{secao.texto}</Paragrafo>
        </Caixa>
      ))}
      <Text style={styles.data}>Última atualização: novembro de 2026</Text>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: 12 },
  data: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center', marginTop: 8 },
});
