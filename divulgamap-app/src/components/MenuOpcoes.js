import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Menu que sobe de baixo com opções (o menu ⋮); "perigo" pinta a opção de vermelho
export default function MenuOpcoes({ visivel, titulo, aviso, opcoes = [], onFechar }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar} />
      <View style={[styles.folha, { paddingBottom: insets.bottom + 16 }]}>
        {titulo ? <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text> : null}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
        {opcoes.map((opcao) => (
          <TouchableOpacity
            key={opcao.texto}
            onPress={() => {
              onFechar();
              opcao.onPress();
            }}
            style={styles.opcao}
            activeOpacity={0.6}
          >
            {opcao.icone && (
              <Ionicons name={opcao.icone} size={22} color={opcao.perigo ? colors.vermelhoAviso : colors.pretoTexto} style={styles.icone} />
            )}
            <Text style={[styles.texto, opcao.perigo && styles.perigo]}>{opcao.texto}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onFechar} style={styles.opcao} activeOpacity={0.6}>
          <Text style={styles.texto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  folha: { backgroundColor: colors.fundoTela, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20 },
  titulo: { ...tipografia.tituloSecao, color: colors.textoSecundario, paddingVertical: 8 },
  aviso: { ...tipografia.legenda, color: colors.textoSecundario, paddingBottom: 8 },
  opcao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  icone: { marginRight: 14 },
  texto: { ...tipografia.corpo, color: colors.pretoTexto },
  perigo: { color: colors.vermelhoAviso },
});
