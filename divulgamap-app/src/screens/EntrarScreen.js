import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

export default function EntrarScreen({ navigation }) {
  const { entrar } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    setCarregando(true);
    try {
      const resposta = await api.post('/auth/login', { email, senha });
      await entrar(resposta.data.token, resposta.data.usuario);
      navigation.navigate('Principal');
    } catch (erro) {
      Alert.alert('Erro', 'E-mail ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cinzaClaro }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          <ImageBackground
            source={require('../../assets/images/fundo-mapa-login.jpg')}
            style={[styles.header, { paddingTop: insets.top }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(199,255,120,0.55)', 'rgba(248,255,68,0.55)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Image source={require('../../assets/images/logo-wordmark.png')} style={styles.wordmark} resizeMode="contain" />
          </ImageBackground>

          <View style={styles.card}>
            <Text style={styles.titulo}>ENTRAR</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.cinzaPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={colors.cinzaPlaceholder}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />

            <TouchableOpacity onPress={() => { /* TODO: fluxo de recuperação de senha, ainda não existe no backend */ }}>
              <Text style={styles.linkEsqueceu}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={carregando}>
              <Text style={styles.textoBotao}>{carregando ? 'ENTRANDO...' : 'ENTRAR'}</Text>
            </TouchableOpacity>

            <View style={styles.divisor}>
              <View style={styles.linha} />
              <Text style={styles.textoOu}>OU</Text>
              <View style={styles.linha} />
            </View>

            <TouchableOpacity style={styles.botaoGoogle} onPress={() => { /* TODO: login com Google (OAuth), não tem no backend */ }}>
              <Text style={styles.textoBotaoGoogle}>ENTRAR COM GOOGLE</Text>
            </TouchableOpacity>

            <Text style={styles.linkCriar}>
              Ainda não tem uma conta?{' '}
              <Text style={styles.linkAzul} onPress={() => navigation.navigate('CriarConta')}>
                Clique aqui
              </Text>
            </Text>

            <View style={{ height: insets.bottom }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 230, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  wordmark: { width: 220, height: 55 },
  card: {
    flex: 1,
    backgroundColor: colors.cinzaClaro,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 24,
    paddingTop: 32,
  },
  titulo: { fontFamily: 'Koulen_400Regular', includeFontPadding: false, fontSize: 26, textAlign: 'center', marginBottom: 24 },
  input: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, backgroundColor: colors.cinzaInput, borderRadius: 10, padding: 14, marginBottom: 14 },
  linkEsqueceu: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, color: colors.azulLink, textDecorationLine: 'underline', marginBottom: 20 },
  botao: { backgroundColor: colors.pretoTexto, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  textoBotao: { fontFamily: 'Poppins_600SemiBold', includeFontPadding: false, color: colors.brancoFundo, fontSize: 15 },
  divisor: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  linha: { flex: 1, height: 1, backgroundColor: '#C9C9C9' },
  textoOu: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, marginHorizontal: 10, color: '#8A8A8A' },
  botaoGoogle: { backgroundColor: colors.cinzaBotaoGoogle, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  textoBotaoGoogle: { fontFamily: 'Poppins_600SemiBold', includeFontPadding: false, fontSize: 14 },
  linkCriar: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, textAlign: 'center' },
  linkAzul: { color: colors.azulLink, textDecorationLine: 'underline' },
});
