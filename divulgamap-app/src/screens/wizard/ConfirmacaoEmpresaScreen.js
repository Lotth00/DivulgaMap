import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import MapaPino from '../../components/wizard/MapaPino';
import Carregando from '../../components/Carregando';
import ErroComTentarDeNovo from '../../components/ErroComTentarDeNovo';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const NENHUMA = 'nenhuma';

function enderecoCompleto(item) {
  return [item.endereco, item.bairro, item.referencia].filter(Boolean).join(' - ');
}

// Linha de escolha com bolinha
function Opcao({ titulo, texto, escolhida, onPress, ultima }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.opcao, !ultima && styles.divisoria]} activeOpacity={0.6} accessibilityRole="radio" accessibilityState={{ selected: escolhida }}>
      <Ionicons name={escolhida ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.pretoTexto} />
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// Etapa 4 (Figma 621:1376): pino do endereço no mapa e empresas parecidas que já estão no app
export default function ConfirmacaoEmpresaScreen({ navigation }) {
  const { empresa } = useWizard();
  const [parecidas, setParecidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [escolha, setEscolha] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const conferir = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await api.post('/empresas/verificar-duplicidade', {
        nome_fantasia: empresa?.nome_fantasia,
        endereco: empresa?.endereco,
      });
      setParecidas(resposta.data.correspondencias);
    } catch (e) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.nome_fantasia, empresa?.endereco]);

  useEffect(() => {
    conferir();
  }, [conferir]);

  // Empresa já cadastrada: pede para ser responsável e descarta o rascunho
  async function reivindicar(existente) {
    setEnviando(true);
    setErro(null);
    try {
      await api.post(`/empresas/${existente.id_empresa}/reivindicar`, {
        mensagem: `Pedido feito pelo cadastro de empresa (rascunho "${empresa?.nome_fantasia}").`,
      });
      await api.delete(`/empresas/${empresa?.id_empresa}`).catch(() => {});
      Alert.alert('Pedido enviado', `A equipe do DivulgaMap vai conferir se você é responsável por "${existente.nome_fantasia}" e responde por e-mail.`);
      navigation.getParent()?.goBack();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function avancar() {
    if (!escolha || escolha === NENHUMA) {
      navigation.navigate('WizardContato');
      return;
    }
    const existente = parecidas.find((p) => p.id_empresa === escolha);
    Alert.alert(
      'Essa empresa já está no DivulgaMap',
      `Quer pedir para ser a pessoa responsável por "${existente.nome_fantasia}"? O seu cadastro novo será descartado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pedir', onPress: () => reivindicar(existente) },
      ]
    );
  }

  const temParecidas = parecidas.length > 0;

  return (
    <TelaWizard
      navigation={navigation}
      passo={4}
      titulo={temParecidas ? 'Esta é sua empresa?' : 'Confira o endereço'}
      descricao={
        temParecidas
          ? 'Encontramos empresas parecidas no DivulgaMap. Se uma delas é a sua, escolha para pedir a responsabilidade por ela.'
          : 'O pino mostra onde a sua empresa vai aparecer no mapa. Se estiver longe, volte e confira o endereço.'
      }
      erro={erro}
      podeAvancar={!carregando && (!temParecidas || !!escolha)}
      enviando={enviando}
      onAvancar={avancar}
    >
      <MapaPino latitude={empresa?.latitude} longitude={empresa?.longitude} />
      <Text style={styles.endereco}>{enderecoCompleto(empresa ?? {})}</Text>

      {carregando ? (
        <Carregando />
      ) : falhou ? (
        <ErroComTentarDeNovo mensagem="Não foi possível procurar empresas parecidas." onTentarDeNovo={conferir} />
      ) : temParecidas ? (
        <View style={styles.caixa}>
          {parecidas.map((p) => (
            <Opcao
              key={p.id_empresa}
              titulo={p.nome_fantasia}
              texto={enderecoCompleto(p)}
              escolhida={escolha === p.id_empresa}
              onPress={() => setEscolha(p.id_empresa)}
            />
          ))}
          <Opcao titulo="Nenhuma das opções" escolhida={escolha === NENHUMA} onPress={() => setEscolha(NENHUMA)} ultima />
        </View>
      ) : (
        <View style={styles.semParecidas}>
          <Ionicons name="checkmark-circle" size={22} color={colors.verdePreco} />
          <Text style={styles.textoSemParecidas}>Nenhuma empresa parecida no DivulgaMap.</Text>
        </View>
      )}
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  endereco: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: -8, marginBottom: 16 },
  caixa: { borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 16, backgroundColor: colors.fundoCaixa, paddingHorizontal: 18 },
  opcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  divisoria: { borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  textos: { flex: 1, marginLeft: 18 },
  titulo: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  texto: { ...tipografia.pequeno, color: colors.pretoTexto, marginTop: 2 },
  semParecidas: { flexDirection: 'row', alignItems: 'center' },
  textoSemParecidas: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 8 },
});
