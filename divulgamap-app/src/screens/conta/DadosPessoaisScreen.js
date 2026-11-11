import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import ModalEditarTexto from '../../components/conta/ModalEditarTexto';
import { useDadosUsuario, atualizarDados, dataPorExtenso } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Linha da caixa: título, textos de apoio e seta
function Linha({ titulo, linhas = [], onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.linha} activeOpacity={0.6}>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {linhas.filter(Boolean).map((texto) => (
          <Text key={texto} style={styles.apoio} numberOfLines={1}>{texto}</Text>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.pretoTexto} />
    </TouchableOpacity>
  );
}

// Dados pessoais (Figma 517:931), com o nome junto
export default function DadosPessoaisScreen({ navigation }) {
  const { atualizarUsuario } = useAuth();
  const { dados, setDados, carregando, falhou, carregar } = useDadosUsuario();
  const [editandoNome, setEditandoNome] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvarNome(nome) {
    setEnviando(true);
    const novos = await atualizarDados({ nome });
    setEnviando(false);
    if (!novos) return;
    setDados(novos);
    await atualizarUsuario({ nome: novos.nome });
    setEditandoNome(false);
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Dados pessoais"
      descricao="Seu nome aparece nas suas avaliações. O telefone e a data de nascimento ficam só com você."
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
    >
      {dados && (
        <CaixaGradiente estiloConteudo={styles.caixa}>
          <Linha titulo="Nome" linhas={[dados.nome]} onPress={() => setEditandoNome(true)} />
          <Linha
            titulo="Informações de contato"
            linhas={[dados.email, dados.telefone || 'Sem telefone']}
            onPress={() => navigation.navigate('Contatos')}
          />
          <Linha
            titulo="Data de nascimento"
            linhas={[dataPorExtenso(dados.data_nascimento) || 'Não informada']}
            onPress={() => navigation.navigate('DataNascimento')}
          />
          <Linha titulo="Exclusão de conta" onPress={() => navigation.navigate('ExcluirConta')} />
        </CaixaGradiente>
      )}

      <ModalEditarTexto
        visivel={editandoNome}
        titulo="Seu nome"
        valorInicial={dados?.nome ?? ''}
        placeholder="Nome"
        enviando={enviando}
        onConfirmar={salvarNome}
        onFechar={() => setEditandoNome(false)}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  caixa: { paddingVertical: 6, paddingHorizontal: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  textos: { flex: 1, marginRight: 8 },
  titulo: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto },
  apoio: { ...tipografia.corpoMedio, color: colors.textoPrincipal },
});
