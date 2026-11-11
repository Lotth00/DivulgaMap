import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { definirAoExpirarSessao } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    (async () => {
      const dados = await AsyncStorage.getItem('@divulgamap:usuario');
      if (dados) setUsuario(JSON.parse(dados));
      setCarregandoSessao(false);
    })();
  }, []);

  async function entrar(token, dadosUsuario) {
    await AsyncStorage.setItem('@divulgamap:token', token);
    await AsyncStorage.setItem('@divulgamap:usuario', JSON.stringify(dadosUsuario));
    setUsuario(dadosUsuario); 
  }

  async function sair() {
    await AsyncStorage.multiRemove(['@divulgamap:token', '@divulgamap:usuario']);
    setUsuario(null);
  }

  // Dados do usuário alterados no perfil (ex.: nome e foto devolvidos por PUT /usuarios/me)
  async function atualizarUsuario(dadosNovos) {
    const atualizado = { ...usuario, ...dadosNovos };
    await AsyncStorage.setItem('@divulgamap:usuario', JSON.stringify(atualizado));
    setUsuario(atualizado);
  }

  // Sessão expirada: sai da conta
  useEffect(() => {
    definirAoExpirarSessao(() => sair());
    return () => definirAoExpirarSessao(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, logado: !!usuario, carregandoSessao, entrar, sair, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}