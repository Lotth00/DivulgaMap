import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const COLUNAS = [
  ['Tipo de Item', 'Produto ou Serviço'],
  ['Nome do Item', 'Título do produto/serviço'],
  ['Categoria', 'Para filtros do app'],
  ['Preço Regular', 'Preço padrão'],
  ['Unidade de Medida', 'un, kg, hora, etc.'],
];

const TIPOS_ACEITOS = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

const LETRAS = 'ABCDEFGHIJ';

// Planilha como no Excel: letras nas colunas, números nas linhas, linhas com erro em vermelho
function TabelaPrevia({ previa, linhasComErro }) {
  const totalColunas = Math.min(LETRAS.length, Math.max(...previa.map((l) => l.length), 1));
  return (
    <ScrollView horizontal style={styles.tabela} contentContainerStyle={styles.tabelaConteudo}>
      <View>
        <View style={styles.linhaTabela}>
          <View style={[styles.celula, styles.celulaNumero, styles.cabecalhoTabela]} />
          {Array.from({ length: totalColunas }).map((_, c) => (
            <View key={c} style={[styles.celula, styles.cabecalhoTabela]}>
              <Text style={styles.textoCabecalho}>{LETRAS[c]}</Text>
            </View>
          ))}
        </View>
        {previa.map((linha, i) => {
          const comErro = linhasComErro.has(i + 1);
          return (
            <View key={i} style={[styles.linhaTabela, comErro && styles.linhaErro]}>
              <View style={[styles.celula, styles.celulaNumero]}>
                <Text style={[styles.textoCabecalho, comErro && styles.textoErro]}>{i + 1}</Text>
              </View>
              {Array.from({ length: totalColunas }).map((_, c) => (
                <View key={c} style={styles.celula}>
                  <Text style={[styles.textoCelula, i === 0 && styles.negrito]} numberOfLines={1}>{String(linha[c] ?? '')}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Etapa 11 (Figma 709:1144 e 723:1143): importa a planilha, mostra a prévia e os erros por linha
export default function PlanilhaEmpresaScreen({ navigation }) {
  const { empresa } = useWizard();
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erros, setErros] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState(null);

  function limpar() {
    setArquivo(null);
    setSucesso(null);
    setErros([]);
    setPrevia(null);
    setErro(null);
  }

  async function escolher() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: TIPOS_ACEITOS, copyToCacheDirectory: true });
    if (resultado.canceled) return;
    const doc = resultado.assets[0];
    limpar();
    setArquivo(doc.name);
    setImportando(true);
    try {
      const formulario = new FormData();
      formulario.append('planilha', { uri: doc.uri, name: doc.name, type: doc.mimeType || 'application/octet-stream' });
      const resposta = await api.post(`/produtos/${empresa.id_empresa}/planilha`, formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (dados) => dados,
      });
      setSucesso(resposta.data.mensagem);
      setPrevia(resposta.data.previa ?? null);
    } catch (e) {
      setErros(e.response?.data?.detalhes ?? []);
      setPrevia(e.response?.data?.previa ?? null);
      setErro(mensagemDeErro(e));
    } finally {
      setImportando(false);
    }
  }

  const temErros = erros.length > 0;

  return (
    <TelaWizard
      navigation={navigation}
      passo={11}
      titulo={previa ? 'Validando sua planilha' : 'Adicionando planilha'}
      descricao={previa ? null : 'Importe sua planilha de produtos ou serviços. Aceitamos arquivos nos formatos .xlsx, .xls ou .csv. Se preferir, adicione depois.'}
      erro={temErros ? 'Corrija a planilha e envie de novo, ou remova o arquivo para seguir sem ela. Nada foi gravado.' : erro}
      podeAvancar={!importando && !temErros}
      onAvancar={() => navigation.navigate('WizardRevisao')}
    >
      <TouchableOpacity style={styles.adicionar} onPress={escolher} activeOpacity={0.7} disabled={importando}>
        {importando ? <ActivityIndicator color={colors.pretoTexto} /> : <Ionicons name="folder-outline" size={20} color={colors.pretoTexto} />}
        <Text style={styles.textoAdicionar} numberOfLines={1}>{arquivo ?? 'Adicionar arquivo'}</Text>
      </TouchableOpacity>
      {arquivo && !importando && !sucesso ? (
        <TouchableOpacity onPress={limpar} style={styles.remover}>
          <Text style={styles.textoRemover}>Remover arquivo</Text>
        </TouchableOpacity>
      ) : null}

      {sucesso ? (
        <View style={styles.sucesso}>
          <Ionicons name="checkmark-circle" size={22} color={colors.verdePreco} />
          <Text style={styles.textoSucesso}>{sucesso}</Text>
        </View>
      ) : null}

      {previa?.length ? <TabelaPrevia previa={previa} linhasComErro={new Set(erros.map((e) => e.linha))} /> : null}

      {temErros ? (
        <View style={[styles.caixa, styles.caixaErro]}>
          <Text style={styles.tituloCaixa}>Erros encontrados:</Text>
          {erros.map((e) => (
            <View key={e.linha} style={styles.item}>
              <Text style={styles.linhaErroTitulo}>Linha {e.linha}</Text>
              {e.problemas.map((p) => (
                <Text key={p.coluna} style={styles.texto}>• <Text style={styles.negrito}>{p.coluna}:</Text> {p.motivo}</Text>
              ))}
            </View>
          ))}
        </View>
      ) : !previa ? (
        <View style={styles.caixa}>
          <Text style={styles.tituloCaixa}>Colunas esperadas:</Text>
          {COLUNAS.map(([coluna, texto]) => (
            <Text key={coluna} style={styles.texto}>• <Text style={styles.negrito}>{coluna}:</Text> {texto}</Text>
          ))}
        </View>
      ) : null}
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  adicionar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 12, marginBottom: 12,
    borderWidth: 2, borderColor: colors.gradienteTopo, borderRadius: 12, backgroundColor: colors.abaInicio,
  },
  textoAdicionar: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 8, flexShrink: 1 },
  remover: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 10 },
  textoRemover: { ...tipografia.legenda, color: colors.pretoTexto, textDecorationLine: 'underline' },
  sucesso: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  textoSucesso: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginLeft: 8, flex: 1 },
  tabela: { borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 8, backgroundColor: colors.fundoCaixa, marginBottom: 14 },
  tabelaConteudo: { flexGrow: 1 },
  linhaTabela: { flexDirection: 'row' },
  linhaErro: { backgroundColor: '#FDE3E3' },
  celula: { width: 130, paddingHorizontal: 6, paddingVertical: 6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.bordaClara, justifyContent: 'center' },
  celulaNumero: { width: 36, alignItems: 'center' },
  cabecalhoTabela: { backgroundColor: colors.cinzaInput, alignItems: 'center' },
  textoCabecalho: { ...tipografia.pequeno, color: colors.textoSecundario },
  textoCelula: { ...tipografia.legenda, color: colors.pretoTexto },
  textoErro: { color: colors.vermelhoAviso },
  caixa: { borderWidth: 2, borderColor: colors.gradienteTopo, borderRadius: 12, backgroundColor: colors.fundoCaixa, padding: 16 },
  caixaErro: { borderColor: colors.vermelhoAviso },
  tituloCaixa: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginBottom: 6 },
  item: { marginTop: 6 },
  linhaErroTitulo: { ...tipografia.corpoMedio, color: colors.vermelhoAviso },
  texto: { ...tipografia.legenda, color: colors.pretoTexto, marginTop: 2 },
  negrito: { fontFamily: 'Poppins_500Medium' },
});
