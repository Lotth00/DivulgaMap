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
            var marcador = L.marker([ponto.latitude, ponto.longitude]).addTo(mapa);
            marcador.on('click', function () { enviar({ tipo: 'TOQUE_PONTO', id: ponto.id }); });
            marcadoresAtuais.push(marcador);
          });
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
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
  filtros: { paddingRight: 14 },
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
