import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

const ICONES = {
  Salvos: 'bookmark',
  Conta: 'person',
};

export default function TabBarPersonalizada({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    
    <View>
      <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} style={styles.container}>
        {state.routes.map((rota, indice) => {
          const focada = state.index === indice;

          return (
            <TouchableOpacity
              key={rota.key}
              style={[styles.aba, focada && styles.abaAtiva]}
              onPress={() => navigation.navigate(rota.name)}
            >
              {rota.name === 'Explorar' ? (
                <Image source={require('../../assets/images/logo-pin.png')} style={styles.iconePin} resizeMode="contain" />
              ) : (
                <Ionicons name={ICONES[rota.name]} size={22} color={colors.pretoTexto} />
              )}
              <Text style={styles.rotulo}>{rota.name}</Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
      <View style={{ height: insets.bottom, backgroundColor: colors.pretoTexto }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingTop: 14, paddingBottom: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 8, borderRadius: 16 },
  abaAtiva: { backgroundColor: '#A4E344' },
  iconePin: { width: 20, height: 22, marginBottom: 2 },
  rotulo: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 4, color: colors.pretoTexto },
});
