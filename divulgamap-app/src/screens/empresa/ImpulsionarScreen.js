import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import CampoTexto from '../../components/CampoTexto';
import BotaoGradiente from '../../components/BotaoGradiente';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { escolherEEnviarFoto, mensagemDeErro, PROPORCAO_ANUNCIO, reais } from './util';

const FORMATOS = [
  { valor: 'banner', rotulo: 'Banner', ajuda: 'Imagem grande no carrossel do topo do Explorar.' },
  { valor: 'faixa', rotulo: 'Faixa', ajuda: 'Faixa fina entre as seções do Explorar.' },
];
const DESTINOS = [
  { valor: 'empresa', rotulo: 'Perfil da empresa' },
  { valor: 'oferta', rotulo: 'Uma oferta' },
  { valor: 'link', rotulo: 'Um link' },
];
const DIAS_MINIMO = 1;
const DIAS_MAXIMO = 30;
const VALOR_MINIMO_POR_DIA = 1;
const VALOR_MAXIMO = 10000;

function Rotulo({ texto }) {
  return <Text style={styles.rotulo}>{texto}</Text>;
}

function Chip({ texto, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]} activeOpacity={0.8}>
      <Text style={[styles.textoChip, ativo && styles.textoChipAtivo]}>{texto}</Text>
    </TouchableOpacity>
  );
}

// "12,5" ou "12.5" → 12.5; vazio ou inválido → null
function lerValor(texto) {
  const limpo = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(limpo)) return null;
  return Number(limpo);
}

