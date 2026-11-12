import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Image, ImageBackground, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import colors from '../theme/colors';
import { fs } from '../theme/tipografia';

export default function CriarContaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleCriarConta() {
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    setCarregando(true);
    try {
      await api.post('/auth/cadastro', { nome, email, senha });
      Alert.alert('Sucesso', 'Conta criada! Agora faça login.');
      navigation.navigate('Entrar');
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || 'Não foi possível criar a conta.';
      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cinzaClaro }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={require('../../assets/images/fundo-mapa-criar-conta.jpg')}
            style={[styles.header, { paddingTop: insets.top }]}
            resizeMode="cover"
          >
            {/* Mesmo degradê da tela de Entrar, um pouco mais escuro (a referência do
                Figma pra Criar Conta usa um mapa mais escurecido) — e sem o pin solto,
                pelo mesmo motivo: o wordmark já inclui o ícone. */}
            <LinearGradient
              colors={['rgba(150,199,80,0.6)', 'rgba(200,206,50,0.6)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Image source={require('../../assets/images/logo-wordmark.png')} style={styles.wordmark} resizeMode="contain" />
          </ImageBackground>

          <View style={styles.card}>
            <Text style={styles.titulo}>CRIAR</Text>

            <TextInput style={styles.input} placeholder="Nome" placeholderTextColor={colors.cinzaPlaceholder} value={nome} onChangeText={setNome} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.cinzaPlaceholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={colors.cinzaPlaceholder} value={senha} onChangeText={setSenha} secureTextEntry />
            <TextInput style={styles.input} placeholder="Digite novamente sua senha" placeholderTextColor={colors.cinzaPlaceholder} value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />

            <TouchableOpacity style={styles.botao} onPress={handleCriarConta} disabled={carregando}>
              <Text style={styles.textoBotao}>{carregando ? 'CRIANDO...' : 'CRIAR CONTA'}</Text>
            </TouchableOpacity>

            <Text style={styles.linkCriar}>
              Você já tem uma conta?{' '}
              <Text style={styles.linkAzul} onPress={() => navigation.navigate('Entrar')}>
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
  titulo: { fontFamily: 'Koulen_400Regular', includeFontPadding: false, fontSize: fs(26), textAlign: 'center', marginBottom: 24 },
  input: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, backgroundColor: colors.cinzaInput, borderRadius: 10, padding: 14, marginBottom: 14 },
  botao: { backgroundColor: colors.pretoTexto, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  textoBotao: { fontFamily: 'Poppins_600SemiBold', includeFontPadding: false, color: colors.brancoFundo, fontSize: fs(15) },
  linkCriar: { fontFamily: 'Poppins_400Regular', includeFontPadding: false, textAlign: 'center' },
  linkAzul: { color: colors.azulLink, textDecorationLine: 'underline' },
});
