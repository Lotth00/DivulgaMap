import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CaixaGradiente from '../CaixaGradiente';
import ImagemItem from '../ImagemItem';
import Estrelas from '../Estrelas';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { formatarNota } from './util';

// Cartão do topo: foto, nome, categoria, nota, descrição e o marcador de salvar
export default function CabecalhoEmpresa({ empresa, salvo, onSalvar }) {
  const categoriaPrincipal = empresa.categorias?.[0];

  return (
    <CaixaGradiente estiloConteudo={styles.caixa}>
      <View style={styles.linha}>
        <ImagemItem uri={empresa.fotos?.[0]?.url} categoria={categoriaPrincipal} largura={84} raio={42} />
        <View style={styles.textos}>
          <Text style={styles.nome} numberOfLines={2}>{empresa.nome_fantasia}</Text>
          {empresa.categorias?.length > 0 && (
            <Text style={styles.categoria} numberOfLines={1}>{empresa.categorias.join(', ')}</Text>
          )}
          {Number(empresa.total_avaliacoes) > 0 ? (
            <View style={styles.linhaNota}>
              <Text style={styles.nota}>{formatarNota(empresa.nota_media)}</Text>
              <Estrelas nota={empresa.nota_media} tamanho={16} />
              <Text style={styles.nota}>({empresa.total_avaliacoes})</Text>
            </View>
          ) : (
            <Text style={styles.semNota}>Sem avaliações ainda</Text>
          )}
        </View>
        {onSalvar && (
          <TouchableOpacity onPress={onSalvar} style={styles.salvar} accessibilityLabel={salvo ? 'Salvo nas suas listas' : 'Salvar'}>
            <Ionicons name={salvo ? 'bookmark' : 'bookmark-outline'} size={26} color={colors.pretoTexto} />
          </TouchableOpacity>
        )}
      </View>
      {empresa.descricao ? (
        <>
          <View style={styles.divisoria} />
          <Text style={styles.descricao} numberOfLines={3}>{empresa.descricao}</Text>
        </>
      ) : null}
    </CaixaGradiente>
  );
}

const styles = StyleSheet.create({
  caixa: { paddingVertical: 14 },
  linha: { flexDirection: 'row', alignItems: 'center' },
  textos: { flex: 1, marginLeft: 14 },
  salvar: { alignSelf: 'flex-start', padding: 4, marginRight: -6, marginTop: -4 },
  nome: { ...tipografia.tituloTela, fontSize: 22, color: colors.pretoTexto },
  categoria: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  linhaNota: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nota: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginHorizontal: 4 },
  semNota: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
  divisoria: { height: 1.5, backgroundColor: colors.divisoriaCartao, marginVertical: 10 },
  descricao: { ...tipografia.corpo, color: colors.pretoTexto },
});
