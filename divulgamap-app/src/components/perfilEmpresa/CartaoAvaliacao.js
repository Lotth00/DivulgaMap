import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Estrelas from '../Estrelas';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { tempoDesde } from './util';

// Uma avaliação: pessoa, nota, data, comentário e fotos
export default function CartaoAvaliacao({ avaliacao, largura, minha = false }) {
  const data = avaliacao.editado_em || avaliacao.criado_em;
  return (
    <View style={[styles.cartao, largura && { width: largura }]}>
      <View style={styles.pessoa}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={colors.textoSecundario} />
        </View>
        <Text style={styles.nome} numberOfLines={1}>{minha ? 'Você' : avaliacao.usuario_nome}</Text>
      </View>
      <View style={styles.linhaNota}>
        <Estrelas nota={avaliacao.nota} tamanho={16} />
        <Text style={styles.data}>{avaliacao.editado_em ? 'Editado ' : ''}{tempoDesde(data)}</Text>
      </View>
      {avaliacao.comentario ? <Text style={styles.comentario}>{avaliacao.comentario}</Text> : null}
      {avaliacao.fotos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotos}>
          {avaliacao.fotos.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.foto} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { backgroundColor: colors.cinzaInput, borderRadius: 20, padding: 16, marginBottom: 12, marginRight: 12 },
  pessoa: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brancoFundo, alignItems: 'center', justifyContent: 'center' },
  nome: { ...tipografia.corpo, fontSize: fs(14), color: colors.textoPrincipal, marginLeft: 10, flex: 1 },
  linhaNota: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  data: { ...tipografia.pequeno, fontSize: fs(10), color: colors.textoSecundario, marginLeft: 8 },
  comentario: { ...tipografia.corpoMedio, fontSize: fs(13), color: colors.textoPrincipal, marginTop: 6 },
  fotos: { marginTop: 10 },
  foto: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
});
