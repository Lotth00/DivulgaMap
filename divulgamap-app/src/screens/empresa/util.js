import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { enviarImagem } from '../../services/upload';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

// Situação da empresa para o dono
export const STATUS_EMPRESA = {
  rascunho: { rotulo: 'Cadastro não terminado', icone: 'create-outline' },
  pendente_aprovacao: { rotulo: 'Em análise', icone: 'time-outline' },
  rejeitada: { rotulo: 'Não aprovada', icone: 'close-circle-outline' },
  aprovada: { rotulo: 'Aprovada', icone: 'checkmark-circle-outline' },
};

// Empresas do usuário logado, recarregadas ao voltar para a tela
export function useMinhasEmpresas(ativo = true) {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setEmpresas([]);
      setCarregando(false);
      return;
    }
    try {
      const resposta = await api.get('/empresas/minhas');
      setEmpresas(resposta.data);
    } catch (erro) {
      // Fica a lista anterior
    } finally {
      setCarregando(false);
    }
  }, [ativo]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  return { empresas, carregando, carregar };
}

// Aprovada abre o perfil (modo dono); as outras, a tela de situação
export function abrirMinhaEmpresa(navigation, empresa) {
  if (empresa.status === 'aprovada') navigation.navigate('Empresa', { id: empresa.id_empresa });
  else navigation.navigate('StatusEmpresa', { empresa });
}

// Cadastro de empresa: continua o rascunho existente ou começa um novo
export async function adicionarEmpresa(navigation) {
  try {
    const resposta = await api.get('/empresas/rascunho-atual');
    const rascunho = resposta.data.existeRascunho ? resposta.data.empresa : null;
    if (!rascunho) {
      navigation.navigate('CadastroEmpresa');
      return;
    }
    Alert.alert('Cadastro em andamento', `Você começou a cadastrar "${rascunho.nome_fantasia}". Quer continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Começar outro',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/empresas/${rascunho.id_empresa}`).catch(() => {});
          navigation.navigate('CadastroEmpresa');
        },
      },
      { text: 'Continuar', onPress: () => navigation.navigate('CadastroEmpresa', { rascunho }) },
    ]);
  } catch (erro) {
    Alert.alert('Não foi possível abrir', 'Confira sua conexão e tente de novo.');
  }
}

// "AAAA-MM-DDTHH:MM:SS" → "DD/MM/AAAA HH:MM"
export function dataHoraParaCampo(iso) {
  if (!iso) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
}

// Horas entre duas datas "AAAA-MM-DDTHH:MM:SS"
export function horasEntre(inicio, fim) {
  return (new Date(`${fim}Z`) - new Date(`${inicio}Z`)) / 3600000;
}

// Mensagem de erro da API ou uma padrão
export function mensagemDeErro(erro, padrao = 'Confira sua conexão e tente de novo.') {
  return erro?.response?.data?.erro || padrao;
}

// Escolhe uma foto da galeria e envia para o Cloudinary; devolve a URL ou null se cancelar
// aspecto: recorte em outra proporção, ex.: [8, 3]
export async function escolherEEnviarFoto(pasta, quadrada = false, aspecto = null) {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem.');
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: quadrada || !!aspecto,
    aspect: aspecto ?? (quadrada ? [1, 1] : undefined),
    quality: 0.7,
  });
  if (resultado.canceled) return null;
  const foto = resultado.assets[0];
  return enviarImagem(foto.uri, pasta, foto.mimeType ?? null);
}

// Situação do anúncio para o dono
export const SITUACAO_ANUNCIO = {
  no_ar: { rotulo: 'No ar', cor: '#1E9B1E' },
  agendado: { rotulo: 'Agendado', cor: '#6B6B6B' },
  encerrado: { rotulo: 'Encerrado', cor: '#6B6B6B' },
  aguardando_pagamento: { rotulo: 'Aguardando pagamento', cor: '#B07A00' },
  cancelado: { rotulo: 'Cancelado', cor: '#D32F2F' },
};

// Proporção da imagem de cada formato de anúncio (largura, altura)
export const PROPORCAO_ANUNCIO = { banner: [8, 3], faixa: [5, 1] };

// 12.5 → "R$ 12,50"
export function reais(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

// Data ISO → "DD/MM"
export function diaMes(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
