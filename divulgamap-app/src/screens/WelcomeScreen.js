import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../assets/images/fundo-mapa-apagado.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="dark" />

      <ImageBackground
        source={require('../../assets/images/fundo-bolhas.png')}
        style={styles.bolhas}
        resizeMode="cover"
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
          />
          <View style={styles.wrapperIlustracao}>
            <Image
              source={require('../../assets/images/welcome-illustration.png')}
              style={styles.ilustracao}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitulo}>
            Aqui você encontra tudo que precisa sobre todos os negócios de Taquara
          </Text>
          <TouchableOpacity style={styles.botao} onPress={() => navigation.replace('Principal')}>
            <Text style={styles.textoBotao}>Continuar</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    fontSize: 30,
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
    fontSize: 16,
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
    fontSize: 16,
  },
});