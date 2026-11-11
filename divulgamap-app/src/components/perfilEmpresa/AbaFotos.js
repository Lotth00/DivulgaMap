import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EstadoVazio from '../EstadoVazio';
import colors from '../../theme/colors';

const COLUNAS = 3;
const ESPACO = 6;

// Aba de fotos: grade e foto ampliada ao tocar
export default function AbaFotos({ fotos }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [ampliada, setAmpliada] = useState(null);
  const lado = (width - 40 - ESPACO * (COLUNAS - 1)) / COLUNAS;

  if (!fotos.length) {
    return <EstadoVazio icone="images-outline" mensagem="Esta empresa ainda não tem fotos." />;
  }

  return (
    <View style={styles.grade}>
      {fotos.map((foto, i) => (
        <TouchableOpacity key={foto.id_foto ?? foto.url} onPress={() => setAmpliada(foto.url)} activeOpacity={0.8}>
          <Image
            source={{ uri: foto.url }}
            style={[styles.foto, { width: lado, height: lado, marginRight: (i + 1) % COLUNAS ? ESPACO : 0 }]}
          />
        </TouchableOpacity>
      ))}

      <Modal visible={!!ampliada} transparent animationType="fade" onRequestClose={() => setAmpliada(null)}>
        <View style={styles.fundo}>
          {ampliada && <Image source={{ uri: ampliada }} style={{ width, height: height * 0.75 }} resizeMode="contain" />}
          <TouchableOpacity onPress={() => setAmpliada(null)} style={[styles.fechar, { top: insets.top + 12 }]} accessibilityLabel="Fechar">
            <Ionicons name="close" size={30} color={colors.brancoFundo} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  foto: { borderRadius: 8, marginBottom: ESPACO, backgroundColor: colors.cinzaInput },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fechar: { position: 'absolute', right: 16, padding: 6 },
});
