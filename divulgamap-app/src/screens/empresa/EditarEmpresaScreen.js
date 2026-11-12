import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import CampoTexto from '../../components/CampoTexto';
import CampoDataHora from '../../components/CampoDataHora';
import BotaoGradiente from '../../components/BotaoGradiente';
import ImagemItem from '../../components/ImagemItem';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { escolherEEnviarFoto, mensagemDeErro } from './util';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIPOS = [
  { valor: 'comercio', rotulo: 'Comércio' },
  { valor: 'servico', rotulo: 'Serviços' },
  { valor: 'ambos', rotulo: 'Os dois' },
];
const MAXIMO_FOTOS = 10;

function Rotulo({ texto }) {
  return <Text style={styles.rotulo}>{texto}</Text>;
}

function Chip({ texto, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]} activeOpacity={0.8}>
      <Text style={[styles.textoChip, ativo && styles.textoChipAtivo]}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Semana a partir dos horários do servidor (o primeiro de cada dia)
function montarSemana(horarios = []) {
  const semana = DIAS.map(() => ({ aberto: false, abertura: '08:00', fechamento: '18:00' }));
  horarios.forEach((h) => {
    if (h.dia_semana < 0 || h.dia_semana > 6 || semana[h.dia_semana].lido) return;
    semana[h.dia_semana] = {
      lido: true,
      aberto: !h.fechado && !!h.abertura,
      abertura: h.abertura?.slice(0, 5) || '08:00',
      fechamento: h.fechamento?.slice(0, 5) || '18:00',
    };
  });
  return semana;
}

