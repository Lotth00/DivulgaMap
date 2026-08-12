import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

const CATEGORIAS = ['Alimentação', 'Moda', 'Bem-Estar', 'Serviços Gerais', 'Tecnologia', 'Construção'];

const CENTRO_TAQUARA = { latitude: -29.6494, longitude: -50.7817 };
const LIMITES_TAQUARA = {
  norte: -29.58,
  sul: -29.72,
  leste: -50.70,
  oeste: -50.86,
};

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
            if (ponto.titulo) {
              marcador.bindPopup('<b>' + ponto.titulo + '</b>' + (ponto.descricao ? '<br>' + ponto.descricao : ''));
            }
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
        }
      } catch (erro) {
        // ignora mensagens que não sejam JSON válido
      }
    }

    // Android dispara em 'document', iOS dispara em 'window' — registrando os dois
    // evita ficar dependendo de qual plataforma está rodando.
    document.addEventListener('message', receberMensagem);
    window.addEventListener('message', receberMensagem);

    // Avisa o React Native que o mapa já carregou e está pronto para receber dados.
    window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'PRONTO' }));
  </script>
</body>
</html>
`;

export default function TelaMapaBase({
  busca, onMudarBusca,
  categoriaSelecionada, onMudarCategoria,
  pontos = [],
  children,
}) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef(null);
  const webViewRef = useRef(null);

  const snapPoints = useMemo(() => ['50%', '92%'], []);
  const [mapaPronto, setMapaPronto] = useState(false);
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const localizacao = await Location.getCurrentPositionAsync({});
      setLocalizacaoUsuario({
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
      });
    })();
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
    enviarParaMapa({ tipo: 'LOCALIZACAO_USUARIO', ...localizacaoUsuario });
  }, [mapaPronto, localizacaoUsuario, enviarParaMapa]);

  function receberMensagemDoMapa(evento) {
    try {
      const dados = JSON.parse(evento.nativeEvent.data);
      if (dados.tipo === 'PRONTO') setMapaPronto(true);
    } catch (erro) {
      
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
        <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} style={styles.barraBusca} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Image source={require('../../assets/images/logo-pin.png')} style={styles.iconeLogo} resizeMode="contain" />
          <TextInput
            style={styles.inputBusca}
            placeholder="O que você procura?"
            placeholderTextColor={colors.cinzaPlaceholder}
            value={busca}
            onChangeText={onMudarBusca}
          />
          <Ionicons name="mic-outline" size={20} color={colors.pretoTexto} />
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {CATEGORIAS.map((categoria) => (
            <TouchableOpacity
              key={categoria}
              activeOpacity={1}
              style={[styles.chip, categoriaSelecionada === categoria && styles.chipSelecionado]}
              onPress={() => onMudarCategoria(categoriaSelecionada === categoria ? null : categoria)}
            >
              <Text style={styles.textoChip}>{categoria}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={1} style={styles.chip}>
            <Text style={styles.textoChip}>··· Mais</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints} handleIndicatorStyle={styles.alcaArrastar}>
        <BottomSheetView style={styles.folhaConteudo}>{children}</BottomSheetView>
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
  inputBusca: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15 },
  filtros: { paddingRight: 14 },
  chip: {
    backgroundColor: colors.brancoFundo, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 18, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  chipSelecionado: { backgroundColor: colors.gradienteBase, borderColor: colors.gradienteBase },
  textoChip: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  alcaArrastar: { backgroundColor: '#D0D0D0', width: 44 },
  folhaConteudo: { flex: 1, paddingHorizontal: 33 },
});
