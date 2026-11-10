import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import TelaMapaBase from '../components/TelaMapaBase';
import colors from '../theme/colors';

export default function ExplorarScreen() {
  const [empresas, setEmpresas] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const ultimaBusca = useRef(0);

  // Espera a pessoa parar de digitar antes de buscar
  useEffect(() => {
    const espera = setTimeout(buscarEmpresas, busca ? 400 : 0);
    return () => clearTimeout(espera);
  }, [busca, categoriaSelecionada]);

  async function buscarEmpresas() {
    const numeroDaBusca = ++ultimaBusca.current;
    setCarregando(true);
    setFalhou(false);
    try {
      const parametros = {};
      if (busca.trim()) parametros.busca = busca.trim();
      if (categoriaSelecionada) parametros.categoria = categoriaSelecionada;

      const resposta = await api.get('/empresas', { params: parametros });
      // Resposta de uma busca antiga é descartada
      if (numeroDaBusca === ultimaBusca.current) setEmpresas(resposta.data);
    } catch (erro) {
      console.error('Erro ao buscar empresas', erro);
      if (numeroDaBusca === ultimaBusca.current) setFalhou(true);
    } finally {
      if (numeroDaBusca === ultimaBusca.current) setCarregando(false);
    }
  }

  const pontos = empresas
    .filter((empresa) => empresa.latitude && empresa.longitude)
    .map((empresa) => ({
      id: empresa.id_empresa,
      latitude: parseFloat(empresa.latitude),
      longitude: parseFloat(empresa.longitude),
      titulo: empresa.nome_fantasia,
      descricao: empresa.categorias,
    }));

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <TelaMapaBase
        busca={busca}
        onMudarBusca={setBusca}
        categoriaSelecionada={categoriaSelecionada}
        onMudarCategoria={setCategoriaSelecionada}
        pontos={pontos}
      >
        <Text style={styles.titulo}>Empresas por perto</Text>

        {carregando && empresas.length === 0 ? (
          <ActivityIndicator color={colors.pretoTexto} />
        ) : falhou ? (
          <Text style={styles.textoVazio}>Não foi possível carregar as empresas. Confira sua conexão.</Text>
        ) : empresas.length === 0 ? (
          <Text style={styles.textoVazio}>Nenhuma empresa encontrada por aqui ainda.</Text>
        ) : (
          <FlatList
            data={empresas}
            keyExtractor={(item) => String(item.id_empresa)}
            renderItem={({ item }) => (
              <View style={styles.cardEmpresa}>
                <View style={styles.fotoPlaceholder} />
                <View>
                  <Text style={styles.nomeEmpresa}>{item.nome_fantasia}</Text>
                  <Text style={styles.categoriaEmpresa}>{item.categorias}</Text>
                </View>
              </View>
            )}
          />
        )}
      </TelaMapaBase>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 14 },
  textoVazio: { fontFamily: 'Poppins_400Regular', color: '#666' },
  cardEmpresa: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
  fotoPlaceholder: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.cinzaInput, marginRight: 12 },
  nomeEmpresa: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  categoriaEmpresa: { fontFamily: 'Poppins_400Regular', color: '#666', fontSize: 13 },
});
