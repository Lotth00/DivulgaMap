import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import CartaoAcessoNecessario from '../components/CartaoAcessoNecessario';
import colors from '../theme/colors';

export default function ContaScreen({ navigation }) {
  const { logado, usuario, sair } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image source={require('../../assets/images/logo-wordmark.png')} style={styles.wordmark} resizeMode="contain" />

      {logado ? (
        <View style={styles.areaLogada}>
          <Text style={styles.saudacao}>Olá, {usuario?.nome}</Text>
          <TouchableOpacity style={styles.botaoSair} onPress={sair}>
            <Text style={styles.textoBotaoSair}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.avatarWrapper}>
            <Ionicons name="person" size={30} color="#9A9A9A" />
          </View>
          <CartaoAcessoNecessario
            mensagem={'Para acessar seu perfil faça\nlogin ou crie uma conta'}
            navigation={navigation}
          />
        </>
      )}

      <Text style={styles.rodape}>Política de Privacidade</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brancoFundo, alignItems: 'center', paddingHorizontal: 33, paddingTop: 60, paddingBottom: 24 },
  wordmark: { width: 150, height: 36, marginBottom: 40 },
  avatarWrapper: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: colors.brancoFundo,
    alignItems: 'center', justifyContent: 'center', marginBottom: -44, zIndex: 2,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  rodape: { marginTop: 'auto', fontFamily: 'Poppins_400Regular', includeFontPadding: false, color: '#444', marginBottom: 12 },
  saudacao: { fontFamily: 'Poppins_600SemiBold', includeFontPadding: false, fontSize: 20, marginBottom: 20 },
  areaLogada: { alignItems: 'center', width: '100%' },
  botaoSair: { backgroundColor: colors.pretoTexto, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  textoBotaoSair: { fontFamily: 'Poppins_600SemiBold', includeFontPadding: false, color: colors.brancoFundo },
});