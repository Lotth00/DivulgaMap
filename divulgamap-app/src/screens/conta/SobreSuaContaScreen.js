import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import { useDadosUsuario } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TAMANHO_FOTO = 120;

// Data ISO → "Janeiro de 2025"
function mesEAno(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// Sobre sua conta (Figma 606:1588): foto, nome e data de entrada
export default function SobreSuaContaScreen({ navigation }) {
  const { dados, carregando, falhou, carregar } = useDadosUsuario(true);
  return (
    <TelaConta
      navigation={navigation}
      titulo="Sobre sua conta"
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
    >
      {dados && (
        <>
          {dados.foto_perfil_url ? (
            <Image source={{ uri: dados.foto_perfil_url }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.semFoto]}>
              <Ionicons name="person" size={TAMANHO_FOTO * 0.45} color={colors.cinzaPlaceholder} />
            </View>
          )}
          <Text style={styles.nome}>{dados.nome}</Text>
          <Text style={styles.texto}>
            Estas são as informações da sua conta no DivulgaMap. Para mudar os seus dados, use Gerenciar sua Conta.
          </Text>
          <CaixaGradiente estilo={styles.cartao} estiloConteudo={styles.cartaoConteudo}>
            <Ionicons name="calendar-outline" size={28} color={colors.textoSecundario} />
            <View style={styles.textosCartao}>
              <Text style={styles.rotulo}>Data de entrada</Text>
              <Text style={styles.valor}>{mesEAno(dados.data_cadastro)}</Text>
            </View>
          </CaixaGradiente>
          <CaixaGradiente estilo={styles.cartao} estiloConteudo={styles.cartaoConteudo}>
            <Ionicons name="mail-outline" size={28} color={colors.textoSecundario} />
            <View style={styles.textosCartao}>
              <Text style={styles.rotulo}>E-mail</Text>
              <Text style={styles.valor}>{dados.email}</Text>
            </View>
          </CaixaGradiente>
        </>
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  foto: { width: TAMANHO_FOTO, height: TAMANHO_FOTO, borderRadius: TAMANHO_FOTO / 2, alignSelf: 'center', marginTop: 12, backgroundColor: colors.cinzaInput },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  nome: { ...tipografia.tituloTela, fontSize: fs(20), color: colors.pretoTexto, textAlign: 'center', marginTop: 14 },
  texto: { ...tipografia.corpoMedio, color: colors.pretoTexto, textAlign: 'center', marginTop: 12, marginBottom: 18 },
  cartao: { borderRadius: 14, marginBottom: 12 },
  cartaoConteudo: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  textosCartao: { marginLeft: 14, flex: 1 },
  rotulo: { ...tipografia.corpo, color: colors.pretoTexto },
  valor: { ...tipografia.corpoMedio, color: colors.textoSecundario },
});
