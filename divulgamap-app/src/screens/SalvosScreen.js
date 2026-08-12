import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import CartaoAcessoNecessario from '../components/CartaoAcessoNecessario';
import TelaMapaBase from '../components/TelaMapaBase';

export default function SalvosScreen({ navigation }) {
  const { logado } = useAuth();
  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <TelaMapaBase
        busca={busca}
        onMudarBusca={setBusca}
        categoriaSelecionada={categoriaSelecionada}
        onMudarCategoria={setCategoriaSelecionada}
      >
        <Text style={styles.titulo}>Salvos</Text>

        {logado ? (
          // TODO: lista de favoritos de verdade — por enquanto só confirma que a pessoa está logada
          <Text style={styles.textoSimples}>Seus favoritos aparecem aqui.</Text>
        ) : (
          <CartaoAcessoNecessario
            mensagem={'Para acessar seus favoritos faça\nlogin ou crie uma conta'}
            navigation={navigation}
          />
        )}
      </TelaMapaBase>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, marginBottom: 20 },
  textoSimples: { fontFamily: 'Poppins_400Regular', color: '#666' },
});
