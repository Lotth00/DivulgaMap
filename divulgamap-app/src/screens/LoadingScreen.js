import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';
import { CHAVE_WELCOME_VISTA } from './WelcomeScreen';

const TEMPO_MINIMO = 1200;

// Abertura: Welcome só na primeira vez; depois, direto para o Explorar
export default function LoadingScreen({ navigation }) {
  useEffect(() => {
    let ativo = true;
    const espera = new Promise((resolver) => setTimeout(resolver, TEMPO_MINIMO));
    const leitura = AsyncStorage.getItem(CHAVE_WELCOME_VISTA).catch(() => null);

    Promise.all([leitura, espera]).then(([vista]) => {
      if (ativo) navigation.replace(vista ? 'Principal' : 'Welcome');
    });

    return () => { ativo = false; };
  }, []);

  return (
    <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} style={styles.container}>
      <StatusBar style="dark" />
      <Image source={require('../../assets/images/logo-pin.png')} style={styles.logo} resizeMode="contain" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 90, height: 100 },
});
