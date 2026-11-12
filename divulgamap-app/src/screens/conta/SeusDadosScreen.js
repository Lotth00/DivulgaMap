import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, TituloCaixa, OpcaoSeta, Paragrafo } from '../../components/conta/Opcoes';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Seus dados no DivulgaMap (Figma 588:1076): atividades, o que fica na conta e a política
export default function SeusDadosScreen({ navigation }) {
  return (
    <TelaConta
      navigation={navigation}
      titulo="Seus dados no DivulgaMap"
      descricao="Veja o que o DivulgaMap guarda sobre você e acesse as suas atividades no app."
    >
      <Caixa cinza estilo={styles.bloco}>
        <TituloCaixa texto="Suas atividades" />
        <OpcaoSeta texto="Salvos" onPress={() => navigation.navigate('Principal', { screen: 'Salvos' })} />
        <OpcaoSeta texto="Avaliações" onPress={() => navigation.navigate('SeuPerfil')} />
        <OpcaoSeta texto="Histórico" onPress={() => navigation.navigate('Historico')} />
      </Caixa>

      <Caixa cinza estilo={styles.bloco}>
        <TituloCaixa texto="Sua conta" />
        <Paragrafo>
          Guardamos o seu nome, e-mail, telefone, data de nascimento, foto e biografia, além das suas listas, avaliações e
          do histórico das últimas buscas e itens vistos. Você pode mudar os dados em Gerenciar sua Conta, apagar o
          histórico a qualquer momento ou excluir a conta inteira.
        </Paragrafo>
      </Caixa>

      <Caixa cinza estilo={styles.bloco}>
        <TituloCaixa texto="Política de privacidade" />
        <Paragrafo>
          Seus dados servem só para o app funcionar e mostrar o que combina com você. Não vendemos nem compartilhamos com
          outras empresas, e a sua localização não fica guardada.
        </Paragrafo>
        <TouchableOpacity onPress={() => navigation.navigate('TextoLegal', { tipo: 'privacidade' })} style={styles.link}>
          <Text style={styles.textoLink}>Ler a política completa</Text>
        </TouchableOpacity>
      </Caixa>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: 16 },
  link: { paddingBottom: 10 },
  textoLink: { ...tipografia.corpoMedio, color: colors.verdePreco, textDecorationLine: 'underline' },
});
