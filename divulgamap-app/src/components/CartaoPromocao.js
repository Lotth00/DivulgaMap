import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import ImagemItem from './ImagemItem';
import colors from '../theme/colors';
import tipografia, { fs } from '../theme/tipografia';

// Destaque amarelo: "20% de desconto" ou a própria condição
function textoDestaque(oferta) {
  if (oferta.desconto_percentual) return `${Math.round(Number(oferta.desconto_percentual))}% de desconto`;
  return oferta.condicao || null;
}

// Cartão horizontal das ofertas especiais e relâmpago
export default function CartaoPromocao({ oferta, onPress, largura = 290 }) {
  const destaque = textoDestaque(oferta);
  // Com desconto, a condição vira o texto de apoio; sem desconto, ela já é o destaque
  const apoio = oferta.desconto_percentual ? oferta.condicao || oferta.descricao || oferta.titulo : oferta.titulo;

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8} style={[styles.cartao, { width: largura }]}>
      <ImagemItem
        uri={oferta.foto_produto || oferta.foto_empresa}
        categoria={oferta.categoria}
        largura={92}
        altura={128}
        raio={6}
      />
      <View style={styles.textos}>
        <Text style={styles.empresa} numberOfLines={1}>{oferta.empresa_nome}</Text>
        <Text style={styles.apoio} numberOfLines={3}>{apoio}</Text>
        {destaque && (
          <View style={styles.destaque}>
            <Text style={styles.textoDestaque} numberOfLines={1}>{destaque}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row', backgroundColor: colors.brancoFundo, borderRadius: 8, padding: 8, marginRight: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  textos: { flex: 1, marginLeft: 10 },
  empresa: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto },
  apoio: { ...tipografia.legenda, color: colors.pretoTexto, marginTop: 2, marginBottom: 8, flexShrink: 1 },
  destaque: { alignSelf: 'flex-start', backgroundColor: colors.seloDesconto, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, marginTop: 'auto', maxWidth: '100%' },
  textoDestaque: { ...tipografia.corpoMedio, color: colors.pretoTexto },
});
