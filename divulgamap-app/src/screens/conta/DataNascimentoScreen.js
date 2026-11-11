import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import ModalEditarTexto from '../../components/conta/ModalEditarTexto';
import { useDadosUsuario, atualizarDados, dataPorExtenso, dataParaCampo, mascaraData, campoParaData } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Data de nascimento (Figma 517:1045)
export default function DataNascimentoScreen({ navigation }) {
  const { dados, setDados, carregando, falhou, carregar } = useDadosUsuario();
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvar(texto) {
    setEnviando(true);
    const novos = await atualizarDados({ data_nascimento: campoParaData(texto) });
    setEnviando(false);
    if (!novos) return;
    setDados(novos);
    setEditando(false);
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Data de nascimento"
      descricao="Fica só com você e não aparece no seu perfil."
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
    >
      {dados && (
        <CaixaGradiente estiloConteudo={styles.caixa}>
          <Text style={[styles.data, !dados.data_nascimento && styles.vazia]}>
            {dataPorExtenso(dados.data_nascimento) || 'Não informada'}
          </Text>
          <TouchableOpacity onPress={() => setEditando(true)} style={styles.editar}>
            <Text style={styles.textoEditar}>{dados.data_nascimento ? 'Editar' : 'Adicionar'}</Text>
          </TouchableOpacity>
        </CaixaGradiente>
      )}

      <ModalEditarTexto
        visivel={editando}
        titulo="Data de nascimento"
        ajuda="Dia, mês e ano, por exemplo 13/10/2008."
        valorInicial={dataParaCampo(dados?.data_nascimento)}
        placeholder="DD/MM/AAAA"
        teclado="number-pad"
        mascara={mascaraData}
        validar={(texto) => !!campoParaData(texto)}
        maxLength={10}
        enviando={enviando}
        onConfirmar={salvar}
        onFechar={() => setEditando(false)}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 20, paddingRight: 10 },
  data: { ...tipografia.corpo, fontSize: fs(15), color: colors.pretoTexto, flex: 1 },
  vazia: { color: colors.textoSecundario },
  editar: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  textoEditar: { ...tipografia.corpo, fontSize: fs(15), color: colors.textoPrincipal },
});
