import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import ImagemItem from './ImagemItem';
import colors from '../theme/colors';
import tipografia, { fontes, fs } from '../theme/tipografia';

// "5.5" → "R$5,50" (com "/Kg" quando a unidade não é "un")
function formatarPreco(valor, unidade) {
  if (valor === null || valor === undefined) return null;
  const texto = `R$${Number(valor).toFixed(2).replace('.', ',')}`;
  return unidade && unidade !== 'un' ? `${texto}/${unidade.charAt(0).toUpperCase()}${unidade.slice(1)}` : texto;
}

// Texto do selo: desconto ("20% OFF") ou condição ("Leve 3 pague 2")
function textoDoSelo(oferta) {
  if (oferta.desconto_percentual) return `${Math.round(Number(oferta.desconto_percentual))}% OFF`;
  return oferta.condicao || null;
}

// Cartão de oferta do Início (um item de GET /promocoes/ativas)
export default function CartaoOferta({ oferta, onPress, largura = 165 }) {
  const precoPromocional = formatarPreco(oferta.preco_promocional, oferta.unidade_medida);
  const precoOriginal = formatarPreco(oferta.preco_original);
  const selo = textoDoSelo(oferta);

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8} style={[styles.cartao, { width: largura }]}>
      <ImagemItem
        uri={oferta.foto_produto || (!oferta.produto_id ? oferta.foto_empresa : null)}
        categoria={oferta.categoria}
        largura={largura - 16}
        altura={120}
        raio={6}
        ajuste="contain"
        estilo={styles.imagem}
      />
      <Text style={styles.empresa} numberOfLines={1}>{oferta.empresa_nome}</Text>
      <Text style={styles.descricao} numberOfLines={1}>{oferta.produto_nome || oferta.titulo}</Text>

      {precoPromocional ? (
        <View style={styles.linhaPreco}>
          <Text style={styles.preco} numberOfLines={1}>{precoPromocional}</Text>
          {precoOriginal && <Text style={styles.precoRiscado}>{precoOriginal}</Text>}
        </View>
      ) : precoOriginal ? (
        <Text style={styles.preco}>{precoOriginal}</Text>
      ) : null}

      {selo && (
        <View style={styles.selo}>
          <Text style={styles.textoSelo} numberOfLines={1}>{selo}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.brancoFundo, borderRadius: 8, padding: 8, marginRight: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  imagem: { alignSelf: 'center', backgroundColor: colors.brancoFundo },
  empresa: { ...tipografia.corpoMedio, fontSize: fs(14), color: colors.pretoTexto, marginTop: 8 },
  descricao: { ...tipografia.legenda, color: colors.textoSecundario },
  linhaPreco: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  preco: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(18), color: colors.verdePreco, marginRight: 5, flexShrink: 1 },
  precoRiscado: { ...tipografia.legenda, color: colors.cinzaPlaceholder, textDecorationLine: 'line-through' },
  selo: { alignSelf: 'flex-start', backgroundColor: colors.seloDesconto, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginTop: 4, maxWidth: '100%' },
  textoSelo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(13), color: colors.pretoTexto },
});