// Link com https:// na frente, se faltar
function completarLink(texto) {
  const limpo = texto.trim();
  if (!limpo) return '';
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

// Posição no ranking: anúncios no ar com peso maior vêm antes; empate é sorteado
function posicaoNoRanking(ativos, peso) {
  const acima = ativos.filter((a) => a.peso > peso).length;
  const empatados = ativos.filter((a) => a.peso === peso).length;
  return { posicao: acima + 1, total: ativos.length + 1, empatados };
}

// Novo anúncio da empresa, com pagamento simulado
export default function ImpulsionarScreen({ route, navigation }) {
  const { empresaId, empresaNome } = route.params;
  const [formato, setFormato] = useState('banner');
  const [imagem, setImagem] = useState(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [destino, setDestino] = useState('empresa');
  const [ofertas, setOfertas] = useState([]);
  const [ofertaId, setOfertaId] = useState(null);
  const [link, setLink] = useState('');
  const [dias, setDias] = useState(7);
  const [valorTexto, setValorTexto] = useState('');
  const [ativos, setAtivos] = useState(null);
  const [pagando, setPagando] = useState(false);

  // Ofertas que ainda não acabaram
  useEffect(() => {
    api.get(`/promocoes/empresa/${empresaId}`)
      .then((r) => setOfertas(r.data.filter((p) => p.status !== 'expirada')))
      .catch(() => setOfertas([]));
  }, [empresaId]);

  // Anúncios no ar do mesmo formato, para a posição no ranking
  useEffect(() => {
    setAtivos(null);
    api.get('/anuncios/ativos', { params: { formato } })
      .then((r) => setAtivos(r.data))
      .catch(() => setAtivos([]));
  }, [formato]);

  const [proporcaoLargura, proporcaoAltura] = PROPORCAO_ANUNCIO[formato];
  const valor = lerValor(valorTexto);
  const minimo = dias * VALOR_MINIMO_POR_DIA;
  const porDia = valor ? Math.round((valor / dias) * 100) / 100 : null;
  const ranking = porDia && ativos ? posicaoNoRanking(ativos, porDia) : null;

  async function escolherImagem() {
    setEnviandoImagem(true);
    try {
      const url = await escolherEEnviarFoto('divulgamap/anuncios', false, PROPORCAO_ANUNCIO[formato]);
      if (url) setImagem(url);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a imagem', erro.message);
    } finally {
      setEnviandoImagem(false);
    }
  }

  // Conferência antes de pagar; devolve a mensagem do problema ou null
  function conferir() {
    if (!imagem) return 'Escolha a imagem do anúncio.';
    if (destino === 'oferta' && !ofertaId) return 'Escolha a oferta.';
    if (destino === 'link' && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(completarLink(link))) return 'Escreva um link válido, como www.seusite.com.br.';
    if (valor === null) return 'Escreva quanto quer investir.';
    if (Math.round(valor * 100) / 100 !== valor) return 'Use no máximo dois números depois da vírgula.';
    if (valor < minimo) return `O mínimo é ${reais(VALOR_MINIMO_POR_DIA)} por dia: ${reais(minimo)} para ${dias} dias.`;
    if (valor > VALOR_MAXIMO) return `O máximo é ${reais(VALOR_MAXIMO)}.`;
    return null;
  }

  function pagar() {
    const problema = conferir();
    if (problema) {
      Alert.alert('Confira o anúncio', problema);
      return;
    }
    Alert.alert(
      'Pagamento simulado',
      `${reais(valor)} por ${dias} ${dias === 1 ? 'dia' : 'dias'} (${reais(porDia)} por dia). Nesta versão o pagamento é aprovado na hora, sem cobrança.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pagar', onPress: enviar },
      ]
    );
  }

  async function enviar() {
    setPagando(true);
    try {
      await api.post('/anuncios', {
        empresa_id: empresaId,
        formato,
        imagem_url: imagem,
        valor_investido: valor,
        dias,
        promocao_id: destino === 'oferta' ? ofertaId : null,
        link_externo: destino === 'link' ? completarLink(link) : null,
      });
      Alert.alert('Anúncio no ar', 'Ele já aparece no Explorar. Acompanhe as impressões e os cliques em Anúncios.');
      navigation.goBack();
    } catch (erro) {
      Alert.alert('Não foi possível pagar', mensagemDeErro(erro));
    } finally {
      setPagando(false);
    }
  }

  let textoRanking = 'Escreva o valor para ver em que posição o anúncio fica.';
  if (ranking) {
    const lugar = formato === 'faixa' ? 'entre as faixas' : 'no carrossel';
    textoRanking = `Com ${reais(porDia)} por dia, seu anúncio fica em ${ranking.posicao}º de ${ranking.total} ${lugar}`;
    textoRanking += ranking.empatados ? ', empatado com outro (a ordem entre eles é sorteada).' : '.';
  } else if (porDia && !ativos) {
    textoRanking = 'Calculando a posição…';
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Impulsionar"
      descricao={`Anúncio de ${empresaNome ?? 'sua empresa'} no Explorar do DivulgaMap.`}
      rodape={<BotaoGradiente titulo={valor ? `Pagar ${reais(valor)}` : 'Pagar'} onPress={pagar} carregando={pagando} desativado={enviandoImagem} />}
    >
      <Rotulo texto="Formato" />
      <View style={styles.chips}>
        {FORMATOS.map((f) => <Chip key={f.valor} texto={f.rotulo} ativo={formato === f.valor} onPress={() => setFormato(f.valor)} />)}
      </View>
      <Text style={styles.ajuda}>{FORMATOS.find((f) => f.valor === formato).ajuda}</Text>

      <Rotulo texto="Imagem" />
      <TouchableOpacity
        onPress={escolherImagem}
        disabled={enviandoImagem}
        style={[styles.imagem, { aspectRatio: proporcaoLargura / proporcaoAltura }]}
        activeOpacity={0.8}
      >
        {imagem ? <Image source={{ uri: imagem }} style={styles.preenche} resizeMode="cover" /> : (
          <View style={styles.semImagem}>
            <Ionicons name="image-outline" size={formato === 'faixa' ? 22 : 34} color={colors.textoSecundario} />
            {formato === 'banner' && <Text style={styles.ajuda}>Toque para escolher (proporção {proporcaoLargura}:{proporcaoAltura})</Text>}
          </View>
        )}
        {enviandoImagem && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.pretoTexto} />}
      </TouchableOpacity>
      {imagem && <Text style={styles.ajuda}>Toque na imagem para trocar.</Text>}

      <Rotulo texto="Ao tocar no anúncio, abrir" />
      <View style={styles.chips}>
        {DESTINOS.map((d) => <Chip key={d.valor} texto={d.rotulo} ativo={destino === d.valor} onPress={() => setDestino(d.valor)} />)}
      </View>
      {destino === 'oferta' && (ofertas.length === 0
        ? <Text style={styles.ajuda}>Esta empresa não tem ofertas ativas ou agendadas.</Text>
        : ofertas.map((o) => (
          <TouchableOpacity key={o.id_promocao} onPress={() => setOfertaId(o.id_promocao)} style={styles.oferta} activeOpacity={0.7}>
            <Ionicons name={ofertaId === o.id_promocao ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.pretoTexto} />
            <Text style={styles.textoOferta} numberOfLines={1}>{o.titulo}</Text>
          </TouchableOpacity>
        )))}
      {destino === 'link' && (
        <CampoTexto
          valor={link}
          onMudar={setLink}
          placeholder="www.seusite.com.br"
          limite={500}
          autoCapitalize="none"
          keyboardType="url"
          estilo={styles.campo}
        />
      )}

      <Rotulo texto="Duração" />
      <View style={styles.dias}>
        <TouchableOpacity onPress={() => setDias((d) => Math.max(DIAS_MINIMO, d - 1))} style={styles.botaoDias} accessibilityLabel="Menos um dia">
          <Ionicons name="remove" size={22} color={colors.pretoTexto} />
        </TouchableOpacity>
        <Text style={styles.textoDias}>{dias} {dias === 1 ? 'dia' : 'dias'}</Text>
        <TouchableOpacity onPress={() => setDias((d) => Math.min(DIAS_MAXIMO, d + 1))} style={styles.botaoDias} accessibilityLabel="Mais um dia">
          <Ionicons name="add" size={22} color={colors.pretoTexto} />
        </TouchableOpacity>
      </View>

      <Rotulo texto="Valor total" />
      <CampoTexto valor={valorTexto} onMudar={setValorTexto} placeholder={`Mínimo ${reais(minimo)}`} keyboardType="decimal-pad" estilo={styles.campo} />
      {porDia !== null && <Text style={styles.porDia}>{reais(porDia)} por dia</Text>}
      {valor !== null && valor < minimo && <Text style={styles.aviso}>O mínimo é {reais(VALOR_MINIMO_POR_DIA)} por dia ({reais(minimo)}).</Text>}

      <View style={styles.caixaRanking}>
        <Ionicons name="trophy-outline" size={20} color={colors.pretoTexto} />
        <Text style={styles.textoRanking}>{textoRanking}</Text>
      </View>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...tipografia.corpo, color: colors.pretoTexto, marginTop: 18, marginBottom: 8 },
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipAtivo: { backgroundColor: colors.pretoTexto, borderColor: colors.pretoTexto },
  textoChip: { ...tipografia.legenda, color: colors.pretoTexto },
  textoChipAtivo: { color: colors.brancoFundo },
  imagem: { width: '100%', borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.bordaClara, borderStyle: 'dashed', backgroundColor: colors.brancoFundo },
  preenche: { width: '100%', height: '100%' },
  semImagem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  oferta: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  textoOferta: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 8, flex: 1 },
  campo: { marginTop: 4 },
  dias: { flexDirection: 'row', alignItems: 'center' },
  botaoDias: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.bordaClara, alignItems: 'center', justifyContent: 'center' },
  textoDias: { ...tipografia.corpo, fontSize: fs(17), color: colors.pretoTexto, minWidth: 90, textAlign: 'center' },
  porDia: { ...tipografia.corpo, color: colors.verdePreco, marginTop: 6 },
  aviso: { ...tipografia.legenda, color: colors.vermelhoAviso, marginTop: 4 },
  caixaRanking: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.menuInicio, borderRadius: 14, padding: 12, marginTop: 20 },
  textoRanking: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 10, flex: 1 },
});
