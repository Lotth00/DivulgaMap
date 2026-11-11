import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import TelaConta from '../../components/conta/TelaConta';
import CaixaGradiente from '../../components/CaixaGradiente';
import ItemMenu from '../../components/ItemMenu';
import PopupSair from '../../components/PopupSair';
import { useDadosUsuario, avisarEmBreve } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Gerenciando sua Conta (Figma 492:3507)
export default function GerenciarContaScreen({ navigation }) {
  const { usuario, sair } = useAuth();
  const { dados } = useDadosUsuario();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  async function confirmarSaida() {
    setConfirmandoSaida(false);
    await sair();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Gerenciando sua Conta"
      descricao="Cuide dos seus dados, da segurança e da privacidade da sua conta no DivulgaMap."
      centralizado
    >
      <TouchableOpacity onPress={() => avisarEmBreve('Seu perfil')} activeOpacity={0.8}>
        <CaixaGradiente estiloConteudo={styles.perfil}>
          {dados?.foto_perfil_url ? (
            <Image source={{ uri: dados.foto_perfil_url }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoVazia]}>
              <Ionicons name="person" size={28} color={colors.cinzaPlaceholder} />
            </View>
          )}
          <View style={styles.textosPerfil}>
            <Text style={styles.rotuloPerfil}>Perfil</Text>
            <Text style={styles.nome} numberOfLines={1}>{usuario?.nome}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.pretoTexto} />
        </CaixaGradiente>
      </TouchableOpacity>

      <View style={styles.grupo}>
        <ItemMenu icone="id-card-outline" texto="Dados pessoais" posicao="primeiro" onPress={() => navigation.navigate('DadosPessoais')} />
        <ItemMenu icone="shield-outline" texto="Senha e segurança" posicao="meio" onPress={() => navigation.navigate('SenhaSeguranca')} />
        <ItemMenu icone="lock-closed-outline" texto="Privacidade da conta" posicao="meio" onPress={() => avisarEmBreve('Privacidade da conta')} />
        <ItemMenu icone="notifications-outline" texto="Notificações" posicao="ultimo" onPress={() => avisarEmBreve('Notificações')} />
      </View>

      <View style={styles.divisoria} />

      <TouchableOpacity onPress={() => avisarEmBreve('Adicionar outra conta')} style={styles.link}>
        <Text style={styles.adicionar}>Adicionar conta</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setConfirmandoSaida(true)} style={styles.link}>
        <Text style={styles.sair}>Sair</Text>
      </TouchableOpacity>

      <PopupSair visivel={confirmandoSaida} onCancelar={() => setConfirmandoSaida(false)} onConfirmar={confirmarSaida} />
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  foto: { width: 56, height: 56, borderRadius: 28 },
  fotoVazia: { backgroundColor: colors.cinzaInput, alignItems: 'center', justifyContent: 'center' },
  textosPerfil: { flex: 1, marginLeft: 14 },
  rotuloPerfil: { ...tipografia.corpo, fontSize: fs(16), color: colors.pretoTexto },
  nome: { ...tipografia.corpo, color: colors.textoPrincipal },
  grupo: { marginTop: 24 },
  divisoria: { height: 1.5, backgroundColor: colors.bordaClara, marginTop: 28, marginBottom: 12 },
  link: { paddingVertical: 8, paddingHorizontal: 16 },
  adicionar: { ...tipografia.corpo, fontSize: fs(16), color: colors.azulLink },
  sair: { ...tipografia.corpo, fontSize: fs(16), color: colors.vermelhoAviso },
});
