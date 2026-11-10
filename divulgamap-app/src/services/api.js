import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Servidor da API: local (EXPO_PUBLIC_API_URL no .env.local) ou Render
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://divulgamap.onrender.com',
  timeout: 60000,
});

// Ação ao expirar a sessão (registrada pelo AuthContext)
let aoExpirarSessao = null;

export function definirAoExpirarSessao(funcao) {
  aoExpirarSessao = funcao;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@divulgamap:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token recusado pelo servidor: encerra a sessão
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const enviouToken = !!erro.config?.headers?.Authorization;
    if (erro.response?.status === 401 && enviouToken && aoExpirarSessao) {
      aoExpirarSessao();
    }
    return Promise.reject(erro);
  }
);

export default api;
