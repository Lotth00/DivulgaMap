import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WizardProvider } from '../../context/WizardContext';
import PerfilEmpresaWizardScreen from './PerfilEmpresaWizardScreen';
import TipoEmpresaScreen from './TipoEmpresaScreen';
import EnderecoEmpresaScreen from './EnderecoEmpresaScreen';
import ConfirmacaoEmpresaScreen from './ConfirmacaoEmpresaScreen';
import ContatoEmpresaScreen from './ContatoEmpresaScreen';
import MetodoVerificacaoScreen from './MetodoVerificacaoScreen';
import VerificacaoCodigoScreen from './VerificacaoCodigoScreen';
import HorarioEmpresaScreen from './HorarioEmpresaScreen';
import DescricaoEmpresaScreen from './DescricaoEmpresaScreen';
import FotosEmpresaScreen from './FotosEmpresaScreen';
import PlanilhaEmpresaScreen from './PlanilhaEmpresaScreen';
import RevisaoEmpresaScreen from './RevisaoEmpresaScreen';
import EnviadoEmpresaScreen from './EnviadoEmpresaScreen';
import VerificadoEmpresaScreen from './VerificadoEmpresaScreen';

const Stack = createStackNavigator();

// Etapa onde um rascunho continua: sem endereço, no tipo; com endereço, nos contatos; verificado, no horário
function etapaInicial(rascunho) {
  if (!rascunho) return 'WizardPerfil';
  if (rascunho.verificado_em) return 'WizardHorario';
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
        <Stack.Screen name="WizardMetodo" component={MetodoVerificacaoScreen} />
        <Stack.Screen name="WizardVerificacao" component={VerificacaoCodigoScreen} />
        <Stack.Screen name="WizardVerificado" component={VerificadoEmpresaScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="WizardHorario" component={HorarioEmpresaScreen} />
        <Stack.Screen name="WizardDescricao" component={DescricaoEmpresaScreen} />
        <Stack.Screen name="WizardFotos" component={FotosEmpresaScreen} />
        <Stack.Screen name="WizardPlanilha" component={PlanilhaEmpresaScreen} />
        <Stack.Screen name="WizardRevisao" component={RevisaoEmpresaScreen} />
        <Stack.Screen name="WizardEnviado" component={EnviadoEmpresaScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
    </WizardProvider>
  );
}
