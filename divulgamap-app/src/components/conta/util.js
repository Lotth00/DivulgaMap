import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "2008-10-13" → "13 de outubro de 2008"
export function dataPorExtenso(data) {
  if (!data) return null;
  const [ano, mes, dia] = data.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

// "2008-10-13" → "13/10/2008"
export function dataParaCampo(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Máscara DD/MM/AAAA enquanto digita
export function mascaraData(texto) {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// "13/10/2008" → "2008-10-13", ou null se a data não existe ou é no futuro
export function campoParaData(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const data = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) return null;
  if (data > new Date() || data.getUTCFullYear() < 1900) return null;
  return iso;
}

// Máscara (51) 99999-9999 ou (51) 3333-4444
export function mascaraTelefone(texto) {
  const d = texto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function telefoneValido(texto) {
  const n = texto.replace(/\D/g, '').length;
  return n === 10 || n === 11;
}

export function avisarEmBreve(oQue = 'Esta opção') {
  Alert.alert('Em breve', `${oQue} chega numa próxima versão do app.`);
}

// Dados completos da pessoa logada (GET /usuarios/me), recarregados ao voltar para a tela
export function useDadosUsuario(ativo = true) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) return;
    setFalhou(false);
    try {
      const resposta = await api.get('/usuarios/me');
      setDados(resposta.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [ativo]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return { dados, setDados, carregando, falhou, carregar };
}

// PUT /usuarios/me com os campos enviados; devolve os dados novos ou null (com aviso)
export async function atualizarDados(campos) {
  try {
    const resposta = await api.put('/usuarios/me', campos);
    return resposta.data;
  } catch (erro) {
    Alert.alert('Não foi possível salvar', erro.response?.data?.erro || 'Confira sua conexão e tente de novo.');
    return null;
  }
}
