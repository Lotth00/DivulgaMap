import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import EstadoVazio from '../../components/EstadoVazio';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { SITUACAO_ANUNCIO, PROPORCAO_ANUNCIO, reais, diaMes } from './util';

const ALTURA_GRAFICO = 140;

// Número em destaque com legenda
function Total({ valor, legenda }) {
  return (
    <View style={styles.total}>
      <Text style={styles.valorTotal} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={styles.legendaTotal}>{legenda}</Text>
    </View>
  );
}

// Barras por dia: impressões (altura) e cliques (número embaixo)
function GraficoPorDia({ dias }) {
  const maior = Math.max(1, ...dias.map((d) => d.impressoes));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grafico}>
      {dias.map((d) => (
        <View key={d.dia} style={styles.coluna}>
          <Text style={styles.numeroBarra}>{d.impressoes}</Text>
          <View style={[styles.barra, { height: Math.max(2, (d.impressoes / maior) * ALTURA_GRAFICO) }]} />
          <Text style={styles.diaBarra}>{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</Text>
          <Text style={styles.cliquesBarra}>{d.cliques} {d.cliques === 1 ? 'clique' : 'cliques'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// Métricas de um anúncio: totais, taxa de cliques, custo por clique e o gráfico por dia
export default function MetricasScreen({ route, navigation }) {
  const { id } = route.params;
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await api.get(`/anuncios/${id}/metricas`);
      setDados(resposta.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const anuncio = dados?.anuncio;
  const totais = dados?.totais;
  const situacao = anuncio ? SITUACAO_ANUNCIO[anuncio.situacao] : null;
  const [largura, altura] = PROPORCAO_ANUNCIO[anuncio?.formato] ?? PROPORCAO_ANUNCIO.banner;
  const custoPorClique = totais?.cliques ? Number(anuncio.valor_investido) / totais.cliques : null;

  return (
    <TelaConta
      navigation={navigation}
      titulo="Métricas do anúncio"
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
    >
      {anuncio && (
        <>
          <Image source={{ uri: anuncio.imagem_url }} style={[styles.imagem, { aspectRatio: largura / altura }]} resizeMode="cover" />
          <Text style={styles.resumo}>
            {anuncio.formato === 'faixa' ? 'Faixa' : 'Banner'} · {situacao?.rotulo ?? anuncio.situacao} ·{' '}
            {diaMes(anuncio.data_inicio)} a {diaMes(anuncio.data_fim)}
          </Text>
          <Text style={styles.resumo}>
            {reais(anuncio.valor_investido)} por {anuncio.dias} {anuncio.dias === 1 ? 'dia' : 'dias'}
            {' '}({reais(Number(anuncio.valor_investido) / anuncio.dias)} por dia)
          </Text>

          <View style={styles.totais}>
            <Total valor={totais.impressoes} legenda="impressões" />
            <Total valor={totais.cliques} legenda="cliques" />
            <Total valor={`${String(totais.taxa_de_cliques).replace('.', ',')}%`} legenda="taxa de cliques" />
          </View>
          {custoPorClique !== null && (
            <Text style={styles.custo}>Cada clique custou, em média, {reais(custoPorClique)}.</Text>
          )}
          <Text style={styles.explicacao}>
            Impressão é cada vez que o anúncio aparece na tela de alguém; clique é cada toque nele. As suas próprias visitas não contam.
          </Text>

          <Text style={styles.tituloSecao}>Por dia</Text>
          {dados.por_dia.length === 0
            ? <EstadoVazio icone="bar-chart-outline" mensagem="O anúncio ainda não começou." />
            : <GraficoPorDia dias={dados.por_dia} />}
        </>
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  imagem: { width: '100%', borderRadius: 10, backgroundColor: colors.cinzaInput, marginBottom: 10 },
  resumo: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 2 },
  totais: { flexDirection: 'row', marginTop: 16 },
  total: { flex: 1, borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, marginHorizontal: 4, alignItems: 'center', backgroundColor: colors.brancoFundo },
  valorTotal: { ...tipografia.tituloTela, fontSize: fs(22), color: colors.verdePreco },
  legendaTotal: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 2, textAlign: 'center' },
  custo: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginTop: 14 },
  explicacao: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 8 },
  tituloSecao: { ...tipografia.tituloSecao, color: colors.pretoTexto, marginTop: 22, marginBottom: 10 },
  grafico: { alignItems: 'flex-end', paddingVertical: 4 },
  coluna: { width: 58, alignItems: 'center', marginRight: 6 },
  numeroBarra: { ...tipografia.pequeno, fontSize: fs(11), color: colors.textoSecundario, marginBottom: 2 },
  barra: { width: 26, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: colors.iconeFavoritos },
  diaBarra: { ...tipografia.legenda, color: colors.pretoTexto, marginTop: 4 },
  cliquesBarra: { ...tipografia.pequeno, fontSize: fs(10), color: colors.textoSecundario },
});
