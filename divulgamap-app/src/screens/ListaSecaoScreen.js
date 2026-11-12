import React from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Cabecalho from '../components/Cabecalho';
import CartaoOferta from '../components/CartaoOferta';
import CartaoServico from '../components/CartaoServico';
import CartaoPromocao from '../components/CartaoPromocao';
import CartaoEmpresa from '../components/CartaoEmpresa';
import EstadoVazio from '../components/EstadoVazio';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const MARGEM = 20;
const ESPACO = 12;

// Lista completa de uma seção do Explorar ("Ver mais")
export default function ListaSecaoScreen({ route, navigation }) {
  const { titulo, tipo, itens = [] } = route.params;
  const { width } = useWindowDimensions();
  const emGrade = tipo === 'oferta' || tipo === 'servico';
  const larguraGrade = (width - MARGEM * 2 - ESPACO) / 2;
  const larguraInteira = width - MARGEM * 2;

  function renderizar({ item }) {
    if (tipo === 'oferta') {
      return <CartaoOferta oferta={item} largura={larguraGrade} onPress={() => navigation.push('Oferta', { id: item.id, oferta: item })} />;
    }
    if (tipo === 'servico') {
      return (
        <CartaoServico
          servico={item}
          largura={larguraGrade}
          onPress={() => (item.oferta_id
            ? navigation.push('Oferta', { id: item.oferta_id })
            : navigation.push('Empresa', { id: item.empresa_id, aba: 'cardapio', produtoId: item.id_produto }))}
        />
      );
    }
    if (tipo === 'promocao') {
      return <CartaoPromocao oferta={item} largura={larguraInteira} onPress={() => navigation.push('Oferta', { id: item.id, oferta: item })} />;
    }
    return <CartaoEmpresa empresa={item} largura={larguraInteira} onPress={() => navigation.push('Empresa', { id: item.id_empresa })} />;
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} />
      <FlatList
        data={itens}
        key={emGrade ? 'grade' : 'lista'}
        numColumns={emGrade ? 2 : 1}
        keyExtractor={(item, indice) => String(item.id ?? item.id_produto ?? item.id_empresa ?? indice)}
        renderItem={renderizar}
        columnWrapperStyle={emGrade ? styles.linha : undefined}
        contentContainerStyle={styles.conteudo}
        ListHeaderComponent={<Text style={styles.titulo}>{titulo}</Text>}
        ListEmptyComponent={<EstadoVazio mensagem="Nada por aqui agora." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: MARGEM, paddingBottom: 40 },
  titulo: { ...tipografia.tituloTela, color: colors.pretoTexto, borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara, paddingBottom: 6, marginBottom: 14 },
  linha: { marginBottom: ESPACO },
});
