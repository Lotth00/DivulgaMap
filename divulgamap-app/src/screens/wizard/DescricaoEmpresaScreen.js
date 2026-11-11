import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import CampoWizard from '../../components/wizard/CampoWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const LIMITE = 800;

// Etapa 9 (Figma 644:1381): texto livre sobre a empresa (opcional)
export default function DescricaoEmpresaScreen({ navigation }) {
  const { empresa, salvar } = useWizard();
  const [descricao, setDescricao] = useState(empresa?.descricao ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function avancar() {
    setErro(null);
    setEnviando(true);
    try {
      await salvar({ descricao: descricao.trim() });
      navigation.navigate('WizardFotos');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={9}
      titulo="Descrição da empresa"
      descricao="Conte em poucas palavras o que a empresa vende ou faz. Esse texto aparece no perfil da empresa. Se preferir, deixe em branco."
      erro={erro}
      enviando={enviando}
      onAvancar={avancar}
    >
      <CampoWizard
        estilo={styles.campo}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        textAlignVertical="top"
        maxLength={LIMITE}
      />
      <Text style={styles.contador}>{descricao.length}/{LIMITE}</Text>
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  campo: { minHeight: 150, marginBottom: 4 },
  contador: { ...tipografia.pequeno, color: colors.textoSecundario, alignSelf: 'flex-end' },
});
