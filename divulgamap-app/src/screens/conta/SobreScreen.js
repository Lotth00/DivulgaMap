import React from 'react';
import { Text, StyleSheet } from 'react-native';
import configuracaoDoApp from '../../../app.json';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoSeta } from '../../components/conta/Opcoes';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Sobre (Figma 605:1541)
export default function SobreScreen({ navigation }) {
  const versao = configuracaoDoApp.expo?.version;
  return (
    <TelaConta
      navigation={navigation}
      titulo="Sobre"
      descricao="O DivulgaMap mostra no mapa as empresas, os produtos e as ofertas de Taquara, para você achar o que precisa perto de casa."
    >
      <Caixa cinza>
        <OpcaoSeta texto="Sobre sua conta" onPress={() => navigation.navigate('SobreSuaConta')} />
        <OpcaoSeta texto="Política de privacidade" onPress={() => navigation.navigate('TextoLegal', { tipo: 'privacidade' })} />
        <OpcaoSeta texto="Termos de uso" onPress={() => navigation.navigate('TextoLegal', { tipo: 'termos' })} />
      </Caixa>
      {versao ? <Text style={styles.versao}>Versão {versao}</Text> : null}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  versao: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center', marginTop: 20 },
});
