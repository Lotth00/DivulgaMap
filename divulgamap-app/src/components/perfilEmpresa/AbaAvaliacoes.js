import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Estrelas from '../Estrelas';
import EstadoVazio from '../EstadoVazio';
import CartaoAvaliacao from './CartaoAvaliacao';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { formatarNota } from './util';

// Aba de avaliações: resumo com barras por nota e a lista completa
export default function AbaAvaliacoes({ empresa, avaliacoes }) {
  if (!avaliacoes.length) {
    return <EstadoVazio icone="chatbubbles-outline" mensagem="Ainda não há avaliações para esta empresa." />;
  }

  const contagem = [5, 4, 3, 2, 1].map((nota) => ({
    nota,
    quantidade: avaliacoes.filter((a) => Number(a.nota) === nota).length,
  }));
  const maior = Math.max(...contagem.map((c) => c.quantidade), 1);

  return (
    <View>
      <View style={styles.resumo}>
        <View style={styles.barras}>
          {contagem.map(({ nota, quantidade }) => (
            <View key={nota} style={styles.linhaBarra}>
              <Text style={styles.numeroBarra}>{nota}</Text>
              <View style={styles.trilho}>
                <View style={[styles.preenchido, { width: `${(quantidade / maior) * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.media}>
          <Text style={styles.notaGrande}>{formatarNota(empresa.nota_media)}</Text>
          <Estrelas nota={empresa.nota_media} tamanho={14} />
          <Text style={styles.total}>{empresa.total_avaliacoes} avaliações</Text>
        </View>
      </View>

      {avaliacoes.map((avaliacao) => (
        <CartaoAvaliacao key={avaliacao.id_avaliacao} avaliacao={avaliacao} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  resumo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  barras: { flex: 1 },
  linhaBarra: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  numeroBarra: { ...tipografia.legenda, color: colors.textoSecundario, width: 14 },
  trilho: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.cinzaInput, overflow: 'hidden' },
  preenchido: { height: 8, borderRadius: 4, backgroundColor: colors.estrela },
  media: { alignItems: 'center', marginLeft: 20 },
  notaGrande: { ...tipografia.tituloTela, fontSize: 40, color: colors.pretoTexto },
  total: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
});
