import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

const CATEGORIAS = ['Alimentação', 'Moda', 'Bem-Estar', 'Serviços Gerais', 'Tecnologia', 'Construção'];

const REGIAO_TAQUARA = { latitude: -29.6494, longitude: -50.7817, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function TelaMapaBase({
  busca, onMudarBusca,
  categoriaSelecionada, onMudarCategoria,
  marcadores = null,
  children,
}) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef(null);

  const snapPoints = useMemo(() => ['50%', '92%'], []);
  const [regiaoMapa, setRegiaoMapa] = useState(REGIAO_TAQUARA);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const localizacao = await Location.getCurrentPositionAsync({});
      setRegiaoMapa({
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFillObject} region={regiaoMapa}>
        {marcadores}
      </MapView>

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
