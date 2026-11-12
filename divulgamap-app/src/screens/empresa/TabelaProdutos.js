import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import BotaoGradiente from '../../components/BotaoGradiente';
import ImagemItem from '../../components/ImagemItem';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';
import { mensagemDeErro, escolherEEnviarFoto } from './util';

let proximaChave = 1;

// Formas de cobrança, na ordem em que o botão alterna
const FORMAS = [
  { valor: 'preco', rotulo: 'Com preço' },
  { valor: 'sob_consulta', rotulo: 'Sob consulta' },
  { valor: 'orcamento_gratuito', rotulo: 'Orç. gratuito' },
];

function paraLinha(produto) {
  return {
    chave: `p${produto.id_produto}`,
    id: produto.id_produto,
    nome: produto.nome,
    preco: produto.preco === null || produto.preco === undefined ? '' : Number(produto.preco).toFixed(2).replace('.', ','),
    unidade: produto.unidade_medida || 'un',
    forma: produto.forma_cobranca || 'preco',
    foto: produto.foto_url || null,
    descricao: produto.descricao || '',
    categoria: produto.categoria_nome,
  };
}

// "1,50" ou "1.50" → 1.5, ou null
function lerPreco(texto) {
  const limpo = String(texto).trim();
  const valor = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return limpo && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function mudouLinha(original, linha) {
  return original.nome !== linha.nome || original.unidade !== linha.unidade || original.forma !== linha.forma
    || original.foto !== linha.foto || original.descricao !== linha.descricao || lerPreco(original.preco) !== lerPreco(linha.preco);
}

// Planilha de produtos do dono: foto, nome, preço, unidade e forma de cobrança; remover e acrescentar linhas
export default function TabelaProdutos({ empresaId, produtos, categoriaEmpresa, onMudou, onFechar }) {
  const [originais] = useState(() => new Map(produtos.map((p) => [p.id_produto, paraLinha(p)])));
  const [linhas, setLinhas] = useState(() => produtos.map(paraLinha));
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(null);
  const [erroLinha, setErroLinha] = useState(null);

  function mudar(chave, campo, valor) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  function proximaForma(linha) {
    const indice = FORMAS.findIndex((f) => f.valor === linha.forma);
    mudar(linha.chave, 'forma', FORMAS[(indice + 1) % FORMAS.length].valor);
  }

  async function trocarFoto(linha) {
    setEnviandoFoto(linha.chave);
    try {
      const url = await escolherEEnviarFoto('divulgamap/produtos', true);
      if (url) mudar(linha.chave, 'foto', url);
    } catch (erro) {
      Alert.alert('Não foi possível enviar a foto', erro.message);
    } finally {
      setEnviandoFoto(null);
    }
  }

  function novaLinha() {
    setLinhas((atual) => [...atual, { chave: `n${proximaChave++}`, id: null, nome: '', preco: '', unidade: 'un', forma: 'preco', foto: null, descricao: '' }]);
  }

  function remover(linha) {
    if (!linha.id) {
      setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave));
      return;
    }
    Alert.alert('Remover item', `"${linha.nome}" deixa de aparecer no perfil e nas ofertas ligadas a ele.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/produtos/${linha.id}`);
            setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave));
            onMudou();
          } catch (erro) {
            Alert.alert('Não foi possível remover', mensagemDeErro(erro));
          }
        },
      },
    ]);
  }

  async function salvar() {
    // Confere todas as linhas antes de enviar
    for (const linha of linhas) {
      const faltaPreco = linha.forma === 'preco' && lerPreco(linha.preco) === null;
      if (!linha.nome.trim() || faltaPreco || !linha.unidade.trim()) {
        setErroLinha(linha.chave);
        Alert.alert('Confira a linha', 'Cada item precisa de nome e unidade; "Com preço" precisa de um preço maior que zero.');
        return;
      }
    }
    setErroLinha(null);

    const mudancas = linhas.filter((linha) => !linha.id || mudouLinha(originais.get(linha.id), linha));
    if (!mudancas.length) {
      onFechar();
      return;
    }

    setSalvando(true);
    let falhas = 0;
    for (const linha of mudancas) {
      const dados = {
        nome: linha.nome.trim(),
        forma_cobranca: linha.forma,
        preco: linha.forma === 'preco' ? lerPreco(linha.preco) : lerPreco(linha.preco) ?? null,
        unidade_medida: linha.unidade.trim(),
        foto_url: linha.foto,
        descricao: linha.descricao.trim() || null,
      };
      try {
        if (linha.id) await api.put(`/produtos/${linha.id}`, dados);
        else await api.post('/produtos', { ...dados, empresa_id: empresaId });
      } catch (erro) {
        falhas += 1;
      }
    }
    setSalvando(false);
    onMudou();
    if (falhas) {
      Alert.alert('Algumas linhas não foram salvas', `${falhas} de ${mudancas.length} alterações falharam. Tente de novo.`);
    } else {
      onFechar();
    }
  }

  return (
    <View>
      <Text style={styles.ajuda}>Toque na foto para trocar. O botão da direita muda a forma de cobrança. A descrição aparece no cartão do item.</Text>

      {linhas.map((linha) => {
        const comPreco = linha.forma === 'preco';
        return (
          <View key={linha.chave} style={[styles.linha, erroLinha === linha.chave && styles.linhaErro]}>
            <TouchableOpacity onPress={() => trocarFoto(linha)} disabled={!!enviandoFoto} style={styles.foto} accessibilityLabel="Trocar foto">
              <ImagemItem uri={linha.foto} categoria={linha.categoria || categoriaEmpresa} largura={52} raio={8} />
              {enviandoFoto === linha.chave
                ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.pretoTexto} />
                : <View style={styles.iconeFoto}><Ionicons name="camera" size={12} color={colors.brancoFundo} /></View>}
            </TouchableOpacity>

            <View style={styles.campos}>
              <View style={styles.linhaCampos}>
                <TextInput
                  value={linha.nome}
                  onChangeText={(t) => mudar(linha.chave, 'nome', t)}
                  placeholder="Nome do item"
                  placeholderTextColor={colors.cinzaPlaceholder}
                  maxLength={150}
                  style={[styles.celula, styles.nome]}
                />
                <TouchableOpacity onPress={() => remover(linha)} style={styles.lixeira} accessibilityLabel="Remover item">
                  <Ionicons name="trash-outline" size={20} color={colors.vermelhoAviso} />
                </TouchableOpacity>
              </View>
              <View style={styles.linhaCampos}>
                <Text style={styles.rs}>R$</Text>
                <TextInput
                  value={linha.preco}
                  onChangeText={(t) => mudar(linha.chave, 'preco', t.replace(/[^\d.,]/g, ''))}
                  placeholder={comPreco ? '0,00' : 'opcional'}
                  placeholderTextColor={colors.cinzaPlaceholder}
                  keyboardType="decimal-pad"
                  style={[styles.celula, styles.preco]}
                />
                <Text style={styles.barra}>/</Text>
                <TextInput
                  value={linha.unidade}
                  onChangeText={(t) => mudar(linha.chave, 'unidade', t)}
                  placeholder="un"
                  placeholderTextColor={colors.cinzaPlaceholder}
                  maxLength={20}
                  autoCapitalize="none"
                  style={[styles.celula, styles.unidade]}
                />
                <TouchableOpacity onPress={() => proximaForma(linha)} style={[styles.forma, !comPreco && styles.formaAtiva]}>
                  <Text style={styles.textoForma} numberOfLines={1}>{FORMAS.find((f) => f.valor === linha.forma).rotulo}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={linha.descricao}
                onChangeText={(t) => mudar(linha.chave, 'descricao', t)}
                placeholder="Descrição curta (ex: Corte + finalização)"
                placeholderTextColor={colors.cinzaPlaceholder}
                maxLength={120}
                style={[styles.celula, styles.descricao]}
              />
            </View>
          </View>
        );
      })}

      <TouchableOpacity onPress={novaLinha} style={styles.nova} activeOpacity={0.7}>
        <Ionicons name="add" size={20} color={colors.pretoTexto} />
        <Text style={styles.textoNova}>Nova linha</Text>
      </TouchableOpacity>

      <BotaoGradiente titulo="Salvar alterações" onPress={salvar} carregando={salvando} desativado={!!enviandoFoto} estilo={styles.botao} />
      <TouchableOpacity onPress={onFechar} disabled={salvando} style={styles.cancelar}>
        <Text style={styles.textoCancelar}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ajuda: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.bordaClara, paddingVertical: 8 },
  linhaErro: { backgroundColor: '#FDECEC' },
  foto: { marginRight: 10 },
  iconeFoto: { position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.pretoTexto, borderRadius: 8, padding: 2 },
  campos: { flex: 1 },
  linhaCampos: { flexDirection: 'row', alignItems: 'center' },
  celula: { ...tipografia.corpoMedio, fontSize: fs(14), color: colors.pretoTexto, paddingVertical: 4, paddingHorizontal: 4 },
  nome: { flex: 1 },
  descricao: { ...tipografia.legenda, color: colors.textoSecundario },
  lixeira: { paddingLeft: 8 },
  rs: { ...tipografia.legenda, color: colors.textoSecundario, marginLeft: 4 },
  preco: { width: 76 },
  barra: { ...tipografia.legenda, color: colors.textoSecundario },
  unidade: { width: 60 },
  forma: { marginLeft: 'auto', borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 110 },
  formaAtiva: { backgroundColor: colors.menuInicio, borderColor: colors.menuInicio },
  textoForma: { ...tipografia.legenda, color: colors.pretoTexto },
  nova: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  textoNova: { ...tipografia.corpo, color: colors.pretoTexto, marginLeft: 6 },
  botao: { marginTop: 8 },
  cancelar: { alignSelf: 'center', paddingVertical: 12 },
  textoCancelar: { ...tipografia.corpo, color: colors.textoSecundario },
});
