import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Cabecalho from '../components/Cabecalho';
import ImagemItem from '../components/ImagemItem';
import TituloSecao from '../components/TituloSecao';
import BotaoGradiente from '../components/BotaoGradiente';
import Carregando from '../components/Carregando';
import EstadoVazio from '../components/EstadoVazio';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import colors from '../theme/colors';
import tipografia, { fontes } from '../theme/tipografia';

const ROTULO_TIPO = {
  normal: { texto: 'PROMOÇÃO', cor: colors.menuInicio },
  especial: { texto: 'OFERTA ESPECIAL', cor: colors.menuFim },
  relampago: { texto: 'RELÂMPAGO', cor: colors.seloDesconto },
};

function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

// "2026-12-31T23:59:00" → "31/12/2026 às 23:59"
function formatarData(texto) {
  if (!texto) return '';
  const [data, hora = '00:00'] = texto.split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

function hojeLocal() {
  const agora = new Date();
  const doisDigitos = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Texto da validade, com "termina hoje" para o mesmo dia
function textoValidade(oferta) {
  if (!oferta.data_fim) return null;
  if (oferta.data_fim.slice(0, 10) === hojeLocal()) return `Termina hoje às ${oferta.data_fim.slice(11, 16)}`;
  return `Válida até ${formatarData(oferta.data_fim)}`;
}

// Unidade do preço: "/Kg", "/Hora"; nada para "un"
function sufixoUnidade(unidade) {
  if (!unidade || unidade === 'un') return '';
  return `/${unidade.charAt(0).toUpperCase()}${unidade.slice(1)}`;
}

// Linha das regras: ícone e texto
function Regra({ icone, children }) {
  return (
    <View style={styles.regra}>
      <Ionicons name={icone} size={20} color={colors.pretoTexto} style={styles.iconeRegra} />
      <Text style={styles.textoRegra}>{children}</Text>
    </View>
  );
}

// Detalhes de uma oferta (produto, serviço ou promoção geral da empresa)
export default function OfertaScreen({ route, navigation }) {
  const { id, oferta: ofertaInicial } = route.params ?? {};
  const { logado } = useAuth();
  const { width } = useWindowDimensions();
  const [oferta, setOferta] = useState(ofertaInicial ?? null);
  const [carregando, setCarregando] = useState(!ofertaInicial);
  const [falhou, setFalhou] = useState(false);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get(`/promocoes/${id}`);
      // A distância vem só da lista
      setOferta((anterior) => ({ ...resposta.data, distancia_km: anterior?.distancia_km ?? null }));
      setNaoEncontrada(false);
    } catch (erro) {
      if (erro.response?.status === 404) setNaoEncontrada(true);
      else setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Registro no histórico de quem está logado
  useEffect(() => {
    if (!logado || !id) return;
    api.post('/historico', { tipo_acao: 'visualizacao', tipo_item: 'promocao', item_id: id }).catch(() => {});
  }, [logado, id]);

  function abrirEmpresa() {
    if (oferta?.empresa_id) navigation.push('Empresa', { id: oferta.empresa_id });
  }

  function abrirRota() {
    if (!oferta?.latitude || !oferta?.longitude) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${oferta.latitude},${oferta.longitude}`);
  }

  let conteudo;
  if (carregando) {
    conteudo = <Carregando />;
  } else if (naoEncontrada) {
    conteudo = <EstadoVazio icone="pricetag-outline" mensagem="Esta oferta não está mais disponível." textoAcao="Voltar" onAcao={() => navigation.goBack()} />;
  } else if (falhou && !oferta) {
    conteudo = <ErroComTentarDeNovo onTentarDeNovo={() => { setCarregando(true); carregar(); }} />;
  } else {
    const rotulo = ROTULO_TIPO[oferta.tipo] ?? ROTULO_TIPO.normal;
    const unidade = sufixoUnidade(oferta.unidade_medida);
    const desconto = oferta.desconto_percentual ? Math.round(Number(oferta.desconto_percentual)) : null;
    const nomeItem = oferta.produto_nome || oferta.titulo;
    const encerrada = oferta.em_vigor === false;
    const naoComecou = encerrada && oferta.data_inicio && new Date(oferta.data_inicio) > new Date();

    conteudo = (
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <View style={styles.linhaTopo}>
          <View style={[styles.rotulo, { backgroundColor: rotulo.cor }]}>
            <Text style={styles.textoRotulo}>{rotulo.texto}</Text>
          </View>
          <TouchableOpacity onPress={abrirEmpresa} style={styles.linkEmpresaTopo}>
            <Text style={styles.textoLinkEmpresa} numberOfLines={1}>{oferta.empresa_nome}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.nome}>{nomeItem}</Text>
        {oferta.produto_nome && oferta.titulo !== oferta.produto_nome && (
          <Text style={styles.subtitulo}>{oferta.titulo}</Text>
        )}

        <ImagemItem
          uri={oferta.foto_produto || oferta.foto_empresa}
          categoria={oferta.categoria}
          largura={width - 40}
          altura={260}
          raio={12}
          ajuste="contain"
          estilo={styles.imagem}
        />

        {encerrada && (
          <View style={styles.aviso}>
            <Ionicons name="time-outline" size={18} color={colors.vermelhoAviso} />
            <Text style={styles.textoAviso}>
              {naoComecou ? `Começa em ${formatarData(oferta.data_inicio)}` : 'Oferta encerrada'}
            </Text>
          </View>
        )}

        {oferta.preco_promocional ? (
          <View style={styles.blocoPreco}>
            <Text style={styles.precoDe}>
              De <Text style={styles.riscado}>{formatarPreco(oferta.preco_original)}{unidade}</Text> por apenas
            </Text>
            <View style={styles.linhaPreco}>
              <Text style={styles.preco}>{formatarPreco(oferta.preco_promocional)}{unidade}</Text>
              {desconto && (
                <View style={styles.selo}>
                  <Text style={styles.textoSelo}>-{desconto}%</Text>
                </View>
              )}
            </View>
          </View>
        ) : oferta.preco_original ? (
          <View style={styles.blocoPreco}>
            <Text style={styles.preco}>{formatarPreco(oferta.preco_original)}{unidade}</Text>
          </View>
        ) : null}

        {(oferta.condicao || (!oferta.preco_promocional && desconto)) && (
          <View style={styles.destaque}>
            <Text style={styles.textoDestaque}>{oferta.condicao || `${desconto}% de desconto`}</Text>
          </View>
        )}

        <View style={styles.secao}>
          <TituloSecao titulo="Regras da oferta" linha="lado" />
          {textoValidade(oferta) && <Regra icone="calendar-outline">{textoValidade(oferta)}</Regra>}
          {oferta.data_inicio && !naoComecou && <Regra icone="play-outline">Começou em {formatarData(oferta.data_inicio)}</Regra>}
          {desconto && oferta.preco_original && (
            <Regra icone="pricetag-outline">{desconto}% de desconto sobre o preço normal de {formatarPreco(oferta.preco_original)}{unidade}</Regra>
          )}
          {desconto && !oferta.produto_id && <Regra icone="pricetag-outline">{desconto}% de desconto</Regra>}
          {oferta.condicao && <Regra icone="gift-outline">{oferta.condicao}</Regra>}
          {oferta.tipo === 'relampago' && <Regra icone="flash-outline">Oferta relâmpago: dura no máximo 24 horas</Regra>}
          {oferta.descricao ? <Regra icone="information-circle-outline">{oferta.descricao}</Regra> : null}
          <Regra icone="storefront-outline">Válida em {oferta.empresa_nome}</Regra>
        </View>

        {oferta.produto_descricao ? (
          <View style={styles.secao}>
            <TituloSecao titulo={oferta.tipo_item === 'servico' ? 'Sobre o serviço' : 'Sobre o produto'} linha="lado" />
            <Text style={styles.textoCorrido}>{oferta.produto_descricao}</Text>
          </View>
        ) : null}

        <View style={styles.secao}>
          <TituloSecao titulo="Empresa" linha="lado" />
          <View style={styles.cartaoEmpresa}>
            <ImagemItem uri={oferta.foto_empresa} categoria={oferta.categoria} largura={64} raio={8} />
            <View style={styles.dadosEmpresa}>
              <Text style={styles.nomeEmpresa} numberOfLines={1}>{oferta.empresa_nome}</Text>
              {oferta.categoria && <Text style={styles.infoEmpresa}>{oferta.categoria}</Text>}
              {oferta.endereco && (
                <Text style={styles.infoEmpresa} numberOfLines={2}>
                  {oferta.endereco}{oferta.bairro ? ` · ${oferta.bairro}` : ''}
                </Text>
              )}
              {oferta.distancia_km !== null && oferta.distancia_km !== undefined && (
                <Text style={styles.infoEmpresa}>
                  {oferta.distancia_km < 1 ? `${Math.round(oferta.distancia_km * 1000)} m de você` : `${String(oferta.distancia_km).replace('.', ',')} km de você`}
                </Text>
              )}
            </View>
          </View>
          <BotaoGradiente titulo="Ver empresa" onPress={abrirEmpresa} estilo={styles.botao} />
          {oferta.latitude && oferta.longitude && (
            <TouchableOpacity onPress={abrirRota} style={styles.botaoSecundario}>
              <Ionicons name="navigate-outline" size={18} color={colors.pretoTexto} />
              <Text style={styles.textoSecundario}>Como chegar</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} />
      {conteudo}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: 20, paddingBottom: 40 },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rotulo: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginRight: 10 },
  textoRotulo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 13, color: colors.pretoTexto },
  linkEmpresaTopo: { flex: 1 },
  textoLinkEmpresa: { ...tipografia.legenda, color: colors.azulLink },
  nome: { ...tipografia.tituloTela, fontSize: 22, color: colors.pretoTexto, marginTop: 8 },
  subtitulo: { ...tipografia.legenda, color: colors.textoSecundario },
  imagem: { marginTop: 12, backgroundColor: colors.brancoFundo },
  aviso: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  textoAviso: { ...tipografia.corpoMedio, color: colors.vermelhoAviso, marginLeft: 6 },
  blocoPreco: { marginTop: 14 },
  precoDe: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  riscado: { textDecorationLine: 'line-through' },
  linhaPreco: { flexDirection: 'row', alignItems: 'center' },
  preco: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 30, color: colors.verdePreco, marginRight: 10 },
  selo: { backgroundColor: colors.seloDesconto, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  textoSelo: { fontFamily: fontes.media, includeFontPadding: false, fontSize: 16, color: colors.pretoTexto },
  destaque: { alignSelf: 'flex-start', backgroundColor: colors.seloDesconto, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4, marginTop: 12 },
  textoDestaque: { ...tipografia.corpo, color: colors.pretoTexto },
  secao: { marginTop: 24 },
  regra: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  iconeRegra: { marginRight: 10, marginTop: 1 },
  textoRegra: { ...tipografia.corpoMedio, color: colors.pretoTexto, flex: 1 },
  textoCorrido: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  cartaoEmpresa: {
    flexDirection: 'row', backgroundColor: colors.brancoFundo, borderRadius: 8, padding: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  dadosEmpresa: { flex: 1, marginLeft: 12 },
  nomeEmpresa: { ...tipografia.corpo, fontSize: 17, color: colors.pretoTexto },
  infoEmpresa: { ...tipografia.legenda, color: colors.textoSecundario },
  botao: { marginTop: 14 },
  botaoSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  textoSecundario: { ...tipografia.corpo, color: colors.pretoTexto, marginLeft: 6 },
});
