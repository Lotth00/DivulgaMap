import { Alert } from 'react-native';
import api from '../services/api';

export const NOME_FAVORITOS = 'Favoritos';

// Favoritos sempre em primeiro; as outras na ordem que o servidor mandar
export function ordenarListas(listas) {
  return [...listas].sort((a, b) => (b.nome === NOME_FAVORITOS) - (a.nome === NOME_FAVORITOS));
}

// "Esta lista está vazia", "1 item", "3 itens"
export function textoTotal(total) {
  const n = Number(total) || 0;
  if (!n) return 'Esta lista está vazia';
  return n === 1 ? '1 item' : `${n} itens`;
}

function mensagemDeErro(erro) {
  return erro.response?.data?.erro || 'Confira sua conexão e tente de novo.';
}

export async function renomearLista(lista, nome) {
  try {
    const resposta = await api.put(`/listas/${lista.id_lista}`, { nome });
    return resposta.data;
  } catch (erro) {
    Alert.alert('Não foi possível renomear', mensagemDeErro(erro));
    return null;
  }
}

// Confirmação e exclusão; chama aoExcluir só se deu certo
export function confirmarExclusaoLista(lista, aoExcluir) {
  Alert.alert('Excluir lista', `"${lista.nome}" e os itens salvos nela vão ser apagados.`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Excluir',
      style: 'destructive',
      onPress: async () => {
        try {
          await api.delete(`/listas/${lista.id_lista}`);
          aoExcluir();
        } catch (erro) {
          Alert.alert('Não foi possível excluir', mensagemDeErro(erro));
        }
      },
    },
  ]);
}
