import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import colors from '../../theme/colors';

// Mapa pequeno e parado, com um pino no ponto informado
export default function MapaPino({ latitude, longitude, altura = 190 }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html, body, #mapa { height: 100%; margin: 0; background: #E8E8E8; } .leaflet-control-attribution { font-size: 8px; }</style>
</head><body><div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var mapa = L.map('mapa', { center: [${lat}, ${lng}], zoom: 16, zoomControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
  L.marker([${lat}, ${lng}]).addTo(mapa);
</script></body></html>`;

  return (
    <View style={[styles.moldura, { height: altura }]}>
      <WebView source={{ html }} style={styles.mapa} scrollEnabled={false} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: { borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.bordaClara, marginBottom: 16 },
  mapa: { flex: 1 },
});
