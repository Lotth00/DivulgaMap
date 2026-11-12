import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import ImagemItem from './ImagemItem';
import colors from '../theme/colors';
import tipografia, { fontes, fs } from '../theme/tipografia';

// Cartão horizontal de empresa ("Novos negócios no app" e resultados da busca), com as fotos do ambiente
export default function CartaoEmpresa({ empresa, onPress, largura = 300 }) {
  const categoriaPrincipal = empresa.categorias?.split(', ')[0];
  const fotos = (empresa.fotos ?? []).slice(0, 2);

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8} style={[styles.cartao, largura && { width: largura }]}>
      <View style={styles.fotos}>
        {fotos.length === 2 ? (
          <>
            <ImagemItem uri={fotos[0]} categoria={categoriaPrincipal} largura={55} altura={110} raio={0} estilo={styles.fotoEsquerda} />
            <ImagemItem uri={fotos[1]} categoria={categoriaPrincipal} largura={55} altura={110} raio={0} estilo={styles.fotoDireita} />
          </>
        ) : (
          <ImagemItem uri={fotos[0]} categoria={categoriaPrincipal} largura={110} altura={110} raio={6} />
        )}
      </View>
      <View style={styles.textos}>
        <Text style={styles.nome} numberOfLines={1}>{empresa.nome_fantasia}</Text>
        <Text style={styles.descricao} numberOfLines={3}>
          {empresa.descricao || [empresa.ramo || empresa.categorias, empresa.bairro].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.saibaMais}>Saiba mais</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row', backgroundColor: colors.brancoFundo, borderRadius: 8, padding: 8, marginRight: 12, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  fotos: { flexDirection: 'row' },
  fotoEsquerda: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  fotoDireita: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  textos: { flex: 1, marginLeft: 12 },
  nome: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto },
  descricao: { ...tipografia.legenda, color: colors.pretoTexto, marginTop: 2, marginBottom: 6, flexShrink: 1 },
  saibaMais: { fontFamily: fontes.seminegrito, includeFontPadding: false, fontSize: fs(14), color: colors.pretoTexto, alignSelf: 'flex-end', marginTop: 'auto' },
});
