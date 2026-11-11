import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TelaConta from '../../components/conta/TelaConta';
import ModalEditarTexto from '../../components/conta/ModalEditarTexto';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const AVISO = [
  'Ao excluir a sua conta, apagamos de vez:',
  '• seus dados pessoais e o seu perfil;',
  '• suas avaliações e as fotos delas;',
  '• suas listas, os itens salvos e o seu histórico;',
  '• as empresas que você cadastrou.',
  '',
  'Isso não pode ser desfeito. Para confirmar, vamos pedir a sua senha.',
].join('\n');

// Exclusão de conta (Figma 519:1078): pede a senha e volta para a Welcome
export default function ExcluirContaScreen({ navigation }) {
  const { sair } = useAuth();
  const [pedindoSenha, setPedindoSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function excluir(senha) {
    setEnviando(true);
    try {
      await api.delete('/usuarios/me', { data: { senha } });
      setPedindoSenha(false);
      await sair();
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      Alert.alert('Conta excluída', 'Sua conta e os seus dados foram apagados.');
    } catch (erro) {
      Alert.alert('Não foi possível excluir', erro.response?.data?.erro || 'Confira sua conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Exclusão de conta"
      descricao={AVISO}
      rodape={
        <TouchableOpacity onPress={() => setPedindoSenha(true)} style={styles.botao} activeOpacity={0.7}>
          <Text style={styles.textoBotao}>Excluir conta</Text>
        </TouchableOpacity>
      }
    >
      <ModalEditarTexto
        visivel={pedindoSenha}
        titulo="Confirme com a sua senha"
        ajuda="Depois de excluída, a conta não pode ser recuperada."
        placeholder="Senha"
        senha
        textoBotao="Excluir conta"
        enviando={enviando}
        onConfirmar={excluir}
        onFechar={() => setPedindoSenha(false)}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  botao: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  textoBotao: { ...tipografia.corpo, fontSize: fs(16), color: colors.vermelhoAviso },
});
