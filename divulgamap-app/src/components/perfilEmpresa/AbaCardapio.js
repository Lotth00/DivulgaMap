import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ImagemItem from '../ImagemItem';
import TituloSecao from '../TituloSecao';
import EstadoVazio from '../EstadoVazio';
import colors from '../../theme/colors';
import tipografia, { fontes } from '../../theme/tipografia';
import { formatarPreco } from './util';

// Produtos agrupados pela categoria (sem categoria vão para "Outros")
function agrupar(produtos) {
  const grupos = new Map();
  produtos.forEach((produto) => {
    const nome = produto.categoria_nome || 'Outros';
    if (!grupos.has(nome)) grupos.set(nome, []);
    grupos.get(nome).push(produto);
  });
  return [...grupos.entries()].sort(([a], [b]) => (a === 'Outros') - (b === 'Outros') || a.localeCompare(b));
}

// Aba de produtos e serviços, com o preço da oferta quando houver
export default function AbaCardapio({ produtos, ofertas, categoriaEmpresa, rotulo, produtoEmDestaque, onAbrirOferta }) {
  if (!produtos.length) {
    return <EstadoVazio icone="restaurant-outline" mensagem={`Esta empresa ainda não cadastrou itens em "${rotulo}".`} />;
  }

  // Oferta ativa de cada produto (a primeira que aparecer)
  const ofertaDoProduto = new Map();
  ofertas.forEach((oferta) => {
    if (oferta.produto_id && !ofertaDoProduto.has(oferta.produto_id)) ofertaDoProduto.set(oferta.produto_id, oferta);
  });

  return (
    <View>
      {agrupar(produtos).map(([grupo, itens]) => (
        <View key={grupo} style={styles.grupo}>
          <TituloSecao titulo={grupo} linha="lado" />
          {itens.map((produto) => {
            const oferta = ofertaDoProduto.get(produto.id_produto);
            const destaque = produto.id_produto === produtoEmDestaque;
            return (
              <TouchableOpacity
                key={produto.id_produto}
                style={[styles.item, destaque && styles.itemDestaque]}
                onPress={oferta ? () => onAbrirOferta(oferta) : undefined}
                disabled={!oferta}
                activeOpacity={0.7}
              >
                <ImagemItem uri={produto.foto_url} categoria={produto.categoria_nome || categoriaEmpresa} largura={72} raio={10} />
                <View style={styles.textos}>
                  <Text style={styles.nome} numberOfLines={2}>{produto.nome}</Text>
                  {produto.descricao ? <Text style={styles.descricao} numberOfLines={2}>{produto.descricao}</Text> : null}
                  {oferta?.preco_promocional ? (
                    <View style={styles.linhaPreco}>
                      <Text style={styles.preco}>{formatarPreco(oferta.preco_promocional, produto.unidade_medida)}</Text>
                      <Text style={styles.riscado}>{formatarPreco(produto.preco, produto.unidade_medida)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.precoNormal}>{formatarPreco(produto.preco, produto.unidade_medida)}</Text>
                  )}
                  {oferta && (
                    <View style={styles.selo}>
                      <Text style={styles.textoSelo} numberOfLines={1}>
                        {oferta.desconto_percentual ? `${Math.round(Number(oferta.desconto_percentual))}% OFF` : oferta.condicao}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { marginBottom: 18 },
  item: { flexDirection: 'row', paddingVertical: 8, borderRadius: 12 },
  itemDestaque: { backgroundColor: colors.padraoFim, paddingHorizontal: 8, marginHorizontal: -8 },
  textos: { flex: 1, marginLeft: 12 },
  nome: { ...tipografia.corpo, color: colors.pretoTexto },
  descricao: { ...tipografia.legenda, color: colors.textoSecundario },
  linhaPreco: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  preco: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 16, color: colors.verdePreco, marginRight: 6 },
  riscado: { ...tipografia.legenda, color: colors.cinzaPlaceholder, textDecorationLine: 'line-through' },
  precoNormal: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 16, color: colors.pretoTexto, marginTop: 2 },
  selo: { alignSelf: 'flex-start', backgroundColor: colors.seloDesconto, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, marginTop: 4 },
  textoSelo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 12, color: colors.pretoTexto },
});
