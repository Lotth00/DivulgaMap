import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

export default function CartaoAcessoNecessario({ mensagem, navigation }) {
  return (
  
    <LinearGradient
      colors={['rgba(199,255,120,0.8)', 'rgba(248,255,68,0.8)']}
      style={styles.cartao}
    >
      <Text style={styles.mensagem}>{mensagem}</Text>

      <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('Entrar')}>
        <Text style={styles.textoBotao}>ENTRAR</Text>
      </TouchableOpacity>

      <View style={styles.divisor}>
        <View style={styles.linha} />
        <Text style={styles.textoOu}>OU</Text>
        <View style={styles.linha} />
      </View>

      <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('CriarConta')}>
        <Text style={styles.textoBotao}>CADASTRAR-SE</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cartao: { borderRadius: 24, padding: 20, width: '100%', maxWidth: 364, alignSelf: 'center' },
  mensagem: { fontFamily: 'Poppins_500Medium', fontSize: 15, textAlign: 'center', marginBottom: 16, color: colors.pretoTexto },
  botao: { backgroundColor: colors.pretoTexto, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  textoBotao: { fontFamily: 'Poppins_600SemiBold', color: colors.brancoFundo, fontSize: 14, letterSpacing: 0.5 },
  divisor: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  linha: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  textoOu: { fontFamily: 'Poppins_400Regular', marginHorizontal: 10, color: colors.pretoTexto },
});