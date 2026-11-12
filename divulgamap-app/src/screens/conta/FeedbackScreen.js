import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import BotaoGradiente from '../../components/BotaoGradiente';
import { escolherEEnviarFoto, mensagemDeErro } from '../empresa/util';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const MAXIMO_IMAGENS = 3;
const TAMANHO_MAXIMO = 2000;
const TIPOS = {
  problema: {
    titulo: 'Relatar problema',
    placeholder: 'Escreva resumidamente o problema ou o que não está funcionando',
    agradecimento: null,
  },
  sugestao: {
    titulo: 'Fazer uma sugestão',
    placeholder: 'Escreva resumidamente sobre a sugestão compartilhada',
    agradecimento: 'Agradecemos antecipadamente pela sugestão!',
  },
};

// Relatar problema ou Fazer sugestão (Figma 606:1670 e 606:1722): texto e até 3 imagens, enviados por e-mail
export default function FeedbackScreen({ route, navigation }) {
  const tipo = route.params?.tipo === 'sugestao' ? 'sugestao' : 'problema';
  const config = TIPOS[tipo];
  const [mensagem, setMensagem] = useState('');
  const [imagens, setImagens] = useState([]);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function adicionarImagem() {
    setEnviandoImagem(true);
    try {
      const url = await escolherEEnviarFoto('divulgamap/feedback');
      if (url) setImagens((atual) => [...atual, url]);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a imagem', erro.message);
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function enviar() {
    setEnviando(true);
    try {
      await api.post('/feedback', { tipo, mensagem: mensagem.trim(), imagens });
      Alert.alert('Mensagem enviada', 'Obrigado! A equipe do DivulgaMap vai ler e, se precisar, responde no seu e-mail.');
      navigation.goBack();
    } catch (erro) {
      Alert.alert('Não foi possível enviar', mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo={config.titulo}
      rodape={(
        <>
          {imagens.length < MAXIMO_IMAGENS && (
            <TouchableOpacity onPress={adicionarImagem} disabled={enviandoImagem} style={styles.botaoImagem} activeOpacity={0.85}>
              {enviandoImagem ? <ActivityIndicator color={colors.brancoFundo} /> : (
                <>
                  <Ionicons name="camera-outline" size={20} color={colors.brancoFundo} />
                  <Text style={styles.textoBotaoImagem}>Adicionar imagem</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <BotaoGradiente titulo="Enviar" onPress={enviar} carregando={enviando} desativado={!mensagem.trim() || enviandoImagem} />
        </>
      )}
    >
      <TextInput
        value={mensagem}
        onChangeText={setMensagem}
        placeholder={config.placeholder}
        placeholderTextColor={colors.textoSecundario}
        multiline
        maxLength={TAMANHO_MAXIMO}
        textAlignVertical="top"
        style={styles.campo}
        autoFocus
      />
      {config.agradecimento ? <Text style={styles.agradecimento}>{config.agradecimento}</Text> : null}
      <Text style={styles.contador}>{mensagem.length}/{TAMANHO_MAXIMO}</Text>

      {imagens.length > 0 && (
        <View style={styles.imagens}>
          {imagens.map((url) => (
            <View key={url} style={styles.imagem}>
              <Image source={{ uri: url }} style={styles.preenche} />
              <TouchableOpacity
                onPress={() => setImagens((atual) => atual.filter((i) => i !== url))}
                style={styles.remover}
                accessibilityLabel="Remover imagem"
              >
                <Ionicons name="close" size={14} color={colors.brancoFundo} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  campo: { ...tipografia.corpo, color: colors.pretoTexto, minHeight: 180, padding: 0 },
  agradecimento: { ...tipografia.corpo, color: colors.textoSecundario, marginTop: 12 },
  contador: { ...tipografia.pequeno, color: colors.textoSecundario, alignSelf: 'flex-end', marginTop: 6 },
  imagens: { flexDirection: 'row', marginTop: 14 },
  imagem: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', marginRight: 10, backgroundColor: colors.cinzaInput },
  preenche: { width: '100%', height: '100%' },
  remover: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  botaoImagem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pretoTexto,
    borderRadius: 24, paddingVertical: 12, marginBottom: 10,
  },
  textoBotaoImagem: { ...tipografia.botao, color: colors.brancoFundo, marginLeft: 8 },
});
