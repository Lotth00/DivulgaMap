import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import colors from '../theme/colors';

export default function LoadingScreen({ navigation }) {
  useEffect(() => {
    const temporizador = setTimeout(() => {
      navigation.replace('Welcome');
    }, 1200);

    return () => clearTimeout(temporizador);
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
