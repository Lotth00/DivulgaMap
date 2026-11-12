import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CaixaGradiente from '../CaixaGradiente';
import ImagemItem from '../ImagemItem';
import Estrelas from '../Estrelas';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { formatarNota } from './util';

// Cartão do topo: foto de perfil, nome, categoria, nota e descrição
export default function CabecalhoEmpresa({ empresa }) {
  const categoriaPrincipal = empresa.categorias?.[0];

  return (
    <CaixaGradiente estiloConteudo={styles.caixa}>
      <View style={styles.linha}>
        <ImagemItem uri={empresa.foto_perfil_url} categoria={categoriaPrincipal} largura={84} raio={42} />
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
  nome: { ...tipografia.tituloTela, fontSize: fs(18), color: colors.pretoTexto },
  categoria: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  linhaNota: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nota: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginHorizontal: 4 },
  semNota: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2 },
  divisoria: { height: 1.5, backgroundColor: colors.divisoriaCartao, marginVertical: 10 },
  descricao: { ...tipografia.corpoMedio, color: colors.pretoTexto },
});
