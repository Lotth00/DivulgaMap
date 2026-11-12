import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TelaConta from '../../components/conta/TelaConta';
import CampoTexto from '../../components/CampoTexto';
import BotaoGradiente from '../../components/BotaoGradiente';
import { useDadosUsuario, atualizarDados } from '../../components/conta/util';
import { escolherEEnviarFoto } from '../empresa/util';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const LIMITE_BIO = 200;
const TAMANHO_FOTO = 120;

// Editar perfil: foto e biografia (Figma 574:1073); o nome muda em Gerenciar sua Conta
export default function EditarPerfilScreen({ navigation }) {
  const { dados, carregando, falhou, carregar } = useDadosUsuario(true);
  const { atualizarUsuario } = useAuth();
  const [foto, setFoto] = useState(undefined);
  const [bio, setBio] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Começa com os dados atuais (uma vez)
  useEffect(() => {
    if (dados && bio === null) {
      setBio(dados.biografia ?? '');
      setFoto(dados.foto_perfil_url ?? null);
    }
  }, [dados, bio]);

  const fotoMudou = foto !== undefined && foto !== (dados?.foto_perfil_url ?? null);
  const bioMudou = bio !== null && bio.trim() !== (dados?.biografia ?? '');

  async function trocarFoto() {
    setEnviandoFoto(true);
    try {
      const url = await escolherEEnviarFoto('divulgamap/usuarios', true);
      if (url) setFoto(url);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a foto', erro.message);
    } finally {
      setEnviandoFoto(false);
    }
  }

  function removerFoto() {
    Alert.alert('Remover foto', 'Seu perfil volta a mostrar o ícone padrão.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setFoto(null) },
    ]);
  }

  async function salvar() {
    const campos = {};
    if (fotoMudou) campos.foto_perfil_url = foto;
    if (bioMudou) campos.biografia = bio.trim() || null;
    if (!Object.keys(campos).length) {
      navigation.goBack();
      return;
    }
    setSalvando(true);
    const novos = await atualizarDados(campos);
    setSalvando(false);
    if (!novos) return;
    await atualizarUsuario({ foto_perfil_url: novos.foto_perfil_url });
    navigation.goBack();
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Editar perfil"
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
      rodape={dados ? <BotaoGradiente titulo="Salvar" onPress={salvar} carregando={salvando} desativado={enviandoFoto} /> : null}
    >
      <TouchableOpacity onPress={trocarFoto} disabled={enviandoFoto} style={styles.foto} activeOpacity={0.85} accessibilityLabel="Trocar foto">
        {foto ? (
          <Image source={{ uri: foto }} style={styles.imagem} />
        ) : (
          <View style={[styles.imagem, styles.semFoto]}>
            <Ionicons name="person" size={TAMANHO_FOTO * 0.45} color={colors.cinzaPlaceholder} />
          </View>
        )}
        {enviandoFoto
          ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.pretoTexto} />
          : (
            <View style={styles.camera}>
              <Ionicons name="camera-outline" size={18} color={colors.pretoTexto} />
            </View>
          )}
      </TouchableOpacity>
      {foto ? (
        <TouchableOpacity onPress={removerFoto} style={styles.remover}>
          <Text style={styles.textoRemover}>Remover foto</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.nome}>{dados?.nome}</Text>
      <Text style={styles.ajuda}>
        Sua foto e sua biografia aparecem no seu perfil e junto das avaliações que você faz.
      </Text>

      <CampoTexto
        valor={bio ?? ''}
        onMudar={setBio}
        placeholder="Biografia"
        limite={LIMITE_BIO}
        multilinha
        estilo={styles.campo}
      />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  foto: { alignSelf: 'center', marginTop: 12 },
  imagem: { width: TAMANHO_FOTO, height: TAMANHO_FOTO, borderRadius: TAMANHO_FOTO / 2, backgroundColor: colors.cinzaInput },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute', right: -2, bottom: 4, width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.gradienteBase, alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  remover: { alignSelf: 'center', marginTop: 8 },
  textoRemover: { ...tipografia.legenda, color: colors.vermelhoAviso },
  nome: { ...tipografia.tituloTela, fontSize: fs(20), color: colors.pretoTexto, textAlign: 'center', marginTop: 14 },
  ajuda: { ...tipografia.corpoMedio, color: colors.pretoTexto, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  campo: { marginTop: 4 },
});
