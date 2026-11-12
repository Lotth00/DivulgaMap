import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import ImagemItem from '../../components/ImagemItem';
import MenuPopup from '../../components/MenuPopup';
import { tempoDesde, formatarNota } from '../../components/perfilEmpresa/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const FUNDO = '#3E3732';

// Foto das avaliações em tela cheia, deslizando entre elas, com a empresa embaixo (Figma 566:1365)
export default function ImagemPerfilScreen({ route, navigation }) {
  const { fotos = [], indice: indiceInicial = 0 } = route.params ?? {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rolagem = useRef(null);
  const [indice, setIndice] = useState(indiceInicial);
  const [empresas, setEmpresas] = useState({});
  const [menu, setMenu] = useState(false);
  const foto = fotos[indice];

  // Começa na foto tocada
  useEffect(() => {
    requestAnimationFrame(() => rolagem.current?.scrollTo({ x: indiceInicial * width, animated: false }));
  }, [indiceInicial, width]);

  // Logo e nota da empresa da foto atual (guardadas para não buscar de novo)
  useEffect(() => {
    if (!foto || empresas[foto.empresa_id]) return;
    api.get(`/empresas/${foto.empresa_id}`)
      .then((r) => setEmpresas((atual) => ({ ...atual, [foto.empresa_id]: r.data })))
      .catch(() => {});
  }, [foto, empresas]);

  // Sem fotos: volta
  useEffect(() => {
    if (!fotos.length) navigation.goBack();
  }, [fotos.length, navigation]);

  if (!foto) return null;
  const empresa = empresas[foto.empresa_id];
  const abrirEmpresa = () => navigation.navigate('Empresa', { id: foto.empresa_id });

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />
      <ScrollView
        ref={rolagem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {fotos.map((f) => (
          <View key={f.id_foto} style={[styles.pagina, { width }]}>
            <Image source={{ uri: f.url }} style={styles.imagem} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.topo, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => setMenu(true)} style={styles.botaoRedondo} accessibilityLabel="Mais opções">
          <Ionicons name="ellipsis-vertical" size={22} color={colors.brancoFundo} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoRedondo} accessibilityLabel="Fechar">
          <Ionicons name="close" size={28} color={colors.brancoFundo} />
        </TouchableOpacity>
      </View>

      <View style={[styles.base, { bottom: insets.bottom + 16 }]}>
        <View style={styles.pilula}>
          <Text style={styles.voce}>Você</Text>
          <Text style={styles.tempo}>  ·  {tempoDesde(foto.criado_em)}</Text>
          {fotos.length > 1 && <Text style={styles.tempo}>  ·  {indice + 1} de {fotos.length}</Text>}
        </View>
        <TouchableOpacity onPress={abrirEmpresa} style={styles.empresa} activeOpacity={0.85}>
          <ImagemItem uri={empresa?.foto_perfil_url} categoria={empresa?.categorias?.[0]} largura={44} raio={22} />
          <View style={styles.textosEmpresa}>
            <Text style={styles.nomeEmpresa} numberOfLines={1}>{foto.empresa_nome}</Text>
            {empresa && Number(empresa.total_avaliacoes) > 0 && (
              <View style={styles.linhaNota}>
                <Text style={styles.nota}>{formatarNota(empresa.nota_media)}</Text>
                <Ionicons name="star" size={14} color={colors.estrela} style={styles.estrela} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <MenuPopup
        visivel={menu}
        opcoes={[{ texto: 'Abrir empresa', onPress: abrirEmpresa }]}
        onFechar={() => setMenu(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: FUNDO },
  pagina: { justifyContent: 'center' },
  imagem: { width: '100%', height: '100%' },
  topo: { position: 'absolute', right: 20, flexDirection: 'row' },
  botaoRedondo: {
    width: 46, height: 46, borderRadius: 23, marginLeft: 12,
    backgroundColor: 'rgba(30,30,30,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  base: { position: 'absolute', left: 20, right: 20 },
  pilula: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(30,30,30,0.85)',
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 10,
  },
  voce: { ...tipografia.corpo, color: colors.brancoFundo },
  tempo: { ...tipografia.legenda, color: colors.brancoFundo },
  empresa: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,30,30,0.85)',
    borderRadius: 32, paddingHorizontal: 14, paddingVertical: 10,
  },
  textosEmpresa: { flex: 1, marginLeft: 12 },
  nomeEmpresa: { ...tipografia.corpo, fontSize: fs(17), color: colors.brancoFundo },
  linhaNota: { flexDirection: 'row', alignItems: 'center' },
  nota: { ...tipografia.legenda, color: colors.bordaClara },
  estrela: { marginLeft: 4 },
});
