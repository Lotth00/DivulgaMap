import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import CartaoAcessoNecessario from '../components/CartaoAcessoNecessario';
import ItemMenu from '../components/ItemMenu';
import { useDadosUsuario, avisarEmBreve } from '../components/conta/util';
import MenuPopup from '../components/MenuPopup';
import { useMinhasEmpresas, abrirMinhaEmpresa, adicionarEmpresa, STATUS_EMPRESA } from './empresa/util';
import colors from '../theme/colors';
import tipografia, { fs } from '../theme/tipografia';

// Foto da pessoa ou o ícone padrão
function Avatar({ uri, tamanho = 88 }) {
  const estilo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.avatar, estilo]} />;
  return (
    <View style={[styles.avatar, styles.avatarVazio, estilo]}>
      <Ionicons name="person" size={tamanho * 0.45} color={colors.cinzaPlaceholder} />
    </View>
  );
}

// Aba Conta: saudação, Gerenciar sua Conta e o menu (Figma 118:905)
export default function ContaScreen({ navigation }) {
  const { logado, usuario } = useAuth();
  const { dados } = useDadosUsuario(logado);
  const insets = useSafeAreaInsets();
  const { empresas } = useMinhasEmpresas(logado);
  const [escolherEmpresa, setEscolherEmpresa] = useState(false);

  if (!logado) {
    return (
      <View style={[styles.tela, styles.centro, { paddingTop: insets.top + 40 }]}>
        <StatusBar style="dark" />
        <Image source={require('../../assets/images/logo-wordmark.png')} style={styles.wordmark} resizeMode="contain" />
        <View style={styles.avatarSemConta}>
          <Ionicons name="person" size={30} color="#9A9A9A" />
        </View>
        <CartaoAcessoNecessario
          mensagem={'Para acessar seu perfil faça\nlogin ou crie uma conta'}
          navigation={navigation}
        />
        <TouchableOpacity onPress={() => avisarEmBreve('A Política de Privacidade')} style={styles.rodape}>
          <Text style={styles.textoRodape}>Política de Privacidade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nome = usuario?.nome?.split(' ')[0] ?? '';

  // Item da empresa: adicionar, abrir a única ou escolher entre várias
  let itemEmpresa = { texto: 'Adicione sua empresa', onPress: () => adicionarEmpresa(navigation) };
  if (empresas.length === 1) {
    itemEmpresa = { texto: 'Minha empresa', onPress: () => abrirMinhaEmpresa(navigation, empresas[0]) };
  } else if (empresas.length > 1) {
    itemEmpresa = { texto: 'Minhas empresas', onPress: () => setEscolherEmpresa(true) };
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.email} numberOfLines={1}>{usuario?.email}</Text>
        <Avatar uri={dados?.foto_perfil_url} />
        <Text style={styles.ola}>Olá, {nome}!</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GerenciarConta')} style={styles.gerenciar} activeOpacity={0.8}>
          <Text style={styles.textoGerenciar}>Gerenciar sua Conta</Text>
        </TouchableOpacity>

        <View style={styles.grupo}>
          <ItemMenu
            texto="Trocar de conta"
            desativado
            direita={
              <View style={styles.trocar}>
                <Ionicons name="person-circle-outline" size={24} color={colors.pretoTexto} />
                <Ionicons name="person-circle-outline" size={24} color={colors.pretoTexto} />
                <View style={styles.setaTrocar}>
                  <Ionicons name="chevron-down" size={16} color={colors.pretoTexto} />
                </View>
              </View>
            }
          />
        </View>

        <View style={styles.grupo}>
          <ItemMenu icone={require('../../assets/images/icones/perfil.png')} texto="Seu perfil" posicao="primeiro" onPress={() => avisarEmBreve('Seu perfil')} />
          <ItemMenu icone={require('../../assets/images/icones/empresa.png')} texto={itemEmpresa.texto} posicao="ultimo" onPress={itemEmpresa.onPress} />
        </View>

        <View style={styles.grupo}>
          <ItemMenu icone={require('../../assets/images/icones/dados.png')} texto="Seus dados no DivulgaMap" posicao="primeiro" onPress={() => avisarEmBreve('Seus dados no DivulgaMap')} />
          <ItemMenu icone={require('../../assets/images/icones/configuracoes.png')} texto="Configurações" posicao="meio" onPress={() => avisarEmBreve('Configurações')} />
          <ItemMenu icone={require('../../assets/images/icones/ajuda.png')} texto="Ajuda e feedback" posicao="ultimo" onPress={() => avisarEmBreve('Ajuda e feedback')} />
        </View>

        <TouchableOpacity onPress={() => avisarEmBreve('A Política de Privacidade')} style={styles.rodape}>
          <Text style={styles.textoRodape}>Política de Privacidade</Text>
        </TouchableOpacity>
      </ScrollView>

      <MenuPopup
        visivel={escolherEmpresa}
        centralizado
        titulo="Qual empresa?"
        opcoes={empresas.map((empresa) => ({
          texto: empresa.nome_fantasia,
          detalhe: empresa.status === 'aprovada' ? null : STATUS_EMPRESA[empresa.status]?.rotulo ?? empresa.status,
          onPress: () => abrirMinhaEmpresa(navigation, empresa),
        }))}
        onFechar={() => setEscolherEmpresa(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  centro: { alignItems: 'center', paddingHorizontal: 33 },
  conteudo: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'stretch', flexGrow: 1 },
  email: { ...tipografia.corpoMedio, color: colors.textoSecundario, textAlign: 'center', marginBottom: 12 },
  avatar: { alignSelf: 'center', backgroundColor: colors.cinzaInput },
  avatarVazio: { alignItems: 'center', justifyContent: 'center' },
  ola: { ...tipografia.tituloTela, fontSize: fs(16), color: colors.pretoTexto, textAlign: 'center', marginTop: 10 },
  gerenciar: { alignSelf: 'center', backgroundColor: colors.pretoTexto, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 9, marginTop: 12, marginBottom: 20 },
  textoGerenciar: { ...tipografia.corpo, fontSize: fs(16), color: colors.brancoFundo },
  grupo: { marginBottom: 22 },
  trocar: { flexDirection: 'row', alignItems: 'center' },
  setaTrocar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.fundoTela, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  rodape: { marginTop: 'auto', alignSelf: 'center', paddingVertical: 12 },
  textoRodape: { ...tipografia.corpoMedio, fontSize: fs(14), color: colors.textoPrincipal },
  wordmark: { width: 150, height: 36, marginBottom: 40 },
  avatarSemConta: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: colors.brancoFundo,
    alignItems: 'center', justifyContent: 'center', marginBottom: -44, zIndex: 2,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
});
