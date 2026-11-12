import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import TelaConta from '../../components/conta/TelaConta';
import EstadoVazio from '../../components/EstadoVazio';
import { acao, nomeDoAparelho, dataHora } from '../../components/conta/atividades';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const POR_PAGINA = 30;
const FILTROS_ACAO = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'login_falhou', rotulo: 'Login falhou' },
  { valor: 'login', rotulo: 'Logins' },
  { valor: 'senha_trocada', rotulo: 'Senha trocada' },
  { valor: 'empresa_dono_trocado', rotulo: 'Troca de dono' },
  { valor: 'pagamento_aprovado', rotulo: 'Pagamentos' },
  { valor: 'conta_excluida', rotulo: 'Contas excluídas' },
];
const PERIODOS = [
  { dias: 0, rotulo: 'Hoje' },
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: null, rotulo: 'Tudo' },
];

// Data local AAAA-MM-DD de N dias atrás
function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Chip({ texto, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]} activeOpacity={0.8}>
      <Text style={[styles.textoChip, ativo && styles.textoChipAtivo]}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Detalhes guardados, em texto curto ("motivo: senha_errada · valor: 30")
function textoDetalhes(detalhes) {
  if (!detalhes) return null;
  return Object.entries(detalhes)
    .map(([chave, valor]) => `${chave.replace(/_/g, ' ')}: ${Array.isArray(valor) ? valor.join(', ') : String(valor)}`)
    .join(' · ');
}

// Registro de atividades para a admin (GET /logs), com filtro por ação e período
export default function RegistroAtividadesScreen({ navigation }) {
  const [filtroAcao, setFiltroAcao] = useState('');
  const [periodo, setPeriodo] = useState(7);
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const buscar = useCallback(async (numeroPagina) => {
    const params = { limite: POR_PAGINA, pagina: numeroPagina };
    if (filtroAcao) params.acao = filtroAcao;
    if (periodo !== null) params.de = diasAtras(periodo);
    const resposta = await api.get('/logs', { params });
    return resposta.data;
  }, [filtroAcao, periodo]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const dados = await buscar(1);
      setRegistros(dados.registros);
      setTotal(dados.total);
      setPagina(1);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [buscar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function carregarMais() {
    setCarregandoMais(true);
    try {
      const dados = await buscar(pagina + 1);
      setRegistros((atuais) => [...atuais, ...dados.registros]);
      setPagina(pagina + 1);
    } catch (erro) {
      // Fica o que já foi carregado
    } finally {
      setCarregandoMais(false);
    }
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Registro de atividades"
      descricao="Quem fez o quê no app, quando e de onde. Os registros ficam guardados por 90 dias."
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linhaChips}>
        {FILTROS_ACAO.map((f) => (
          <Chip key={f.valor || 'todas'} texto={f.rotulo} ativo={filtroAcao === f.valor} onPress={() => setFiltroAcao(f.valor)} />
        ))}
      </ScrollView>
      <View style={styles.linhaPeriodo}>
        {PERIODOS.map((p) => (
          <Chip key={p.rotulo} texto={p.rotulo} ativo={periodo === p.dias} onPress={() => setPeriodo(p.dias)} />
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator style={styles.carregando} color={colors.pretoTexto} />
      ) : falhou ? (
        <EstadoVazio icone="cloud-offline-outline" mensagem="Não foi possível carregar." textoAcao="Tentar de novo" onAcao={carregar} />
      ) : registros.length === 0 ? (
        <EstadoVazio icone="document-text-outline" mensagem="Nenhuma atividade com esses filtros." />
      ) : (
        <>
          <Text style={styles.total}>{total} {total === 1 ? 'registro' : 'registros'}</Text>
          {registros.map((r, indice) => {
            const info = acao(r.acao);
            const detalhes = textoDetalhes(r.detalhes);
            return (
              <View key={r.id_log} style={[styles.item, indice > 0 && styles.divisoria]}>
                <Ionicons name={info.icone} size={22} color={info.alerta ? colors.vermelhoAviso : colors.pretoTexto} style={styles.icone} />
                <View style={styles.textos}>
                  <Text style={[styles.titulo, info.alerta && styles.tituloAlerta]}>{info.texto}</Text>
                  <Text style={styles.pessoa} numberOfLines={1}>
                    {r.usuario_nome ? `${r.usuario_nome} (${r.usuario_email})` : 'Sem conta ou conta excluída'}
                  </Text>
                  {r.alvo_tipo ? <Text style={styles.apoio}>{r.alvo_tipo} nº {r.alvo_id}</Text> : null}
                  {detalhes ? <Text style={styles.apoio}>{detalhes}</Text> : null}
                  <Text style={styles.apoio}>
                    {dataHora(r.criado_em)} · {nomeDoAparelho(r.aparelho)}{r.ip ? ` · IP ${r.ip}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
          {registros.length < total && (
            <TouchableOpacity onPress={carregarMais} disabled={carregandoMais} style={styles.mais}>
              {carregandoMais
                ? <ActivityIndicator color={colors.pretoTexto} />
                : <Text style={styles.textoMais}>Carregar mais</Text>}
            </TouchableOpacity>
          )}
        </>
      )}
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  linhaChips: { marginBottom: 8, flexGrow: 0 },
  linhaPeriodo: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8, marginBottom: 6 },
  chipAtivo: { backgroundColor: colors.pretoTexto, borderColor: colors.pretoTexto },
  textoChip: { ...tipografia.legenda, color: colors.pretoTexto },
  textoChipAtivo: { color: colors.brancoFundo },
  carregando: { marginTop: 30 },
  total: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  divisoria: { borderTopWidth: 1, borderTopColor: colors.bordaClara },
  icone: { marginRight: 10, marginTop: 2 },
  textos: { flex: 1 },
  titulo: { ...tipografia.corpo, color: colors.pretoTexto },
  tituloAlerta: { color: colors.vermelhoAviso },
  pessoa: { ...tipografia.corpoMedio, color: colors.pretoTexto },
  apoio: { ...tipografia.legenda, color: colors.textoSecundario },
  mais: { alignItems: 'center', paddingVertical: 14 },
  textoMais: { ...tipografia.corpoMedio, color: colors.pretoTexto, textDecorationLine: 'underline' },
});
