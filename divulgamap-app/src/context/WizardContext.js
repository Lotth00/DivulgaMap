import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

const WizardContext = createContext(null);

// Rascunho da empresa em cadastro: começa vazio ou com o rascunho que a pessoa quis continuar
export function WizardProvider({ rascunhoInicial = null, children }) {
  const [empresa, setEmpresa] = useState(rascunhoInicial);

  // Passo 1: cria o rascunho (ou atualiza nome e categorias, se já existe)
  async function salvarPerfil(nome_fantasia, categorias) {
    if (empresa?.id_empresa) return salvar({ nome_fantasia, categorias });
    const resposta = await api.post('/empresas/rascunho', { nome_fantasia, categorias });
    setEmpresa(resposta.data);
    return resposta.data;
  }

  // Demais passos: grava só os campos enviados
  async function salvar(campos) {
    const resposta = await api.patch(`/empresas/${empresa.id_empresa}`, campos);
    const atualizada = { ...empresa, ...resposta.data, ...(campos.categorias ? { categorias: campos.categorias } : {}) };
    setEmpresa(atualizada);
    return atualizada;
  }

  return (
    <WizardContext.Provider value={{ empresa, salvarPerfil, salvar }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  return useContext(WizardContext);
}

// Mensagem do servidor ou uma genérica
export function mensagemDeErro(erro) {
  return erro.response?.data?.erro || 'Não foi possível salvar. Confira sua conexão e tente de novo.';
}
