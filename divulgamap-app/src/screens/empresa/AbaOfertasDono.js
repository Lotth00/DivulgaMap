import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import AbasPromocoes from '../../components/AbasPromocoes';
import BotaoGradiente from '../../components/BotaoGradiente';
import EstadoVazio from '../../components/EstadoVazio';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { dataHoraParaCampo, mensagemDeErro } from './util';

const ABAS = [
  { valor: 'ativa', rotulo: 'Ativas' },
  { valor: 'agendada', rotulo: 'Agendadas' },
  { valor: 'expirada', rotulo: 'Encerradas' },
];

const TIPOS = { normal: 'Normal', especial: 'Especial', relampago: 'Relâmpago' };

// Ofertas da empresa para o dono: ativas, agendadas e encerradas
export default function AbaOfertasDono({ empresaId, promocoes, navigation, onMudou }) {
  const [aba, setAba] = useState('ativa');
  const lista = promocoes.filter((p) => p.status === aba);

  function encerrar(promocao) {
    Alert.alert('Encerrar oferta', `"${promocao.titulo}" termina agora e some do app. Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/promocoes/${promocao.id_promocao}`);
            onMudou();
          } catch (erro) {
            Alert.alert('Não foi possível encerrar', mensagemDeErro(erro));
          }
        },
      },
    ]);
  }

  return (
    <View>
      <BotaoGradiente
        titulo="+ Nova oferta"
        onPress={() => navigation.navigate('PromocaoForm', { empresaId })}
        estilo={styles.nova}
      />
      <AbasPromocoes abas={ABAS} selecionada={aba} onSelecionar={setAba} />

      {!lista.length ? (
        <EstadoVazio icone="pricetag-outline" mensagem="Nenhuma oferta aqui." />
      ) : (
        lista.map((promocao) => {
          const editavel = promocao.status !== 'expirada';
          return (
            <TouchableOpacity
              key={promocao.id_promocao}
              style={styles.item}
              disabled={!editavel}
              onPress={() => navigation.navigate('PromocaoForm', { empresaId, promocao })}
              activeOpacity={0.7}
            >
              <View style={styles.textos}>
                <Text style={styles.titulo} numberOfLines={2}>{promocao.titulo}</Text>
                <Text style={styles.detalhe}>
                  {TIPOS[promocao.tipo]}
                  {promocao.desconto_percentual ? ` · ${Math.round(Number(promocao.desconto_percentual))}% OFF` : ''}
                  {promocao.condicao ? ` · ${promocao.condicao}` : ''}
                </Text>
                <Text style={styles.detalhe}>
                  {dataHoraParaCampo(promocao.data_inicio)} até {dataHoraParaCampo(promocao.data_fim)}
                </Text>
              </View>
              {editavel && (
                <TouchableOpacity onPress={() => encerrar(promocao)} style={styles.acao} accessibilityLabel="Encerrar oferta">
                  <Ionicons name="stop-circle-outline" size={24} color={colors.vermelhoAviso} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nova: { marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  textos: { flex: 1 },
  titulo: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
  acao: { paddingLeft: 12, paddingVertical: 4 },
});
