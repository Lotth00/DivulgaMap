import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TituloSecao from '../TituloSecao';
import LinhaVerMais from '../LinhaVerMais';
import CartaoOferta from '../CartaoOferta';
import CartaoHorario from './CartaoHorario';
import BlocoContato from './BlocoContato';
import CartaoAvaliacao from './CartaoAvaliacao';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { formatarNota } from './util';

const ALTURA_GRADE = 220;
const ESPACO = 8;

// Grade de fotos: uma grande e até três menores, a última com "Ver tudo"
function GradeFotos({ fotos, largura, onVerTudo }) {
  if (!fotos.length) return null;
  if (fotos.length === 1) {
    return <Image source={{ uri: fotos[0].url }} style={[styles.foto, { width: largura, height: ALTURA_GRADE }]} />;
  }

  const esquerda = Math.round(largura * 0.55);
  const direita = largura - esquerda - ESPACO;
  const metade = (ALTURA_GRADE - ESPACO) / 2;
  const pequena = (direita - ESPACO) / 2;
  const [primeira, segunda, terceira, quarta] = fotos;

  return (
    <View style={styles.grade}>
      <Image source={{ uri: primeira.url }} style={[styles.foto, { width: esquerda, height: ALTURA_GRADE }]} />
      <View style={{ width: direita }}>
        <Image source={{ uri: segunda.url }} style={[styles.foto, { width: direita, height: terceira ? metade : ALTURA_GRADE }]} />
        {terceira && (
          <View style={styles.linhaPequenas}>
            <Image source={{ uri: terceira.url }} style={[styles.foto, { width: quarta ? pequena : direita, height: metade }]} />
            {quarta && (
              <TouchableOpacity onPress={onVerTudo} activeOpacity={0.8}>
                <Image source={{ uri: quarta.url }} style={[styles.foto, { width: pequena, height: metade }]} />
                <View style={[styles.verTudo, { width: pequena, height: metade }]}>
                  <Ionicons name="images-outline" size={20} color={colors.brancoFundo} />
                  <Text style={styles.textoVerTudo}>Ver tudo</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Aba "Geral": fotos, horário, ofertas, contatos e avaliações recentes
export default function AbaGeral({ empresa, ofertas, avaliacoes, minhaAvaliacao, onAvaliar, onIrPara, onAbrirOferta }) {
  const { width } = useWindowDimensions();
  const largura = width - 40;
  const total = Number(empresa.total_avaliacoes) || 0;

  return (
    <View>
      {empresa.fotos?.length > 0 && (
        <View style={styles.bloco}>
          <GradeFotos fotos={empresa.fotos} largura={largura} onVerTudo={() => onIrPara('fotos')} />
        </View>
      )}

      <View style={styles.bloco}>
        <CartaoHorario empresa={empresa} />
      </View>

      {ofertas.length > 0 && (
        <View style={styles.bloco}>
          <TituloSecao titulo="Ofertas" linha="lado" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carrossel} contentContainerStyle={styles.conteudoCarrossel}>
            {ofertas.map((oferta) => (
              <CartaoOferta key={oferta.id} oferta={oferta} onPress={() => onAbrirOferta(oferta)} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.bloco}>
        <TituloSecao titulo="Sobre" linha="lado" />
        <BlocoContato empresa={empresa} />
      </View>

      <View style={styles.bloco}>
        <View style={styles.cabecalhoAvaliacoes}>
          <Text style={styles.tituloAvaliacoes}>Avaliações</Text>
          {total > 0 && (
            <View style={styles.resumoNota}>
              <Text style={styles.textoNota}>{formatarNota(empresa.nota_media)}</Text>
              <Ionicons name="star" size={18} color={colors.estrela} />
              <Text style={styles.textoTotal}>({total})</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onAvaliar} style={styles.botaoAvaliar} activeOpacity={0.7}>
          <Ionicons name={minhaAvaliacao ? 'create-outline' : 'star-outline'} size={18} color={colors.pretoTexto} />
          <Text style={styles.textoAvaliar}>{minhaAvaliacao ? 'Editar sua avaliação' : 'Avaliar esta empresa'}</Text>
        </TouchableOpacity>
        {avaliacoes.length === 0 ? (
          <Text style={styles.vazio}>Ainda não há avaliações. Seja a primeira pessoa a avaliar!</Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carrossel} contentContainerStyle={styles.conteudoCarrossel}>
              {avaliacoes.slice(0, 3).map((avaliacao) => (
                <CartaoAvaliacao key={avaliacao.id_avaliacao} avaliacao={avaliacao} largura={Math.min(300, largura - 30)} />
              ))}
            </ScrollView>
            <LinhaVerMais texto="Ver todas" onPress={() => onIrPara('avaliacoes')} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: 22 },
  grade: { flexDirection: 'row', justifyContent: 'space-between' },
  linhaPequenas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: ESPACO },
  foto: { borderRadius: 12, backgroundColor: colors.cinzaInput },
  verTudo: {
    position: 'absolute', top: 0, left: 0, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  textoVerTudo: { ...tipografia.pequeno, color: colors.brancoFundo, marginTop: 2 },
  carrossel: { marginHorizontal: -20 },
  conteudoCarrossel: { paddingHorizontal: 20, paddingVertical: 4 },
  cabecalhoAvaliacoes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tituloAvaliacoes: { ...tipografia.tituloTela, fontSize: fs(16), color: colors.pretoTexto },
  resumoNota: { flexDirection: 'row', alignItems: 'center' },
  textoNota: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto, marginRight: 4 },
  textoTotal: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginLeft: 4 },
  vazio: { ...tipografia.legenda, color: colors.textoSecundario },
  botaoAvaliar: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12,
    borderWidth: 1, borderColor: colors.bordaClara, backgroundColor: colors.brancoFundo, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7,
  },
  textoAvaliar: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 6 },
});
