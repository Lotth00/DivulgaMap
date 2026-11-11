import { Linking, Alert } from 'react-native';

export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// "08:00:00" → "08:00"
export function hora(texto) {
  return texto ? texto.slice(0, 5) : '';
}

// "5.5" → "R$ 5,50" (com "/Kg" quando a unidade não é "un")
export function formatarPreco(valor, unidade) {
  if (valor === null || valor === undefined) return null;
  const texto = `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
  return unidade && unidade !== 'un' ? `${texto}/${unidade.charAt(0).toUpperCase()}${unidade.slice(1)}` : texto;
}

// 4.8 → "4,8"
export function formatarNota(nota) {
  return Number(nota || 0).toFixed(1).replace('.', ',');
}

function dataLocal(deslocamentoDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamentoDias);
  const dois = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

// Feriado ou fechamento temporário ainda valendo
export function excecaoEmVigor(h) {
  return h.status !== 'normal' && (!h.data_fim || h.data_fim >= dataLocal(0));
}

// Horários de um dia da semana, ou null se fechado
export function intervalosDoDia(horarios, dia) {
  const doDia = horarios.filter((h) => h.dia_semana === dia && !h.fechado && h.abertura && h.fechamento && !excecaoEmVigor(h));
  if (!doDia.length) return null;
  return doDia.map((h) => `${hora(h.abertura)} – ${hora(h.fechamento)}`).join(', ');
}

// Situação agora: { aberto, texto } a partir do que o servidor calculou
export function situacaoAgora(empresa) {
  const horarios = empresa.horarios ?? [];
  if (!horarios.length) return { aberto: null, texto: 'Horário não informado' };

  if (empresa.aberto_agora) {
    const hoje = new Date().getDay();
    const ontem = (hoje + 6) % 7;
    const minutos = new Date().getHours() * 60 + new Date().getMinutes();
    const paraMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    // Intervalo em andamento (inclusive o que começou ontem e vira a noite)
    const atual = horarios.find((h) => {
      if (h.fechado || !h.abertura || !h.fechamento) return false;
      const a = paraMin(h.abertura);
      const f = paraMin(h.fechamento);
      if (h.dia_semana === hoje) return a > f ? minutos >= a : minutos >= a && minutos < f;
      return h.dia_semana === ontem && a > f && minutos < f;
    });
    return { aberto: true, texto: atual ? `Fecha às ${hora(atual.fechamento)}` : '' };
  }

  const proxima = empresa.proxima_abertura;
  if (!proxima) return { aberto: false, texto: 'Sem previsão de abertura' };
  if (proxima.data === dataLocal(0)) return { aberto: false, texto: `Abre às ${proxima.hora}` };
  if (proxima.data === dataLocal(1)) return { aberto: false, texto: `Abre amanhã às ${proxima.hora}` };
  return { aberto: false, texto: `Abre ${DIAS_CURTOS[proxima.dia_semana]} às ${proxima.hora}` };
}

function abrir(url) {
  Linking.openURL(url).catch(() => Alert.alert('Não foi possível abrir', 'Nenhum aplicativo aceitou este link.'));
}

// "51999990000" → "(51) 99999-0000"; outros formatos ficam como vieram
export function formatarTelefone(telefone) {
  const digitos = String(telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return telefone;
}

// Link do WhatsApp quando o número é de celular (DDD + 9 dígitos), senão null
export function linkWhatsapp(telefone) {
  if (!telefone) return null;
  const digitos = String(telefone).replace(/\D/g, '').replace(/^55(?=\d{11}$)/, '');
  return /^\d{2}9\d{8}$/.test(digitos) ? `https://wa.me/55${digitos}` : null;
}

export function conversar(telefone) {
  const link = linkWhatsapp(telefone);
  if (link) abrir(link);
}

export function ligar(telefone) {
  abrir(`tel:${String(telefone).replace(/[^\d+]/g, '')}`);
}

export function abrirSite(site) {
  abrir(/^https?:\/\//i.test(site) ? site : `https://${site}`);
}

// Link do Google Maps cadastrado ou, sem ele, a busca pela coordenada
export function abrirMapa(empresa) {
  if (empresa.google_maps_url) return abrir(empresa.google_maps_url);
  if (empresa.latitude && empresa.longitude) {
    return abrir(`https://www.google.com/maps/search/?api=1&query=${empresa.latitude},${empresa.longitude}`);
  }
  return null;
}

// "2026-10-10T..." → "há 1 mês"
export function tempoDesde(data) {
  const dias = Math.floor((Date.now() - new Date(data).getTime()) / 86400000);
  if (dias < 1) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
}
