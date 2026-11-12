import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import EstadoVazio from '../../components/EstadoVazio';
import { acao, nomeDoAparelho, dataHora } from '../../components/conta/atividades';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// Atividade recente da conta: logins e mudanças de segurança, com aparelho e IP
export default function AtividadeScreen({ navigation }) {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get('/usuarios/me/atividade');
      setRegistros(resposta.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const alertas = registros.filter((r) => acao(r.acao).alerta).length;

  return (
    <TelaConta
      navigation={navigation}
      titulo="Atividade recente"
      descricao="Os últimos acessos e mudanças de segurança da sua conta."
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
    >
      <View style={styles.aviso}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.pretoTexto} />
        <View style={styles.textosAviso}>
          <Text style={styles.textoAviso}>
            Não reconhece algum acesso? Troque a senha e desconecte os outros aparelhos.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('TrocarSenha')}>
            <Text style={styles.link}>Trocar senha agora</Text>
          </TouchableOpacity>
        </View>
      </View>
      {alertas > 0 && (
        <Text style={styles.contagemAlertas}>
          {alertas} {alertas === 1 ? 'tentativa ou aviso' : 'tentativas ou avisos'} na lista abaixo.
        </Text>
      )}

      {registros.length === 0 ? (
        <EstadoVazio icone="time-outline" mensagem="Nenhuma atividade registrada ainda." />
      ) : (
        registros.map((r, indice) => {
          const info = acao(r.acao);
          return (
            <View key={r.id_log} style={[styles.item, indice > 0 && styles.divisoria]}>
              <Ionicons name={info.icone} size={24} color={info.alerta ? colors.vermelhoAviso : colors.pretoTexto} style={styles.icone} />
              <View style={styles.textos}>
                <Text style={[styles.titulo, info.alerta && styles.tituloAlerta]}>{info.texto}</Text>
                <Text style={styles.apoio}>{dataHora(r.criado_em)}</Text>
                <Text style={styles.apoio}>{nomeDoAparelho(r.aparelho)}{r.ip ? ` · IP ${r.ip}` : ''}</Text>
              </View>
            </View>
          );
        })
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  aviso: { flexDirection: 'row', backgroundColor: colors.menuInicio, borderRadius: 14, padding: 12, marginBottom: 12 },
  textosAviso: { flex: 1, marginLeft: 10 },
  textoAviso: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  link: { ...tipografia.corpoMedio, color: colors.pretoTexto, textDecorationLine: 'underline', marginTop: 4 },
  contagemAlertas: { ...tipografia.legenda, color: colors.vermelhoAviso, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  divisoria: { borderTopWidth: 1, borderTopColor: colors.bordaClara },
  icone: { marginRight: 12, marginTop: 2 },
  textos: { flex: 1 },
  titulo: { ...tipografia.corpo, color: colors.pretoTexto },
  tituloAlerta: { color: colors.vermelhoAviso },
  apoio: { ...tipografia.legenda, color: colors.textoSecundario },
});
