import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';
import { ligar, abrirSite, abrirMapa, formatarTelefone } from './util';

function Linha({ icone, texto, onPress, primeira, ultima }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={[styles.linha, primeira && styles.primeira, ultima && styles.ultima]}
    >
      <Ionicons name={icone} size={22} color={colors.pretoTexto} style={styles.icone} />
      <Text style={[styles.texto, onPress && styles.link]}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Endereço, telefone, Google Maps e site (só o que a empresa informou)
export default function BlocoContato({ empresa }) {
  const endereco = [empresa.endereco, empresa.bairro].filter(Boolean).join(' - ');
  const temMapa = !!(empresa.google_maps_url || (empresa.latitude && empresa.longitude));

  const linhas = [
    endereco && { icone: 'location', texto: endereco, onPress: temMapa ? () => abrirMapa(empresa) : null },
    empresa.telefone && { icone: 'call', texto: formatarTelefone(empresa.telefone), onPress: () => ligar(empresa.telefone) },
    temMapa && { icone: 'map', texto: 'Google Maps', onPress: () => abrirMapa(empresa) },
    empresa.site && { icone: 'globe-outline', texto: empresa.site, onPress: () => abrirSite(empresa.site) },
  ].filter(Boolean);

  if (!linhas.length) return <Text style={styles.vazio}>A empresa ainda não informou endereço nem contatos.</Text>;

  return (
    <View style={styles.grupo}>
      {linhas.map((linha, i) => (
        <Linha key={linha.icone} {...linha} primeira={i === 0} ultima={i === linhas.length - 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { backgroundColor: colors.brancoFundo, borderRadius: 20, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cinzaInput, paddingHorizontal: 22, paddingVertical: 14, marginBottom: 3 },
  primeira: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  ultima: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 0 },
  icone: { marginRight: 16 },
  texto: { ...tipografia.corpoMedio, color: colors.textoPrincipal, flex: 1 },
  link: { textDecorationLine: 'none' },
  vazio: { ...tipografia.legenda, color: colors.textoSecundario },
});
