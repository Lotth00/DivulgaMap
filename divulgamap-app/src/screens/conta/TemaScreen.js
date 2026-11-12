import React from 'react';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoRadio } from '../../components/conta/Opcoes';

// Tema (Figma 601:1443): por enquanto só o modo claro
export default function TemaScreen({ navigation }) {
  return (
    <TelaConta
      navigation={navigation}
      titulo="Tema"
      descricao="Escolha como o app aparece. O modo escuro e o padrão do sistema chegam numa próxima versão."
    >
      <Caixa cinza>
        <OpcaoRadio texto="Modo claro" marcada onPress={() => {}} />
        <OpcaoRadio texto="Modo escuro" detalhe="Em breve" marcada={false} desativada />
        <OpcaoRadio texto="Padrão do sistema" detalhe="Em breve" marcada={false} desativada />
      </Caixa>
    </TelaConta>
  );
}
