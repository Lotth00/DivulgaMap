import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WizardProvider } from '../../context/WizardContext';
import PerfilEmpresaWizardScreen from './PerfilEmpresaWizardScreen';
import TipoEmpresaScreen from './TipoEmpresaScreen';
import EnderecoEmpresaScreen from './EnderecoEmpresaScreen';
import ConfirmacaoEmpresaScreen from './ConfirmacaoEmpresaScreen';
import ContatoEmpresaScreen from './ContatoEmpresaScreen';

const Stack = createStackNavigator();

// Etapa onde um rascunho continua: sem endereço, no tipo; com endereço, nos contatos
function etapaInicial(rascunho) {
  if (!rascunho) return 'WizardPerfil';
  return rascunho.endereco ? 'WizardContato' : 'WizardTipo';
}

// Cadastro de empresa: as etapas dividem o mesmo rascunho
export default function CadastroEmpresa({ route }) {
  const rascunho = route.params?.rascunho ?? null;
  return (
    <WizardProvider rascunhoInicial={rascunho}>
      <Stack.Navigator initialRouteName={etapaInicial(rascunho)} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="WizardPerfil" component={PerfilEmpresaWizardScreen} />
        <Stack.Screen name="WizardTipo" component={TipoEmpresaScreen} />
        <Stack.Screen name="WizardEndereco" component={EnderecoEmpresaScreen} />
        <Stack.Screen name="WizardConfirmacao" component={ConfirmacaoEmpresaScreen} />
        <Stack.Screen name="WizardContato" component={ContatoEmpresaScreen} />
      </Stack.Navigator>
    </WizardProvider>
  );
}
