import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import CampoWizard from '../../components/wizard/CampoWizard';
import BotaoGradiente from '../../components/BotaoGradiente';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const MAXIMO_CATEGORIAS = 3;

// Etapa 1 (Figma 618:1114): nome, categorias e aceite dos termos
export default function PerfilEmpresaWizardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { empresa, salvarPerfil } = useWizard();
  const [nome, setNome] = useState(empresa?.nome_fantasia ?? '');
  const [ramo, setRamo] = useState(empresa?.ramo ?? '');
  const [categorias, setCategorias] = useState(empresa?.categorias ?? []);
  const [todas, setTodas] = useState([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [aceitou, setAceitou] = useState(!!empresa);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const [falhouCategorias, setFalhouCategorias] = useState(false);

  function carregarCategorias() {
    setFalhouCategorias(false);
    api.get('/categorias')
      .then((r) => setTodas(r.data.map((c) => c.nome)))
      .catch(() => setFalhouCategorias(true));
  }

  useEffect(() => {
    carregarCategorias();
  }, []);

  function alternarCategoria(nomeCategoria) {
    setCategorias((atuais) => {
      if (atuais.includes(nomeCategoria)) return atuais.filter((c) => c !== nomeCategoria);
      if (atuais.length >= MAXIMO_CATEGORIAS) return atuais;
      return [...atuais, nomeCategoria];
    });
  }

  async function avancar() {
    setErro(null);
    setEnviando(true);
    try {
      await salvarPerfil(nome.trim(), categorias, ramo.trim());
      navigation.navigate('WizardTipo');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={1}
      titulo="Criando seu perfil de empresa"
      descricao="Comece com o nome que aparece na fachada e o ramo da sua empresa. Depois vêm o endereço, os contatos e a verificação."
      erro={erro}
      podeAvancar={!!nome.trim() && categorias.length > 0 && aceitou}
      enviando={enviando}
      onAvancar={avancar}
    >
      <CampoWizard placeholder="Nome da empresa" value={nome} onChangeText={setNome} maxLength={150} />
      <View style={styles.espaco} />
      <CampoWizard placeholder="O que é? Lanchonete? Salão de beleza?" value={ramo} onChangeText={setRamo} maxLength={60} />
      <Text style={styles.ajuda}>Aparece embaixo do nome da empresa</Text>
      <View style={styles.espaco} />

      <TouchableOpacity onPress={() => setEscolhendo(true)} activeOpacity={0.7} style={styles.seletor}>
        <Text style={[styles.textoSeletor, !categorias.length && styles.placeholder]} numberOfLines={1}>
          {categorias.length ? categorias.join(', ') : 'Categoria da empresa'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textoSecundario} />
      </TouchableOpacity>
      <Text style={styles.ajuda}>Você pode adicionar ou alterar depois</Text>

      <TouchableOpacity onPress={() => setAceitou((a) => !a)} style={styles.termos} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: aceitou }}>
        <View style={[styles.caixaMarcar, aceitou && styles.caixaMarcada]}>
          {aceitou && <Ionicons name="checkmark" size={13} color={colors.pretoTexto} />}
        </View>
        <Text style={styles.textoTermos}>
          Ao continuar, você concorda com o{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('TextoLegal', { tipo: 'termos' })}>Termo de Uso</Text>
          {' '}e{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('TextoLegal', { tipo: 'privacidade' })}>Política de Privacidade</Text>
        </Text>
      </TouchableOpacity>

      <Modal visible={escolhendo} transparent animationType="slide" onRequestClose={() => setEscolhendo(false)}>
        <Pressable style={styles.fundo} onPress={() => setEscolhendo(false)} />
        <View style={[styles.folha, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.tituloFolha}>Categoria da empresa</Text>
          <Text style={styles.ajudaFolha}>Escolha até {MAXIMO_CATEGORIAS}.</Text>
          {todas.length === 0 && (
            <TouchableOpacity onPress={carregarCategorias} disabled={!falhouCategorias} style={styles.semCategorias}>
              <Text style={styles.textoSemCategorias}>
                {falhouCategorias ? 'Não foi possível carregar as categorias. Toque para tentar de novo.' : 'Carregando as categorias…'}
              </Text>
            </TouchableOpacity>
          )}
          {todas.map((nomeCategoria) => {
            const marcada = categorias.includes(nomeCategoria);
            return (
              <TouchableOpacity key={nomeCategoria} onPress={() => alternarCategoria(nomeCategoria)} style={styles.opcao} activeOpacity={0.6}>
                <Text style={styles.textoOpcao}>{nomeCategoria}</Text>
                <Ionicons
                  name={marcada ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={marcada ? colors.verdePreco : colors.cinzaPlaceholder}
                />
              </TouchableOpacity>
            );
          })}
          <BotaoGradiente titulo="Pronto" onPress={() => setEscolhendo(false)} estilo={styles.pronto} />
        </View>
      </Modal>
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  espaco: { height: 12 },
  semCategorias: { paddingVertical: 16 },
  textoSemCategorias: { ...tipografia.corpoMedio, color: colors.textoSecundario, textAlign: 'center' },
  seletor: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.fundoCaixa,
    borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  textoSeletor: { ...tipografia.corpoMedio, color: colors.pretoTexto, flex: 1 },
  placeholder: { color: colors.cinzaPlaceholder },
  ajuda: { ...tipografia.pequeno, color: colors.textoSecundario, marginTop: 6, marginLeft: 10 },
  termos: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 22, paddingHorizontal: 12 },
  caixaMarcar: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.pretoTexto,
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1,
  },
  caixaMarcada: { backgroundColor: colors.menuFim },
  textoTermos: { ...tipografia.legenda, color: colors.textoSecundario, flex: 1 },
  link: { color: colors.azulLink, textDecorationLine: 'underline' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  tituloFolha: { ...tipografia.tituloTela, color: colors.pretoTexto },
  ajudaFolha: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 8 },
  opcao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  textoOpcao: { ...tipografia.corpo, color: colors.pretoTexto },
  pronto: { marginTop: 16 },
});
