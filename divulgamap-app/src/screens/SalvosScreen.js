import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CartaoAcessoNecessario from '../components/CartaoAcessoNecessario';
import TelaMapaBase from '../components/TelaMapaBase';
import Carregando from '../components/Carregando';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import MenuOpcoes from '../components/MenuOpcoes';
import ModalNomeLista from '../components/ModalNomeLista';
import { NOME_FAVORITOS, ordenarListas, textoTotal, renomearLista, confirmarExclusaoLista } from '../components/listasSalvas';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

// Aba Salvos: as listas da pessoa, com criar, renomear e excluir
export default function SalvosScreen({ navigation }) {
  const { logado } = useAuth();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [listas, setListas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [menuDaLista, setMenuDaLista] = useState(null);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    if (!logado) return;
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await api.get('/listas/minhas');
      setListas(ordenarListas(resposta.data));
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [logado]);

  // Atualiza ao voltar para a aba (itens podem ter sido salvos em outra tela)
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function confirmarNome(nome) {
    setEnviando(true);
    try {
      if (editando === 'nova') {
        const resposta = await api.post('/listas', { nome });
        setListas((atuais) => ordenarListas([{ ...resposta.data, total_itens: 0 }, ...atuais]));
      } else {
        const atualizada = await renomearLista(editando, nome);
        if (!atualizada) return;
        setListas((atuais) => atuais.map((l) => (l.id_lista === atualizada.id_lista ? { ...l, nome: atualizada.nome } : l)));
      }
      setEditando(null);
    } catch (erro) {
      Alert.alert('Não foi possível criar a lista', erro.response?.data?.erro || 'Confira sua conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function opcoesDaLista(lista) {
    if (!lista || lista.nome === NOME_FAVORITOS) return [];
    return [
      { icone: 'create-outline', texto: 'Renomear', onPress: () => setEditando(lista) },
      {
        icone: 'trash-outline',
        texto: 'Excluir lista',
        perigo: true,
        onPress: () => confirmarExclusaoLista(lista, () => setListas((atuais) => atuais.filter((l) => l.id_lista !== lista.id_lista))),
      },
    ];
  }

  function conteudo() {
    if (!logado) {
      return (
        <CartaoAcessoNecessario
          mensagem={'Para acessar seus favoritos faça\nlogin ou crie uma conta'}
          navigation={navigation}
        />
      );
    }
    return (
      <>
        <TouchableOpacity onPress={() => setEditando('nova')} activeOpacity={0.8}>
          <LinearGradient colors={[colors.gradienteTopo, colors.gradienteBase]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.criar}>
            <Text style={styles.textoCriar}>+ Criar lista</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.subtitulo}>Suas listas</Text>

        {carregando && !listas.length ? (
          <Carregando />
        ) : falhou && !listas.length ? (
          <ErroComTentarDeNovo onTentarDeNovo={carregar} />
        ) : (
          listas.map((lista) => {
            const favoritos = lista.nome === NOME_FAVORITOS;
            return (
              <TouchableOpacity
                key={lista.id_lista}
                style={styles.linha}
                onPress={() => navigation.navigate('ListaDetalhe', { lista })}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={favoritos ? 'heart-outline' : 'star-outline'}
                  size={28}
                  color={favoritos ? colors.iconeFavoritos : colors.iconeLista}
                  style={styles.icone}
                />
                <View style={styles.textos}>
                  <Text style={styles.nome} numberOfLines={1}>{lista.nome}</Text>
                  <Text style={styles.total}>{textoTotal(lista.total_itens)}</Text>
                </View>
                <TouchableOpacity onPress={() => setMenuDaLista(lista)} style={styles.botaoMenu} accessibilityLabel={`Opções de ${lista.nome}`}>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.iconeMenu} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <TelaMapaBase categoriaSelecionada={categoriaSelecionada} onMudarCategoria={setCategoriaSelecionada}>
        <Text style={styles.titulo}>Salvos</Text>
        {conteudo()}
      </TelaMapaBase>

      <MenuOpcoes
        visivel={!!menuDaLista}
        titulo={menuDaLista?.nome}
        aviso={menuDaLista?.nome === NOME_FAVORITOS ? 'A lista Favoritos é fixa: não pode ser renomeada nem excluída.' : null}
        opcoes={opcoesDaLista(menuDaLista)}
        onFechar={() => setMenuDaLista(null)}
      />
      <ModalNomeLista
        visivel={!!editando}
        titulo={editando === 'nova' ? 'Nova lista' : 'Renomear lista'}
        nomeInicial={editando && editando !== 'nova' ? editando.nome : ''}
        textoBotao={editando === 'nova' ? 'Criar' : 'Salvar'}
        enviando={enviando}
        onConfirmar={confirmarNome}
        onFechar={() => setEditando(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { ...tipografia.tituloTela, fontSize: 24, color: colors.pretoTexto, marginTop: 8, marginBottom: 24 },
  criar: { borderRadius: 24, paddingVertical: 11, alignItems: 'center' },
  textoCriar: { ...tipografia.corpo, fontSize: 18, color: colors.pretoTexto },
  subtitulo: { ...tipografia.tituloTela, fontSize: 24, color: colors.pretoTexto, marginTop: 30, marginBottom: 12 },
  linha: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: colors.bordaClara,
  },
  icone: { width: 36, marginLeft: 4, marginRight: 14 },
  textos: { flex: 1 },
  nome: { ...tipografia.corpo, fontSize: 20, color: colors.pretoTexto },
  total: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  botaoMenu: { padding: 8, marginRight: -8 },
});
