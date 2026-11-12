import React from 'react';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoSeta } from '../../components/conta/Opcoes';

// Ajuda e feedback (Figma 606:1625)
export default function AjudaFeedbackScreen({ navigation }) {
  return (
    <TelaConta
      navigation={navigation}
      titulo="Ajuda e feedback"
      descricao="Tire suas dúvidas sobre o app ou fale com a equipe do DivulgaMap."
    >
      <Caixa>
        <OpcaoSeta texto="Ajuda" detalhe="Respostas para as dúvidas mais comuns sobre o app." onPress={() => navigation.navigate('Ajuda')} />
        <OpcaoSeta
          texto="Relatar problema"
          detalhe="Algo não funcionou? Conte o que aconteceu para corrigirmos."
          onPress={() => navigation.navigate('Feedback', { tipo: 'problema' })}
        />
        <OpcaoSeta
          texto="Fazer uma sugestão"
          detalhe="Tem uma ideia para melhorar o DivulgaMap? Queremos saber."
          onPress={() => navigation.navigate('Feedback', { tipo: 'sugestao' })}
        />
      </Caixa>
    </TelaConta>
  );
}
