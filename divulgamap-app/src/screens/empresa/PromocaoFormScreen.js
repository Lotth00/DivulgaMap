import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import CampoTexto from '../../components/CampoTexto';
import BotaoGradiente from '../../components/BotaoGradiente';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import CampoDataHora from '../../components/CampoDataHora';
import { horasEntre, mensagemDeErro } from './util';

const TIPOS = [
  { valor: 'normal', rotulo: 'Normal', ajuda: 'Desconto em porcentagem.' },
  { valor: 'especial', rotulo: 'Especial', ajuda: 'Uma condição, como "Leve 3, pague 2".' },
  { valor: 'relampago', rotulo: 'Relâmpago', ajuda: 'Dura no máximo 24 horas. Desconto ou condição.' },
];

// Chip de escolha única
function Chip({ texto, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]} activeOpacity={0.8}>
      <Text style={[styles.textoChip, ativo && styles.textoChipAtivo]} numberOfLines={1}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Rotulo({ texto }) {
  return <Text style={styles.rotulo}>{texto}</Text>;
}

// Nova oferta ou edição de uma oferta da empresa
export default function PromocaoFormScreen({ route, navigation }) {
  const { empresaId, promocao } = route.params;
  const editando = !!promocao;

  const [tipo, setTipo] = useState(promocao?.tipo ?? 'normal');
  const [titulo, setTitulo] = useState(promocao?.titulo ?? '');
  const [produtoId, setProdutoId] = useState(promocao?.produto_id ?? null);
  const [desconto, setDesconto] = useState(promocao?.desconto_percentual ? String(Math.round(Number(promocao.desconto_percentual))) : '');
  const [condicao, setCondicao] = useState(promocao?.condicao ?? '');
  const [descricao, setDescricao] = useState(promocao?.descricao ?? '');
  const [dataInicio, setDataInicio] = useState(promocao?.data_inicio?.slice(0, 10) ?? '');
  const [horaInicio, setHoraInicio] = useState(promocao?.data_inicio?.slice(11, 16) ?? '');
  const [dataFim, setDataFim] = useState(promocao?.data_fim?.slice(0, 10) ?? '');
  const [horaFim, setHoraFim] = useState(promocao?.data_fim?.slice(11, 16) ?? '');
  const [produtos, setProdutos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/produtos/empresa/${empresaId}`).then((r) => setProdutos(r.data)).catch(() => {});
  }, [empresaId]);

  // Conferência antes de enviar; devolve a mensagem do problema ou null
  function conferir(inicio, fim) {
    if (!titulo.trim()) return 'Escreva um título.';
    const valorDesconto = desconto ? Number(desconto.replace(',', '.')) : null;
    if (valorDesconto !== null && (!Number.isFinite(valorDesconto) || valorDesconto <= 0 || valorDesconto > 100)) {
      return 'O desconto vai de 1 a 100%.';
    }
    if (tipo === 'normal' && !valorDesconto) return 'A oferta normal precisa de desconto.';
    if (tipo === 'especial' && !condicao.trim()) return 'A oferta especial precisa de uma condição.';
    if (tipo === 'relampago' && !valorDesconto && !condicao.trim()) return 'A relâmpago precisa de desconto ou condição.';
    if (!inicio || !fim) return 'Escolha a data e o horário de início e de término.';
    if (horasEntre(inicio, fim) <= 0) return 'O fim precisa ser depois do início.';
    if (tipo === 'relampago' && horasEntre(inicio, fim) > 24) {
      return `A relâmpago dura no máximo 24 horas, e esta tem ${Math.round(horasEntre(inicio, fim))} horas.`;
    }
    return null;
  }

  async function enviar() {
    // Data e horário vão juntos para o servidor
    const inicioCompleto = dataInicio && horaInicio ? `${dataInicio}T${horaInicio}:00` : null;
    const fimCompleto = dataFim && horaFim ? `${dataFim}T${horaFim}:00` : null;
    const problema = conferir(inicioCompleto, fimCompleto);
    if (problema) {
      Alert.alert('Confira a oferta', problema);
      return;
    }

    const dados = {
      tipo,
      titulo: titulo.trim(),
      produto_id: produtoId,
      desconto_percentual: desconto ? Number(desconto.replace(',', '.')) : null,
      condicao: condicao.trim() || null,
      descricao: descricao.trim() || null,
      data_inicio: inicioCompleto,
      data_fim: fimCompleto,
    };

    setEnviando(true);
    try {
      if (editando) await api.put(`/promocoes/${promocao.id_promocao}`, dados);
      else await api.post('/promocoes', { ...dados, empresa_id: empresaId });
      navigation.goBack();
    } catch (erro) {
      Alert.alert('Não foi possível salvar', mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo={editando ? 'Editar oferta' : 'Nova oferta'}
      rodape={<BotaoGradiente titulo={editando ? 'Salvar' : 'Publicar oferta'} onPress={enviar} carregando={enviando} />}
    >
      <Rotulo texto="Tipo" />
      <View style={styles.chips}>
        {TIPOS.map((t) => <Chip key={t.valor} texto={t.rotulo} ativo={tipo === t.valor} onPress={() => setTipo(t.valor)} />)}
      </View>
      <Text style={styles.ajuda}>{TIPOS.find((t) => t.valor === tipo).ajuda}</Text>

      <Rotulo texto="Título" />
      <CampoTexto valor={titulo} onMudar={setTitulo} placeholder="Ex: Pão com desconto" limite={150} />

      <Rotulo texto="Produto (opcional)" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip texto="Nenhum" ativo={!produtoId} onPress={() => setProdutoId(null)} />
        {produtos.map((p) => (
          <Chip key={p.id_produto} texto={p.nome} ativo={produtoId === p.id_produto} onPress={() => setProdutoId(p.id_produto)} />
        ))}
      </ScrollView>

      <Rotulo texto="Desconto (%)" />
      <CampoTexto valor={desconto} onMudar={(t) => setDesconto(t.replace(/[^\d,]/g, ''))} placeholder="Ex: 20" keyboardType="decimal-pad" maxLength={5} />

      <Rotulo texto="Condição" />
      <CampoTexto valor={condicao} onMudar={setCondicao} placeholder="Ex: Leve 3, pague 2" limite={255} />

      <Rotulo texto="Descrição e regras (opcional)" />
      <CampoTexto valor={descricao} onMudar={setDescricao} placeholder="Ex: Válido só no balcão" multilinha limite={500} />

      <View style={styles.datas}>
        <View style={styles.data}>
          <Rotulo texto="Data de início" />
          <CampoDataHora modo="data" valor={dataInicio} onMudar={setDataInicio} placeholder="Escolher" />
        </View>
        <View style={styles.data}>
          <Rotulo texto="Data de término" />
          <CampoDataHora modo="data" valor={dataFim} onMudar={setDataFim} placeholder="Escolher" minimo={dataInicio || undefined} />
        </View>
      </View>
      <View style={styles.datas}>
        <View style={styles.data}>
          <Rotulo texto="Horário de início" />
          <CampoDataHora modo="hora" valor={horaInicio} onMudar={setHoraInicio} placeholder="Ex: 08:00" />
        </View>
        <View style={styles.data}>
          <Rotulo texto="Horário de término" />
          <CampoDataHora modo="hora" valor={horaFim} onMudar={setHoraFim} placeholder="Ex: 18:00" />
        </View>
      </View>
      <Text style={styles.ajuda}>Horário de Brasília.</Text>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 14, marginBottom: 6 },
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'nowrap' },
  chip: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5, marginRight: 8, maxWidth: 180 },
  chipAtivo: { backgroundColor: colors.pretoTexto, borderColor: colors.pretoTexto },
  textoChip: { ...tipografia.corpoMedio, fontSize: fs(14), color: colors.pretoTexto },
  textoChipAtivo: { color: colors.brancoFundo },
  datas: { flexDirection: 'row', marginHorizontal: -6 },
  data: { flex: 1, marginHorizontal: 6 },
});
