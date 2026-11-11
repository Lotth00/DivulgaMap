import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import ModalEditarTexto from '../../components/conta/ModalEditarTexto';
import { useDadosUsuario, atualizarDados, mascaraTelefone, telefoneValido, avisarEmBreve } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Caixa de um contato com seta
function Contato({ texto, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.espaco}>
      <CaixaGradiente estiloConteudo={styles.caixa}>
        <Text style={styles.texto} numberOfLines={1}>{texto}</Text>
        <Ionicons name="chevron-forward" size={24} color={colors.pretoTexto} />
      </CaixaGradiente>
    </TouchableOpacity>
  );
}

// Informações de contato (Figma 517:1009): e-mail e telefone
export default function ContatosScreen({ navigation }) {
  const { dados, setDados, carregando, falhou, carregar } = useDadosUsuario();
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvarTelefone(telefone) {
    setEnviando(true);
    const novos = await atualizarDados({ telefone });
    setEnviando(false);
    if (!novos) return;
    setDados(novos);
    setEditando(false);
  }

  function removerTelefone() {
    Alert.alert('Remover telefone', 'O telefone vai sair da sua conta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const novos = await atualizarDados({ telefone: null });
          if (novos) setDados(novos);
        },
      },
    ]);
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Informações de contato"
      descricao="O e-mail é usado para entrar na conta e receber códigos. O telefone é opcional."
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
      rodape={
        dados && !dados.telefone ? (
          <TouchableOpacity onPress={() => setEditando(true)} style={styles.botaoNovo} activeOpacity={0.8}>
            <Text style={styles.textoBotaoNovo}>ADICIONAR NOVO CONTATO</Text>
          </TouchableOpacity>
        ) : null
      }
    >
      {dados && (
        <>
          <Contato texto={dados.email} onPress={() => avisarEmBreve('Alterar o e-mail')} />
          {dados.telefone ? (
            <>
              <Contato texto={dados.telefone} onPress={() => setEditando(true)} />
              <TouchableOpacity onPress={removerTelefone} style={styles.remover}>
                <Text style={styles.textoRemover}>Remover telefone</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </>
      )}

      <ModalEditarTexto
        visivel={editando}
        titulo={dados?.telefone ? 'Editar telefone' : 'Novo telefone'}
        ajuda="Com DDD, por exemplo (51) 99999-9999."
        valorInicial={dados?.telefone ?? ''}
        placeholder="(51) 99999-9999"
        teclado="phone-pad"
        mascara={mascaraTelefone}
        validar={telefoneValido}
        maxLength={15}
        enviando={enviando}
        onConfirmar={salvarTelefone}
        onFechar={() => setEditando(false)}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  espaco: { marginBottom: 12 },
  caixa: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  texto: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto, flex: 1, marginRight: 8 },
  remover: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  textoRemover: { ...tipografia.corpoMedio, color: colors.vermelhoAviso },
  botaoNovo: { backgroundColor: colors.pretoTexto, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  textoBotaoNovo: { ...tipografia.corpo, fontSize: fs(16), color: colors.brancoFundo },
});
