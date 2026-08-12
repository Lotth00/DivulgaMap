import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  return (
    <AuthContext.Provider value={{ usuario, logado: !!usuario, carregandoSessao, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}