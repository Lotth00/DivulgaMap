import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const TIPOS = { comercio: 'Comércio', servico: 'Serviço', ambos: 'Comércio e serviço' };

function Linha({ rotulo, valor, ultima }) {
  return (
    <View style={[styles.linha, !ultima && styles.divisoria]}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor || '—'}</Text>
    </View>
  );
}

// Etapa 12: resumo do cadastro e envio para a aprovação da equipe
export default function RevisaoEmpresaScreen({ navigation }) {
  const { empresa } = useWizard();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/empresas/${empresa.id_empresa}/submeter`);
      navigation.reset({ index: 0, routes: [{ name: 'WizardEnviado' }] });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const endereco = [empresa?.endereco, empresa?.bairro].filter(Boolean).join(' - ');

  return (
    <TelaWizard
      navigation={navigation}
      passo={12}
      titulo="Confira e envie"
      descricao="Confira os dados principais. Depois de enviar, a equipe do DivulgaMap analisa o cadastro antes de mostrar a empresa no mapa."
      erro={erro}
      textoBotao="Enviar para aprovação"
      enviando={enviando}
      onAvancar={enviar}
    >
      <View style={styles.caixa}>
        <Linha rotulo="Nome" valor={empresa?.nome_fantasia} />
        <Linha rotulo="Tipo" valor={TIPOS[empresa?.tipo]} />
        <Linha rotulo="Categorias" valor={(empresa?.categorias ?? []).join(', ')} />
        <Linha rotulo="Endereço" valor={endereco} />
        <Linha rotulo="Telefone" valor={empresa?.telefone} />
        <Linha rotulo="Descrição" valor={empresa?.descricao} ultima />
      </View>
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  caixa: { borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 16, backgroundColor: colors.fundoCaixa, paddingHorizontal: 18 },
  linha: { paddingVertical: 10 },
  divisoria: { borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  rotulo: { ...tipografia.legenda, color: colors.textoSecundario },
  valor: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginTop: 2 },
});
