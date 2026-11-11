import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const OPCOES = [
  { valor: 'comercio', icone: 'storefront', titulo: 'Comércio', texto: 'Os clientes encontram e compram seus produtos físicos no catálogo' },
  { valor: 'servico', icone: 'construct', titulo: 'Serviços', texto: 'Os clientes agendam ou solicitam a prestação do seu trabalho especializado' },
  { valor: 'ambos', icone: 'business', titulo: 'Comércio e serviços', texto: 'Você vende produtos e também presta serviços' },
];

// Cartão de opção (Figma "Opção1/Opção2"): borda cinza ou, escolhido, borda e fundo em degradê
function CartaoOpcao({ opcao, escolhida, onPress }) {
  const conteudo = (
    <>
      <View style={styles.icone}>
        <Ionicons name={opcao.icone} size={20} color={colors.pretoTexto} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{opcao.titulo}</Text>
        <Text style={styles.texto}>{opcao.texto}</Text>
      </View>
    </>
  );
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.espaco} accessibilityRole="radio" accessibilityState={{ selected: escolhida }}>
      {escolhida ? (
        <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bordaEscolhida}>
          <LinearGradient colors={[colors.padraoInicio, colors.padraoFim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cartaoDentro}>
            {conteudo}
          </LinearGradient>
        </LinearGradient>
      ) : (
        <View style={styles.cartao}>{conteudo}</View>
      )}
    </TouchableOpacity>
  );
}

// Etapa 2 (Figma 619:1169): comércio, serviços ou os dois
export default function TipoEmpresaScreen({ navigation }) {
  const { empresa, salvar } = useWizard();
  const [tipo, setTipo] = useState(empresa?.endereco ? empresa.tipo : null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function avancar() {
    setErro(null);
    setEnviando(true);
    try {
      await salvar({ tipo });
      navigation.navigate('WizardEndereco');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={2}
      titulo="Escolhendo o tipo de sua empresa"
      descricao="Isso ajuda as pessoas a encontrarem você na busca e nos filtros."
      erro={erro}
      podeAvancar={!!tipo}
      enviando={enviando}
      onAvancar={avancar}
    >
      {OPCOES.map((opcao) => (
        <CartaoOpcao key={opcao.valor} opcao={opcao} escolhida={tipo === opcao.valor} onPress={() => setTipo(opcao.valor)} />
      ))}
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  espaco: { marginBottom: 12 },
  cartao: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.fundoCaixa,
    borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  bordaEscolhida: { borderRadius: 12, padding: 2 },
  cartaoDentro: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12 },
  icone: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gradienteBase, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, marginLeft: 18 },
  titulo: { ...tipografia.corpo, color: colors.pretoTexto },
  texto: { ...tipografia.legenda, fontSize: fs(12), color: colors.textoSecundario },
});
