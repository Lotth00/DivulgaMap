import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import tipografia, { fontes, fs } from '../../theme/tipografia';
import { NOMES_DIAS, intervalosDoDia, situacaoAgora, excecaoEmVigor } from './util';

const TEXTO_EXCECAO = { feriado: 'Feriado', fechado_temporario: 'Fechado temporariamente' };

// "2026-12-25" → "25/12"
function diaMes(data) {
  return data ? `${data.slice(8, 10)}/${data.slice(5, 7)}` : '';
}

// Horário de funcionamento: situação agora e, ao abrir, a semana inteira
export default function CartaoHorario({ empresa, abertoInicial = false }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const horarios = empresa.horarios ?? [];
  const situacao = situacaoAgora(empresa);
  const hoje = new Date().getDay();
  const excecao = horarios.find(excecaoEmVigor);

  return (
    <View style={styles.cartao}>
      <TouchableOpacity
        onPress={() => setAberto((a) => !a)}
        disabled={!horarios.length}
        style={styles.topo}
        activeOpacity={0.7}
        accessibilityState={{ expanded: aberto }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Horário de funcionamento</Text>
          <Text style={styles.situacao}>
            {situacao.aberto !== null && (
              <Text style={situacao.aberto ? styles.aberto : styles.fechado}>{situacao.aberto ? 'Aberto' : 'Fechado'}</Text>
            )}
            {situacao.aberto !== null && situacao.texto ? '  -  ' : ''}
            {situacao.texto}
          </Text>
        </View>
        {horarios.length > 0 && (
          <View style={styles.seta}>
            <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={20} color={colors.pretoTexto} />
          </View>
        )}
      </TouchableOpacity>

      {excecao && (
        <Text style={styles.excecao}>
          {TEXTO_EXCECAO[excecao.status] ?? 'Horário especial'}
          {excecao.data_fim ? ` até ${diaMes(excecao.data_fim)}` : ''}
        </Text>
      )}

      {aberto && (
        <View style={styles.semana}>
          {NOMES_DIAS.map((nome, dia) => (
            <View key={nome} style={styles.dia}>
              <Text style={[styles.nomeDia, dia === hoje && styles.hoje]}>{nome}</Text>
              <Text style={[styles.horas, dia === hoje && styles.hoje]}>{intervalosDoDia(horarios, dia) ?? 'Fechado'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.cinzaInput, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  topo: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(15), color: colors.textoTitulo },
  situacao: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginTop: 2 },
  aberto: { color: colors.verdePreco },
  fechado: { color: colors.vermelhoFechado },
  seta: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.fundoTela, alignItems: 'center', justifyContent: 'center' },
  excecao: { ...tipografia.legenda, color: colors.vermelhoAviso, marginTop: 6 },
  semana: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.bordaClara, paddingTop: 8 },
  dia: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  nomeDia: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  horas: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  hoje: { fontFamily: fontes.seminegrito, includeFontPadding: false },
});