// Edição do perfil da empresa pelo dono: foto de perfil, dados, endereço, horários e fotos do ambiente
export default function EditarEmpresaScreen({ route, navigation }) {
  const { id } = route.params;
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(null);
  const [todasCategorias, setTodasCategorias] = useState([]);

  const [original, setOriginal] = useState(null);
  const [logo, setLogo] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('comercio');
  const [categorias, setCategorias] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [site, setSite] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [referencia, setReferencia] = useState('');
  const [semana, setSemana] = useState(montarSemana());
  const [semanaMudou, setSemanaMudou] = useState(false);
  const [fotos, setFotos] = useState([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const [resposta, listaCategorias] = await Promise.all([api.get(`/empresas/${id}`), api.get('/categorias')]);
      const e = resposta.data;
      setOriginal(e);
      setLogo(e.foto_perfil_url ?? null);
      setNome(e.nome_fantasia ?? '');
      setTipo(e.tipo ?? 'comercio');
      setCategorias(e.categorias ?? []);
      setDescricao(e.descricao ?? '');
      setTelefone(e.telefone ?? '');
      setSite(e.site ?? '');
      setEndereco(e.endereco ?? '');
      setBairro(e.bairro ?? '');
      setReferencia(e.referencia ?? '');
      setSemana(montarSemana(e.horarios));
      setSemanaMudou(false);
      setFotos(e.fotos ?? []);
      setTodasCategorias(listaCategorias.data.map((c) => c.nome));
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudarDia(indice, campo, valor) {
    setSemana((atual) => atual.map((d, i) => (i === indice ? { ...d, [campo]: valor } : d)));
    setSemanaMudou(true);
  }

  function alternarCategoria(nomeCategoria) {
    setCategorias((atual) => (atual.includes(nomeCategoria)
      ? atual.filter((c) => c !== nomeCategoria)
      : [...atual, nomeCategoria]));
  }

  async function trocarLogo() {
    setEnviandoFoto('logo');
    try {
      const url = await escolherEEnviarFoto('divulgamap/empresas', true);
      if (url) setLogo(url);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a foto', erro.message);
    } finally {
      setEnviandoFoto(null);
    }
  }

  // Fotos do ambiente: entram e saem na hora
  async function adicionarFoto() {
    setEnviandoFoto('ambiente');
    try {
      const url = await escolherEEnviarFoto('divulgamap/empresas');
      if (!url) return;
      const resposta = await api.post(`/empresas/${id}/fotos`, { url, ordem: fotos.length });
      setFotos((atual) => [...atual, resposta.data]);
    } catch (erro) {
      Alert.alert('Não foi possível adicionar a foto', mensagemDeErro(erro, erro.message));
    } finally {
      setEnviandoFoto(null);
    }
  }

  function removerFoto(foto) {
    Alert.alert('Remover foto', 'Esta foto do ambiente sai do perfil.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/empresas/${id}/fotos/${foto.id_foto}`);
            setFotos((atual) => atual.filter((f) => f.id_foto !== foto.id_foto));
          } catch (erro) {
            Alert.alert('Não foi possível remover', mensagemDeErro(erro));
          }
        },
      },
    ]);
  }

  async function salvar() {
    if (!nome.trim()) return Alert.alert('Confira os dados', 'O nome da empresa não pode ficar vazio.');
    if (!categorias.length) return Alert.alert('Confira os dados', 'Escolha pelo menos uma categoria.');
    if (!endereco.trim() || !bairro.trim()) return Alert.alert('Confira os dados', 'Endereço e bairro são obrigatórios.');
    const diaRuim = semana.findIndex((d) => d.aberto && d.abertura === d.fechamento);
    if (diaRuim >= 0) return Alert.alert('Confira os horários', `Abertura e fechamento de ${DIAS[diaRuim]} estão iguais.`);

    // Só o que mudou vai para o servidor
    const dados = {};
    const conferir = (campo, valor, atual) => {
      if ((valor ?? '') !== (atual ?? '')) dados[campo] = valor;
    };
    conferir('nome_fantasia', nome.trim(), original.nome_fantasia);
    conferir('tipo', tipo, original.tipo);
    conferir('descricao', descricao.trim(), original.descricao);
    conferir('telefone', telefone.trim(), original.telefone);
    conferir('site', site.trim(), original.site);
    conferir('endereco', endereco.trim(), original.endereco);
    conferir('bairro', bairro.trim(), original.bairro);
    conferir('referencia', referencia.trim(), original.referencia);
    conferir('foto_perfil_url', logo, original.foto_perfil_url);
    if ([...categorias].sort().join('|') !== [...(original.categorias ?? [])].sort().join('|')) dados.categorias = categorias;
    if (semanaMudou) {
      dados.horarios = semana.map((d, i) => ({
        dia_semana: i,
        abertura: d.aberto ? d.abertura : null,
        fechamento: d.aberto ? d.fechamento : null,
        fechado: !d.aberto,
      }));
    }

    if (!Object.keys(dados).length) {
      navigation.goBack();
      return undefined;
    }
    setSalvando(true);
    try {
      await api.patch(`/empresas/${id}`, dados);
      navigation.goBack();
    } catch (erro) {
      Alert.alert('Não foi possível salvar', mensagemDeErro(erro));
    } finally {
      setSalvando(false);
    }
    return undefined;
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Editar perfil da empresa"
      carregando={carregando}
      falhou={falhou}
      onTentarDeNovo={carregar}
      rodape={!carregando && !falhou
        ? <BotaoGradiente titulo="Salvar" onPress={salvar} carregando={salvando} desativado={!!enviandoFoto} />
        : null}
    >
      <TouchableOpacity onPress={trocarLogo} disabled={!!enviandoFoto} style={styles.logo} activeOpacity={0.8}>
        <ImagemItem uri={logo} categoria={categorias[0]} largura={96} raio={48} />
        {enviandoFoto === 'logo'
          ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.pretoTexto} />
          : <View style={styles.iconeLogo}><Ionicons name="camera" size={16} color={colors.brancoFundo} /></View>}
      </TouchableOpacity>
      <Text style={styles.ajudaCentro}>Foto de perfil (logo ou fachada)</Text>

      <Rotulo texto="Nome" />
      <CampoTexto valor={nome} onMudar={setNome} limite={150} />

      <Rotulo texto="Tipo" />
      <View style={styles.chips}>
        {TIPOS.map((t) => <Chip key={t.valor} texto={t.rotulo} ativo={tipo === t.valor} onPress={() => setTipo(t.valor)} />)}
      </View>

      <Rotulo texto="Categorias" />
      <View style={styles.chips}>
        {todasCategorias.map((c) => <Chip key={c} texto={c} ativo={categorias.includes(c)} onPress={() => alternarCategoria(c)} />)}
      </View>

      <Rotulo texto="Descrição" />
      <CampoTexto valor={descricao} onMudar={setDescricao} multilinha limite={500} />

      <Rotulo texto="Telefone" />
      <CampoTexto valor={telefone} onMudar={setTelefone} keyboardType="phone-pad" maxLength={20} placeholder="(51) 99999-9999" />

      <Rotulo texto="Site ou rede social" />
      <CampoTexto valor={site} onMudar={setSite} autoCapitalize="none" maxLength={255} placeholder="Opcional" />

      <Rotulo texto="Endereço" />
      <CampoTexto valor={endereco} onMudar={setEndereco} maxLength={255} placeholder="Rua e número" />
      <View style={styles.dupla}>
        <View style={styles.metade}>
          <Rotulo texto="Bairro" />
          <CampoTexto valor={bairro} onMudar={setBairro} maxLength={100} />
        </View>
        <View style={styles.metade}>
          <Rotulo texto="Referência" />
          <CampoTexto valor={referencia} onMudar={setReferencia} maxLength={150} placeholder="Opcional" />
        </View>
      </View>
      <Text style={styles.ajuda}>Mudou de lugar? Ao salvar, o pino do mapa vai para o novo endereço.</Text>

      <Rotulo texto="Horários" />
      {semana.map((dia, i) => (
        <View key={DIAS[i]} style={styles.dia}>
          <Text style={styles.nomeDia}>{DIAS[i]}</Text>
          <Switch
            value={dia.aberto}
            onValueChange={(v) => mudarDia(i, 'aberto', v)}
            trackColor={{ true: colors.menuInicio, false: colors.bordaClara }}
            thumbColor={dia.aberto ? colors.pretoTexto : colors.brancoFundo}
          />
          {dia.aberto ? (
            <View style={styles.horas}>
              <CampoDataHora modo="hora" valor={dia.abertura} onMudar={(v) => mudarDia(i, 'abertura', v)} estilo={styles.hora} />
              <CampoDataHora modo="hora" valor={dia.fechamento} onMudar={(v) => mudarDia(i, 'fechamento', v)} estilo={styles.hora} />
            </View>
          ) : (
            <Text style={styles.fechado}>Fechado</Text>
          )}
        </View>
      ))}

      <Rotulo texto={`Fotos do ambiente (${fotos.length}/${MAXIMO_FOTOS})`} />
      <Text style={styles.ajuda}>Mostram que o lugar existe e aparecem nos cartões de "Novos negócios".</Text>
      <View style={styles.grade}>
        {fotos.map((foto) => (
          <View key={foto.id_foto} style={styles.fotoAmbiente}>
            <ImagemItem uri={foto.url} largura={96} raio={8} />
            <TouchableOpacity onPress={() => removerFoto(foto)} style={styles.removerFoto} accessibilityLabel="Remover foto">
              <Ionicons name="close" size={14} color={colors.brancoFundo} />
            </TouchableOpacity>
          </View>
        ))}
        {fotos.length < MAXIMO_FOTOS && (
          <TouchableOpacity onPress={adicionarFoto} disabled={!!enviandoFoto} style={styles.adicionarFoto}>
            {enviandoFoto === 'ambiente'
              ? <ActivityIndicator color={colors.pretoTexto} />
              : <Ionicons name="add" size={32} color={colors.textoSecundario} />}
          </TouchableOpacity>
        )}
      </View>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
  iconeLogo: { position: 'absolute', right: 2, bottom: 2, backgroundColor: colors.pretoTexto, borderRadius: 12, padding: 4 },
  ajudaCentro: { ...tipografia.legenda, color: colors.textoSecundario, textAlign: 'center', marginTop: 6 },
  rotulo: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 14, marginBottom: 6 },
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5, marginRight: 8, marginBottom: 8 },
  chipAtivo: { backgroundColor: colors.pretoTexto, borderColor: colors.pretoTexto },
  textoChip: { ...tipografia.corpoMedio, fontSize: fs(14), color: colors.pretoTexto },
  textoChipAtivo: { color: colors.brancoFundo },
  dupla: { flexDirection: 'row', marginHorizontal: -6 },
  metade: { flex: 1, marginHorizontal: 6 },
  dia: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  nomeDia: { ...tipografia.corpoMedio, color: colors.pretoTexto, width: 70 },
  horas: { flex: 1, flexDirection: 'row', marginLeft: 6 },
  hora: { flex: 1, marginLeft: 6 },
  fechado: { ...tipografia.corpoMedio, color: colors.vermelhoFechado, marginLeft: 12 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  fotoAmbiente: { marginRight: 8, marginBottom: 8 },
  removerFoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 3 },
  adicionarFoto: {
    width: 96, height: 96, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.bordaClara,
    alignItems: 'center', justifyContent: 'center',
  },
});
