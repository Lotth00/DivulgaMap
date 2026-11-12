import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import ImagemItem from './ImagemItem';
import Estrelas from './Estrelas';
import colors from '../theme/colors';
import tipografia, { fontes, fs } from '../theme/tipografia';

// "120" + "hora" → "R$120,00/hora"
function formatarPreco(valor, unidade) {
  if (valor === null || valor === undefined) return null;
  const texto = `R$${Number(valor).toFixed(2).replace('.', ',')}`;
  return unidade && unidade !== 'un' ? `${texto}/${unidade}` : texto;
}

// Cartão de "Serviços próximos de você" (um item de GET /produtos/servicos-proximos).
// Varia conforme a cobrança: com desconto, preço por hora/sessão, sob consulta ou orçamento gratuito
export const ALTURA_CARTAO_SERVICO = 258;

export default function CartaoServico({ servico, onPress, largura = 165 }) {
  const comPreco = servico.forma_cobranca === 'preco';
  const preco = comPreco ? formatarPreco(servico.preco_promocional ?? servico.preco, servico.unidade_medida) : null;
  const precoAntigo = comPreco && servico.preco_promocional ? formatarPreco(servico.preco) : null;
  const desconto = servico.desconto_percentual ? `${Math.round(Number(servico.desconto_percentual))}% OFF` : null;
  const temNota = Number(servico.total_avaliacoes) > 0;
  // Sem descrição nem condição: onde fica (bairro e distância) ou a categoria
  const distancia = servico.distancia_km !== null && servico.distancia_km !== undefined
    ? `a ${Number(servico.distancia_km).toFixed(1).replace('.', ',')} km`
    : null;
  const texto = servico.condicao || servico.descricao
    || [servico.bairro, distancia].filter(Boolean).join(' · ')
    || servico.categoria;

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8} style={[styles.cartao, { width: largura, height: ALTURA_CARTAO_SERVICO }]}>
      <View>
        <ImagemItem uri={servico.foto} categoria={servico.categoria} largura={largura - 16} altura={110} raio={4} />
        {desconto && (
          <View style={styles.selo}>
            <Text style={styles.textoSelo}>{desconto}</Text>
          </View>
        )}
      </View>

      <Text style={styles.nome} numberOfLines={1}>{servico.nome}</Text>
      <Text style={styles.empresa} numberOfLines={1}>{servico.empresa_nome}</Text>

      <View style={styles.blocoPreco}>
        {precoAntigo && <Text style={styles.riscado}>{precoAntigo}</Text>}
        {preco && <Text style={styles.preco} numberOfLines={1} adjustsFontSizeToFit>{preco}</Text>}
        {servico.forma_cobranca === 'sob_consulta' && <Text style={styles.gratuito}>Valor sob consulta</Text>}
        {servico.forma_cobranca === 'orcamento_gratuito' && (
          <>
            <Text style={styles.consulta}>Valor sob consulta</Text>
            <Text style={styles.gratuito}>Orçamento gratuito</Text>
          </>
        )}
      </View>

      {temNota ? (
        <View style={styles.linhaNota}>
          <Estrelas nota={servico.nota_media} tamanho={13} />
          <Text style={styles.nota}>{Number(servico.nota_media).toFixed(1).replace('.', ',')} ({servico.total_avaliacoes})</Text>
        </View>
      ) : (
        <View style={styles.seloNovo}>
          <Text style={styles.textoNovo}>Novo no app</Text>
        </View>
      )}
      {texto ? <Text style={styles.texto} numberOfLines={2}>{texto}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.brancoFundo, borderRadius: 8, padding: 8, marginRight: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  selo: { position: 'absolute', right: 4, bottom: 4, backgroundColor: colors.seloDesconto, borderRadius: 4, paddingHorizontal: 6 },
  textoSelo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(12), color: colors.pretoTexto },
  nome: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginTop: 6 },
  empresa: { ...tipografia.legenda, color: colors.textoSecundario },
  blocoPreco: { marginTop: 4 },
  riscado: { ...tipografia.legenda, color: colors.cinzaPlaceholder, textDecorationLine: 'line-through' },
  preco: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(18), color: colors.verdePreco },
  consulta: { ...tipografia.legenda, color: colors.textoSecundario },
  gratuito: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(14), color: colors.verdePreco },
  linhaNota: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  seloNovo: { alignSelf: 'flex-start', backgroundColor: colors.menuInicio, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginTop: 4 },
  textoNovo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: fs(11), color: colors.pretoTexto },
  nota: { ...tipografia.pequeno, fontSize: fs(11), color: colors.textoSecundario, marginLeft: 4 },
  texto: { ...tipografia.legenda, color: colors.pretoTexto, marginTop: 4 },
});
