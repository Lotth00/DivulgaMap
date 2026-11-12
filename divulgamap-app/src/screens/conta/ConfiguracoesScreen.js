import React from 'react';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoSeta } from '../../components/conta/Opcoes';

// Configurações (Figma 599:1397)
export default function ConfiguracoesScreen({ navigation }) {
  return (
    <TelaConta
      navigation={navigation}
      titulo="Configurações"
      descricao="Escolha a aparência do app, o que você quer receber de notificação e veja as informações sobre o DivulgaMap."
    >
      <Caixa>
        <OpcaoSeta texto="Tema" onPress={() => navigation.navigate('Tema')} />
        <OpcaoSeta texto="Notificações" onPress={() => navigation.navigate('Notificacoes')} />
        <OpcaoSeta texto="Sobre" onPress={() => navigation.navigate('Sobre')} />
      </Caixa>
    </TelaConta>
  );
}
