import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import BotaoGradiente from '../../components/BotaoGradiente';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { STATUS_EMPRESA } from './util';

const TEXTOS = {
  rascunho: 'O cadastro desta empresa ainda não foi enviado. Continue de onde parou para mandar para a aprovação.',
  pendente_aprovacao: 'Recebemos o cadastro. A equipe do DivulgaMap está analisando e, quando aprovar, a empresa aparece no mapa e você poderá cuidar dos produtos e das ofertas.',
  rejeitada: 'O cadastro não foi aprovado. Veja o motivo abaixo, corrija o que for preciso e envie de novo.',
};

// Situação de uma empresa ainda não aprovada
export default function StatusEmpresaScreen({ route, navigation }) {
  const { empresa } = route.params;
  const situacao = STATUS_EMPRESA[empresa.status] ?? { rotulo: empresa.status, icone: 'help-circle-outline' };
  const [abrindo, setAbrindo] = useState(false);

  // O wizard continua pelo rascunho completo
  async function continuarCadastro() {
    setAbrindo(true);
    try {
      const resposta = await api.get('/empresas/rascunho-atual');
      const rascunho = resposta.data.empresa;
      if (rascunho?.id_empresa === empresa.id_empresa) {
        navigation.navigate('CadastroEmpresa', { rascunho });
      } else {
        Alert.alert('Não foi possível abrir', 'Este não é o cadastro mais recente. Termine o mais recente primeiro.');
      }
    } catch (erro) {
      Alert.alert('Não foi possível abrir', 'Confira sua conexão e tente de novo.');
    } finally {
      setAbrindo(false);
    }
  }

  let rodape = null;
  if (empresa.status === 'rascunho') {
    rodape = <BotaoGradiente titulo="Continuar cadastro" onPress={continuarCadastro} carregando={abrindo} />;
  } else if (empresa.status === 'rejeitada') {
    rodape = (
      <BotaoGradiente
        titulo="Corrigir e reenviar"
        onPress={() => navigation.navigate('EditarEmpresa', { id: empresa.id_empresa, reenviar: true })}
      />
    );
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo={empresa.nome_fantasia}
      rodape={rodape}
    >
      <View style={styles.selo}>
        <Ionicons name={situacao.icone} size={22} color={empresa.status === 'rejeitada' ? colors.vermelhoAviso : colors.pretoTexto} />
        <Text style={styles.textoSelo}>{situacao.rotulo}</Text>
      </View>
      <Text style={styles.texto}>{TEXTOS[empresa.status] ?? ''}</Text>
      {empresa.status === 'rejeitada' && (
        <View style={styles.caixaMotivo}>
          <Text style={styles.rotuloMotivo}>Motivo</Text>
          <Text style={styles.texto}>{empresa.motivo_rejeicao || 'Sem motivo informado.'}</Text>
        </View>
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.menuInicio, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  textoSelo: { ...tipografia.corpo, color: colors.pretoTexto, marginLeft: 8 },
  texto: { ...tipografia.corpo, color: colors.pretoTexto },
  caixaMotivo: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, padding: 14, marginTop: 16 },
  rotuloMotivo: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 4 },
});
