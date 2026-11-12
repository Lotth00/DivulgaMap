import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoadingScreen from '../screens/LoadingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import EntrarScreen from '../screens/EntrarScreen';
import CriarContaScreen from '../screens/CriarContaScreen';
import ExplorarScreen from '../screens/ExplorarScreen';
import SalvosScreen from '../screens/SalvosScreen';
import ContaScreen from '../screens/ContaScreen';
import OfertaScreen from '../screens/OfertaScreen';
import PesquisaScreen from '../screens/PesquisaScreen';
import PerfilEmpresaScreen from '../screens/PerfilEmpresaScreen';
import ListaDetalheScreen from '../screens/ListaDetalheScreen';
import GerenciarContaScreen from '../screens/conta/GerenciarContaScreen';
import DadosPessoaisScreen from '../screens/conta/DadosPessoaisScreen';
import ContatosScreen from '../screens/conta/ContatosScreen';
import DataNascimentoScreen from '../screens/conta/DataNascimentoScreen';
import ExcluirContaScreen from '../screens/conta/ExcluirContaScreen';
import SenhaSegurancaScreen from '../screens/conta/SenhaSegurancaScreen';
import TrocarSenhaScreen from '../screens/conta/TrocarSenhaScreen';
import CadastroEmpresa from '../screens/wizard';
import StatusEmpresaScreen from '../screens/empresa/StatusEmpresaScreen';
import PromocaoFormScreen from '../screens/empresa/PromocaoFormScreen';
import EditarEmpresaScreen from '../screens/empresa/EditarEmpresaScreen';
import ListaSecaoScreen from '../screens/ListaSecaoScreen';
import FilaAprovacaoScreen from '../screens/admin/FilaAprovacaoScreen';
import MeusAnunciosScreen from '../screens/empresa/MeusAnunciosScreen';
import ImpulsionarScreen from '../screens/empresa/ImpulsionarScreen';
import MetricasScreen from '../screens/empresa/MetricasScreen';
import SeuPerfilScreen from '../screens/conta/SeuPerfilScreen';
import EditarPerfilScreen from '../screens/conta/EditarPerfilScreen';
import ImagemPerfilScreen from '../screens/conta/ImagemPerfilScreen';
import TabBarPersonalizada from './TabBarPersonalizada';

const Stack = createStackNavigator();
const Tabs = createBottomTabNavigator();

function AreaPrincipal() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBarPersonalizada {...props} />}>
      <Tabs.Screen name="Explorar" component={ExplorarScreen} />
      <Tabs.Screen name="Salvos" component={SalvosScreen} />
      <Tabs.Screen name="Conta" component={ContaScreen} />
    </Tabs.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Principal" component={AreaPrincipal} />
        <Stack.Screen name="Entrar" component={EntrarScreen} />
        <Stack.Screen name="CriarConta" component={CriarContaScreen} />
        <Stack.Screen name="Oferta" component={OfertaScreen} />
        <Stack.Screen name="Pesquisa" component={PesquisaScreen} />
        <Stack.Screen name="Empresa" component={PerfilEmpresaScreen} />
        <Stack.Screen name="ListaDetalhe" component={ListaDetalheScreen} />
        <Stack.Screen name="GerenciarConta" component={GerenciarContaScreen} />
        <Stack.Screen name="DadosPessoais" component={DadosPessoaisScreen} />
        <Stack.Screen name="Contatos" component={ContatosScreen} />
        <Stack.Screen name="DataNascimento" component={DataNascimentoScreen} />
        <Stack.Screen name="ExcluirConta" component={ExcluirContaScreen} />
        <Stack.Screen name="SenhaSeguranca" component={SenhaSegurancaScreen} />
        <Stack.Screen name="TrocarSenha" component={TrocarSenhaScreen} />
        <Stack.Screen name="CadastroEmpresa" component={CadastroEmpresa} />
        <Stack.Screen name="StatusEmpresa" component={StatusEmpresaScreen} />
        <Stack.Screen name="PromocaoForm" component={PromocaoFormScreen} />
        <Stack.Screen name="EditarEmpresa" component={EditarEmpresaScreen} />
        <Stack.Screen name="ListaSecao" component={ListaSecaoScreen} />
        <Stack.Screen name="FilaAprovacao" component={FilaAprovacaoScreen} />
        <Stack.Screen name="MeusAnuncios" component={MeusAnunciosScreen} />
        <Stack.Screen name="Impulsionar" component={ImpulsionarScreen} />
        <Stack.Screen name="Metricas" component={MetricasScreen} />
        <Stack.Screen name="SeuPerfil" component={SeuPerfilScreen} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
        <Stack.Screen name="ImagemPerfil" component={ImagemPerfilScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}