import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import BotaoGradiente from '../../components/BotaoGradiente';
import EstadoVazio from '../../components/EstadoVazio';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { SITUACAO_ANUNCIO, PROPORCAO_ANUNCIO, reais, diaMes } from './util';

// Cartão de um anúncio: imagem, situação, valor por dia, período e totais
function CartaoAnuncio({ anuncio, onPress }) {
  const situacao = SITUACAO_ANUNCIO[anuncio.situacao] ?? { rotulo: anuncio.situacao, cor: colors.textoSecundario };
  const [largura, altura] = PROPORCAO_ANUNCIO[anuncio.formato] ?? PROPORCAO_ANUNCIO.banner;
  return (
    <TouchableOpacity onPress={onPress} style={styles.cartao} activeOpacity={0.8}>
      <Image source={{ uri: anuncio.imagem_url }} style={[styles.imagem, { aspectRatio: largura / altura }]} resizeMode="cover" />
      <View style={styles.linhaTopo}>
        <Text style={styles.formato}>{anuncio.formato === 'faixa' ? 'Faixa' : 'Banner'}</Text>
        <View style={[styles.situacao, { borderColor: situacao.cor }]}>
          <Text style={[styles.textoSituacao, { color: situacao.cor }]}>{situacao.rotulo}</Text>
        </View>
      </View>
      <Text style={styles.detalhe}>
        {reais(anuncio.valor_investido)} por {anuncio.dias} {anuncio.dias === 1 ? 'dia' : 'dias'} ({reais(anuncio.peso)} por dia)
        {' · '}{diaMes(anuncio.data_inicio)} a {diaMes(anuncio.data_fim)}
      </Text>
      <View style={styles.numeros}>
        <Ionicons name="eye-outline" size={16} color={colors.textoSecundario} />
        <Text style={styles.numero}>{anuncio.impressoes} impressões</Text>
        <Ionicons name="hand-left-outline" size={16} color={colors.textoSecundario} style={styles.iconeCliques} />
        <Text style={styles.numero}>{anuncio.cliques} cliques</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textoSecundario} style={styles.seta} />
      </View>
    </TouchableOpacity>
  );
}

// Anúncios de uma empresa para o dono, com o atalho para impulsionar
export default function MeusAnunciosScreen({ route, navigation }) {
  const { empresaId, empresaNome } = route.params;
  const [anuncios, setAnuncios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get('/anuncios/minhas');
      setAnuncios(resposta.data.filter((a) => a.empresa_id === empresaId));
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const impulsionar = () => navigation.navigate('Impulsionar', { empresaId, empresaNome });

  return (
    <TelaConta
      navigation={navigation}
      titulo="Anúncios"
      descricao={`Destaque ${empresaNome ?? 'sua empresa'} no Explorar. Quanto mais você investe por dia, mais à frente o anúncio aparece.`}
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
    >
      <BotaoGradiente titulo="+ Impulsionar" onPress={impulsionar} estilo={styles.novo} />
      {anuncios.length === 0 ? (
        <EstadoVazio icone="megaphone-outline" mensagem="Nenhum anúncio ainda." />
      ) : (
        anuncios.map((anuncio) => (
          <CartaoAnuncio
            key={anuncio.id_anuncio}
            anuncio={anuncio}
            onPress={() => navigation.navigate('Metricas', { id: anuncio.id_anuncio })}
          />
        ))
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  novo: { marginBottom: 18 },
  cartao: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, padding: 12, marginBottom: 14, backgroundColor: colors.brancoFundo },
  imagem: { width: '100%', borderRadius: 8, backgroundColor: colors.cinzaInput },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  formato: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto },
  situacao: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  textoSituacao: { ...tipografia.legenda },
  detalhe: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
  numeros: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  numero: { ...tipografia.legenda, color: colors.pretoTexto, marginLeft: 4 },
  iconeCliques: { marginLeft: 14 },
  seta: { marginLeft: 'auto' },
});
