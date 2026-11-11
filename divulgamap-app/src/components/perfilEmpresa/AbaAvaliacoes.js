import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Estrelas from '../Estrelas';
import EstadoVazio from '../EstadoVazio';
import CartaoAvaliacao from './CartaoAvaliacao';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { formatarNota } from './util';

// Aba de avaliações: resumo com barras por nota e a lista completa
export default function AbaAvaliacoes({ empresa, avaliacoes, minhaAvaliacao, onAvaliar }) {
  if (!avaliacoes.length) {
    return (
      <EstadoVazio
        icone="chatbubbles-outline"
        mensagem="Ainda não há avaliações para esta empresa."
        textoAcao="Avaliar esta empresa"
        onAcao={onAvaliar}
      />
    );
  }

  // A avaliação da própria pessoa aparece primeiro
  const ordenadas = minhaAvaliacao
    ? [minhaAvaliacao, ...avaliacoes.filter((a) => a.id_avaliacao !== minhaAvaliacao.id_avaliacao)]
    : avaliacoes;

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

      <TouchableOpacity onPress={onAvaliar} style={styles.botaoAvaliar} activeOpacity={0.7}>
        <Ionicons name={minhaAvaliacao ? 'create-outline' : 'star-outline'} size={18} color={colors.pretoTexto} />
        <Text style={styles.textoAvaliar}>{minhaAvaliacao ? 'Editar sua avaliação' : 'Avaliar esta empresa'}</Text>
      </TouchableOpacity>

      {ordenadas.map((avaliacao) => (
        <CartaoAvaliacao key={avaliacao.id_avaliacao} avaliacao={avaliacao} minha={avaliacao === minhaAvaliacao} />
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
  botaoAvaliar: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16,
    borderWidth: 1, borderColor: colors.bordaClara, backgroundColor: colors.brancoFundo, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7,
  },
  textoAvaliar: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 6 },
});
