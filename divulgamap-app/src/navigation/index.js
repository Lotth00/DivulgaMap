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
      </Stack.Navigator>
    </NavigationContainer>
  );
}