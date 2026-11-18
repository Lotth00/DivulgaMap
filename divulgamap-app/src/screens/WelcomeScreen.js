import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';
import { fs } from '../theme/tipografia';

// Marca que a Welcome já foi vista neste aparelho
export const CHAVE_WELCOME_VISTA = '@divulgamap:welcomeVista';

// Fundo, bolhas, logo e ilustração: a tela só aparece quando as quatro carregarem
const TOTAL_IMAGENS = 4;
const ESPERA_MAXIMA = 2500;

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [carregadas, setCarregadas] = useState(0);
  const opacidade = useRef(new Animated.Value(0)).current;
  const pronta = carregadas >= TOTAL_IMAGENS;
  const aoCarregar = useCallback(() => setCarregadas((n) => n + 1), []);

  // Se alguma imagem demorar demais, mostra assim mesmo
  useEffect(() => {
    const relogio = setTimeout(() => setCarregadas(TOTAL_IMAGENS), ESPERA_MAXIMA);
    return () => clearTimeout(relogio);
  }, []);

  // Tudo carregado: aparece de uma vez
  useEffect(() => {
    if (pronta) Animated.timing(opacidade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [pronta]);

  async function continuar() {
    await AsyncStorage.setItem(CHAVE_WELCOME_VISTA, '1').catch(() => {});
    navigation.replace('Principal');
  }

  return (
    <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} style={styles.container}>
      <StatusBar style="dark" />
      {!pronta && (
        <View style={styles.espera}>
          <Image source={require('../../assets/images/logo-pin.png')} style={styles.logoEspera} resizeMode="contain" />
        </View>
      )}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacidade }]} pointerEvents={pronta ? 'auto' : 'none'}>
        <ImageBackground
          source={require('../../assets/images/fundo-mapa-apagado.jpg')}
          style={styles.container}
          resizeMode="cover"
          onLoadEnd={aoCarregar}
        >
          <ImageBackground
            source={require('../../assets/images/fundo-bolhas.png')}
            style={styles.bolhas}
            resizeMode="cover"
            onLoadEnd={aoCarregar}
          >
      
            <ScrollView
              contentContainerStyle={[
                styles.conteudo,
                { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.tituloKoulen}>BEM VINDO AO</Text>
              <Image
                source={require('../../assets/images/logo-wordmark.png')}
                style={styles.wordmark}
                resizeMode="contain"
                onLoadEnd={aoCarregar}
              />
              <View style={styles.wrapperIlustracao}>
                <Image
                  source={require('../../assets/images/welcome-illustration.png')}
                  style={styles.ilustracao}
                  resizeMode="contain"
                  onLoadEnd={aoCarregar}
                />
              </View>
              <Text style={styles.subtitulo}>
                Aqui você encontra tudo que precisa sobre todos os negócios de Taquara
              </Text>
              <TouchableOpacity style={styles.botao} onPress={continuar}>
                <Text style={styles.textoBotao}>Continuar</Text>
              </TouchableOpacity>
            </ScrollView>
          </ImageBackground>
        </ImageBackground>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  espera: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  logoEspera: { width: 90, height: 100 },
  bolhas: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloKoulen: {
    fontFamily: 'Koulen_400Regular', includeFontPadding: false,
    fontSize: fs(30),
    color: colors.pretoTexto,
    textAlign: 'center',
  },
  wordmark: {
    width: 260,
    height: 65,
    marginTop: 4,
    marginBottom: 12,
  },
  wrapperIlustracao: {
    width: '100%',
    marginBottom: 24,
  },
  ilustracao: {
   width: '100%',
  height: undefined,
  aspectRatio: 1720 / 1090,
  resizeMode: 'stretch'
  },
  subtitulo: {
    fontFamily: 'Poppins_400Regular', includeFontPadding: false,
    fontSize: fs(16),
    textAlign: 'center',
    color: colors.pretoTexto,
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  botao: {
    backgroundColor: colors.pretoTexto,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '85%',
  },
  textoBotao: {
    fontFamily: 'Poppins_600SemiBold', includeFontPadding: false,
    color: colors.brancoFundo,
    fontSize: fs(16),
  },
});