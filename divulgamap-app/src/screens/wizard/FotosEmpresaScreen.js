import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { enviarImagem } from '../../services/upload';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const MAXIMO = 5;
const EXEMPLOS = [require('../../../assets/images/exemplo-foto-1.jpg'), require('../../../assets/images/exemplo-foto-2.jpg')];

// Etapa 10 (Figma 661:1231): até 5 fotos com prévia; sobem para o Cloudinary ao avançar
export default function FotosEmpresaScreen({ navigation }) {
  const { empresa } = useWizard();
  const [fotos, setFotos] = useState([]); // { uri, url } — url preenchida depois de enviada
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function escolher() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher as imagens da empresa.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAXIMO - fotos.length,
      quality: 0.7,
    });
    if (resultado.canceled) return;
    const novas = resultado.assets.map((a) => ({ uri: a.uri, tipo: a.mimeType ?? null, url: null }));
    setFotos((atual) => [...atual, ...novas].slice(0, MAXIMO));
  }

  function remover(uri) {
    setFotos((atual) => atual.filter((f) => f.uri !== uri));
  }

  async function avancar() {
    setErro(null);
    setEnviando(true);
    try {
      // Só as que ainda não subiram (voltar e avançar de novo não duplica)
      const atualizadas = [...fotos];
      for (let i = 0; i < atualizadas.length; i += 1) {
        if (atualizadas[i].url) continue;
        const url = await enviarImagem(atualizadas[i].uri, `divulgamap/empresas/${empresa.id_empresa}`, atualizadas[i].tipo);
        await api.post(`/empresas/${empresa.id_empresa}/fotos`, { url, ordem: i });
        atualizadas[i] = { ...atualizadas[i], url };
        setFotos([...atualizadas]);
      }
      navigation.navigate('WizardPlanilha');
    } catch (e) {
      setErro(e.response ? mensagemDeErro(e) : e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={10}
      titulo="Fotos da empresa"
      descricao={`Escolha até ${MAXIMO} fotos da fachada, do ambiente ou dos produtos. Elas aparecem no perfil da empresa. Se preferir, adicione depois.`}
      erro={erro}
      enviando={enviando}
      onAvancar={avancar}
    >
      {fotos.length < MAXIMO && (
        <TouchableOpacity style={styles.adicionar} onPress={escolher} activeOpacity={0.7} disabled={enviando}>
          <Ionicons name="camera-outline" size={20} color={colors.pretoTexto} />
          <Text style={styles.textoAdicionar}>Adicionar fotos ({fotos.length}/{MAXIMO})</Text>
        </TouchableOpacity>
      )}
      <View style={styles.grade}>
        {fotos.length === 0 &&
          EXEMPLOS.map((imagem, i) => (
            <View key={i} style={styles.foto}>
              <Image source={imagem} style={styles.imagem} />
              <View style={styles.selo}>
                <Text style={styles.textoSelo}>Exemplo</Text>
              </View>
            </View>
          ))}
        {fotos.map((f) => (
          <View key={f.uri} style={styles.foto}>
            <Image source={{ uri: f.uri }} style={styles.imagem} />
            {!f.url && !enviando && (
              <TouchableOpacity style={styles.remover} onPress={() => remover(f.uri)} accessibilityLabel="Remover foto">
                <Ionicons name="close" size={18} color={colors.pretoTexto} />
              </TouchableOpacity>
            )}
            {f.url && (
              <View style={styles.selo}>
                <Text style={styles.textoSelo}>Enviada</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  adicionar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 12,
    borderWidth: 2, borderColor: colors.gradienteTopo, borderRadius: 12, backgroundColor: colors.abaInicio,
  },
  textoAdicionar: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  foto: { width: '49%', aspectRatio: 1.2, borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  imagem: { width: '100%', height: '100%' },
  remover: {
    position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.fundoCaixa, alignItems: 'center', justifyContent: 'center',
  },
  selo: { position: 'absolute', left: 0, bottom: 8, backgroundColor: colors.gradienteBase, paddingHorizontal: 8, paddingVertical: 2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  textoSelo: { ...tipografia.legenda, color: colors.pretoTexto },
});
