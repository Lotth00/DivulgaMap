import React, { useState } from 'react';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import CampoWizard from '../../components/wizard/CampoWizard';

// Etapa 3 (Figma 619:1342): endereço, bairro e ponto de referência
export default function EnderecoEmpresaScreen({ navigation }) {
  const { empresa, salvar } = useWizard();
  const [endereco, setEndereco] = useState(empresa?.endereco ?? '');
  const [bairro, setBairro] = useState(empresa?.bairro ?? '');
  const [referencia, setReferencia] = useState(empresa?.referencia ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function avancar() {
    setErro(null);
    setEnviando(true);
    try {
      await salvar({ endereco: endereco.trim(), bairro: bairro.trim(), referencia: referencia.trim() });
      navigation.navigate('WizardConfirmacao');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={3}
      titulo="Inserindo seu endereço de negócios"
      descricao="Use o nome da rua e o número, por exemplo: Rua Tristão Monteiro, 1000."
      erro={erro}
      podeAvancar={endereco.trim().length >= 3 && bairro.trim().length >= 2}
      enviando={enviando}
      onAvancar={avancar}
    >
      <CampoWizard placeholder="Endereço" value={endereco} onChangeText={setEndereco} maxLength={255} />
      <CampoWizard placeholder="Bairro" value={bairro} onChangeText={setBairro} maxLength={100} />
      <CampoWizard placeholder="Ponto de referência (opcional)" value={referencia} onChangeText={setReferencia} maxLength={150} />
    </TelaWizard>
  );
}
