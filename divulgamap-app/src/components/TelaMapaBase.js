import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import colors from '../theme/colors';
import { fs } from '../theme/tipografia';

// Categorias usadas se GET /categorias falhar
const CATEGORIAS_PADRAO = ['Alimentação', 'Bem-Estar', 'Construção', 'Moda', 'Serviços Gerais', 'Tecnologia'];

const CENTRO_TAQUARA = { latitude: -29.6494, longitude: -50.7817 };
const LIMITES_TAQUARA = {
  norte: -29.58,
  sul: -29.72,
  leste: -50.70,
  oeste: -50.86,
};

function dentroDeTaquara({ latitude, longitude }) {
  return (
    latitude <= LIMITES_TAQUARA.norte && latitude >= LIMITES_TAQUARA.sul &&
    longitude <= LIMITES_TAQUARA.leste && longitude >= LIMITES_TAQUARA.oeste
  );
}

const HTML_MAPA = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; background: #E8E8E8; }
    .leaflet-control-attribution { font-size: 9px; }
    .marcador { background: none; border: none; }
    .rotulo {
      display: none; position: absolute; left: 30px; top: 3px; max-width: 150px;
      padding: 3px 7px; border-radius: 6px; background: rgba(255,255,255,0.92);
      box-shadow: 0 1px 3px rgba(0,0,0,0.25); font-family: sans-serif; color: #1A1A1A;
    }
    .rotulo b, .rotulo span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rotulo b { font-size: 12px; font-weight: 600; }
    .rotulo span { font-size: 10px; color: #555555; }
    .mostrar-rotulos .rotulo { display: block; }
    .mostrar-rotulos .rotulo.escondido { visibility: hidden; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var mapa = L.map('mapa', {
      center: [${CENTRO_TAQUARA.latitude}, ${CENTRO_TAQUARA.longitude}],
      zoom: 14,
      minZoom: 13,
      maxZoom: 19,
      maxBounds: [
        [${LIMITES_TAQUARA.sul}, ${LIMITES_TAQUARA.oeste}],
        [${LIMITES_TAQUARA.norte}, ${LIMITES_TAQUARA.leste}]
      ],
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa);

    var marcadoresAtuais = [];
    var marcadorUsuario = null;

    // Zoom a partir do qual nome e ramo aparecem ao lado do pino
    var ZOOM_ROTULOS = 16;

    var SVG_PINO =
      '<svg width="30" height="40" viewBox="-1 -1 30 40" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 38 14 38s14-13.7 14-24.1C28 6.2 21.7 0 14 0z" ' +
      'fill="#E53935" stroke="#FFFFFF" stroke-width="1.5"/>' +
      '<circle cx="14" cy="14" r="5" fill="#FFFFFF"/></svg>';

    function escapar(texto) {
      var trocas = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return String(texto || '').replace(/[&<>"']/g, function (c) { return trocas[c]; });
    }

    // Pino vermelho com rótulo (nome e ramo), a ponta no local da empresa
    function iconeDoPonto(ponto) {
      var rotulo = ponto.nome
        ? '<div class="rotulo"><b>' + escapar(ponto.nome) + '</b>' +
          (ponto.descricao ? '<span>' + escapar(ponto.descricao) + '</span>' : '') + '</div>'
        : '';
      return L.divIcon({
        className: 'marcador',
        html: SVG_PINO + rotulo,
        iconSize: [30, 40],
        iconAnchor: [15, 39],
      });
    }

    function sobrepoe(a, b) {
      return a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom + 2 && a.bottom > b.top - 2;
    }

    // Rótulos só com zoom aproximado; o que bateria em outro já visível fica escondido
    function arrumarRotulos() {
      var mostrar = mapa.getZoom() >= ZOOM_ROTULOS;
      document.body.classList.toggle('mostrar-rotulos', mostrar);
      if (!mostrar) return;
      var ocupados = [];
      marcadoresAtuais.forEach(function (m) {
        var el = m.getElement();
        var rotulo = el && el.querySelector('.rotulo');
        if (!rotulo) return;
        rotulo.classList.remove('escondido');
        var caixa = rotulo.getBoundingClientRect();
        var bate = ocupados.some(function (outra) { return sobrepoe(caixa, outra); });
        if (bate) rotulo.classList.add('escondido');
        else ocupados.push(caixa);
      });
    }

    mapa.on('zoomend moveend', arrumarRotulos);

    function enviar(mensagem) {
      window.ReactNativeWebView.postMessage(JSON.stringify(mensagem));
    }

    function limparMarcadores() {
      marcadoresAtuais.forEach(function (m) { mapa.removeLayer(m); });
      marcadoresAtuais = [];
    }

    function receberMensagem(evento) {
      try {
        var dados = JSON.parse(evento.data);

        if (dados.tipo === 'PONTOS') {
          limparMarcadores();
          dados.pontos.forEach(function (ponto) {
            var marcador = L.marker([ponto.latitude, ponto.longitude], { icon: iconeDoPonto(ponto) }).addTo(mapa);
            marcador.on('click', function () { enviar({ tipo: 'TOQUE_PONTO', id: ponto.id }); });
            marcadoresAtuais.push(marcador);
          });
          arrumarRotulos();
        }

        if (dados.tipo === 'LOCALIZACAO_USUARIO') {
          if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
          marcadorUsuario = L.circleMarker([dados.latitude, dados.longitude], {
            radius: 8,
            color: '#FFFFFF',
            weight: 2,
            fillColor: '#1E90FF',
            fillOpacity: 1,
          }).addTo(mapa);
          if (dados.centralizar) mapa.setView([dados.latitude, dados.longitude], 16);
        }
      } catch (erro) {
        // Mensagem que não é JSON
      }
    }

    // Android usa 'document' e iOS usa 'window'
    document.addEventListener('message', receberMensagem);
    window.addEventListener('message', receberMensagem);

    enviar({ tipo: 'PRONTO' });
  </script>
</body>
</html>
`;

// Mapa de Taquara com busca, chips de categoria e menu deslizante
export default function TelaMapaBase({
  categoriaSelecionada, onMudarCategoria, atualizando = false, onAtualizar,
  pontos = [],
  onTocarPonto,
  onMudarLocalizacao,
  children,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  const webViewRef = useRef(null);

  // Recolhido (só a alça, para ver o mapa), meio e quase tela cheia
  const snapPoints = useMemo(() => ['8%', '50%', '92%'], []);
  const [mapaPronto, setMapaPronto] = useState(false);
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);

  // Localização: sem GPS, sem permissão ou com erro, o mapa fica em Taquara
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        if (!(await Location.hasServicesEnabledAsync())) return;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!ativo || !posicao) return;
        setLocalizacaoUsuario({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude });
      } catch (erro) {
        console.log('Localização indisponível:', erro?.message);
      }
    })();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (localizacaoUsuario) onMudarLocalizacao?.(localizacaoUsuario);
  }, [localizacaoUsuario]);

  // Categorias do banco
  useEffect(() => {
    api.get('/categorias')
      .then((resposta) => {
        const nomes = resposta.data.map((categoria) => categoria.nome);
        if (nomes.length) setCategorias(nomes);
      })
      .catch(() => {});
  }, []);

  const enviarParaMapa = useCallback((mensagem) => {
    webViewRef.current?.postMessage(JSON.stringify(mensagem));
  }, []);

  useEffect(() => {
    if (!mapaPronto) return;
    enviarParaMapa({ tipo: 'PONTOS', pontos });
  }, [mapaPronto, pontos, enviarParaMapa]);

  useEffect(() => {
    if (!mapaPronto || !localizacaoUsuario) return;
    enviarParaMapa({
      tipo: 'LOCALIZACAO_USUARIO',
      ...localizacaoUsuario,
      centralizar: dentroDeTaquara(localizacaoUsuario),
    });
  }, [mapaPronto, localizacaoUsuario, enviarParaMapa]);

  function receberMensagemDoMapa(evento) {
    try {
      const dados = JSON.parse(evento.nativeEvent.data);
      if (dados.tipo === 'PRONTO') setMapaPronto(true);
      if (dados.tipo === 'TOQUE_PONTO') onTocarPonto?.(dados.id);
    } catch (erro) {
      // Mensagem que não é JSON
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={StyleSheet.absoluteFillObject}
        source={{ html: HTML_MAPA }}
        onMessage={receberMensagemDoMapa}
        javaScriptEnabled
        domStorageEnabled
      />

      <View style={[styles.topo, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Pesquisa')} accessibilityRole="search">
          <LinearGradient colors={[colors.menuInicio, colors.menuFim]} style={styles.barraBusca} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Image source={require('../../assets/images/logo-pin.png')} style={styles.iconeLogo} resizeMode="contain" />
            <Text style={styles.inputBusca}>O que você procura?</Text>
            <Ionicons name="mic-outline" size={20} color={colors.pretoTexto} />
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faixaFiltros} contentContainerStyle={styles.filtros}>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria}
              activeOpacity={1}
              style={[styles.chip, categoriaSelecionada === categoria && styles.chipSelecionado]}
              onPress={() => onMudarCategoria(categoriaSelecionada === categoria ? null : categoria)}
            >
              <Text style={styles.textoChip}>{categoria}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.alcaArrastar}
        backgroundStyle={styles.fundoFolha}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.folhaConteudo}
          showsVerticalScrollIndicator={false}
          refreshControl={onAtualizar
            ? <RefreshControl refreshing={atualizando} onRefresh={onAtualizar} colors={[colors.pretoTexto]} />
            : undefined}
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14 },
  barraBusca: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  iconeLogo: { width: 18, height: 20, marginRight: 8 },
  inputBusca: { flex: 1, fontFamily: 'Poppins_400Regular', includeFontPadding: false, fontSize: fs(16), color: colors.cinzaPlaceholder, paddingVertical: 4 },
  // Rolagem até as bordas da tela; o primeiro chip alinha com a barra de busca
  faixaFiltros: { marginHorizontal: -14 },
  filtros: { paddingHorizontal: 14 },
  chip: {
    backgroundColor: colors.brancoFundo, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 18, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  chipSelecionado: { backgroundColor: colors.gradienteBase, borderColor: colors.gradienteBase },
  textoChip: { fontFamily: 'Poppins_500Medium', includeFontPadding: false, fontSize: fs(14) },
  alcaArrastar: { backgroundColor: colors.pretoTexto, width: 64, height: 4 },
  fundoFolha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  folhaConteudo: { paddingHorizontal: 20, paddingBottom: 40 },
});
