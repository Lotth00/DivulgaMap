import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoChave, Chave } from '../../components/conta/Opcoes';
import { useDadosUsuario, atualizarDados } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const ASSUNTOS = [
  { chave: 'ofertas_gerais', texto: 'Ofertas gerais', detalhe: 'Receba notificações sobre promoções e descontos especiais disponíveis.' },
  { chave: 'empresas_proximas', texto: 'Promoções de empresas próximas', detalhe: 'Fique por dentro das ofertas exclusivas das empresas que estão perto de você.' },
  { chave: 'recomendacoes', texto: 'Recomendações personalizadas', detalhe: 'Receba sugestões de promoções feitas especialmente para você.' },
];
const PADRAO = { ofertas_gerais: true, empresas_proximas: true, recomendacoes: true };

// Notificações (Figma 536:1036): chave geral e por assunto, guardadas na conta
export default function NotificacoesScreen({ navigation }) {
  const { dados, carregando, falhou, carregar } = useDadosUsuario(true);
  const [geral, setGeral] = useState(true);
  const [assuntos, setAssuntos] = useState(PADRAO);

  useEffect(() => {
    if (!dados) return;
    setGeral(dados.notificacoes_ativas !== false);
    setAssuntos({ ...PADRAO, ...(dados.preferencias_notificacao ?? {}) });
  }, [dados]);

  // Muda na hora e volta atrás se o servidor recusar
  async function mudarGeral(valor) {
    const anterior = geral;
    setGeral(valor);
    if (!(await atualizarDados({ notificacoes_ativas: valor }))) setGeral(anterior);
  }

  async function mudarAssunto(chave, valor) {
    const anteriores = assuntos;
    const novos = { ...assuntos, [chave]: valor };
    setAssuntos(novos);
    if (!(await atualizarDados({ preferencias_notificacao: novos }))) setAssuntos(anteriores);
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Notificações"
      acaoTitulo={dados ? <Chave ligada={geral} onMudar={mudarGeral} rotulo="Todas as notificações" /> : null}
      descricao="Escolha sobre o que você quer ser avisado. A chave do título liga ou desliga todas."
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
    >
      <Caixa>
        {ASSUNTOS.map((a) => (
          <OpcaoChave
            key={a.chave}
            texto={a.texto}
            detalhe={a.detalhe}
            ligada={geral && assuntos[a.chave]}
            desativada={!geral}
            onMudar={(valor) => mudarAssunto(a.chave, valor)}
          />
        ))}
      </Caixa>
      <Text style={styles.aviso}>
        Nesta versão, as escolhas ficam guardadas na sua conta; o envio das notificações chega quando o app for publicado nas lojas.
      </Text>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  aviso: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 14 },
});
