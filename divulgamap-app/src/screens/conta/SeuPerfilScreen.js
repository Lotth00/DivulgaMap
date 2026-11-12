import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../../services/api';
import Cabecalho from '../../components/Cabecalho';
import CaixaGradiente from '../../components/CaixaGradiente';
import TituloSecao from '../../components/TituloSecao';
import LinhaVerMais from '../../components/LinhaVerMais';
import Estrelas from '../../components/Estrelas';
import EstadoVazio from '../../components/EstadoVazio';
import Carregando from '../../components/Carregando';
import ErroComTentarDeNovo from '../../components/ErroComTentarDeNovo';
import MenuPopup, { ancoraDoToque } from '../../components/MenuPopup';
import ModalAvaliar from '../../components/ModalAvaliar';
import { useDadosUsuario } from '../../components/conta/util';
import { tempoDesde } from '../../components/perfilEmpresa/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const LIMITE_TEXTO = 140;
const MARGEM = 20;
const COLUNAS_FOTOS = 3;

// Foto redonda da pessoa ou o ícone padrão
function Avatar({ uri, tamanho }) {
  const estilo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.avatar, estilo]} />;
  return (
    <View style={[styles.avatar, styles.avatarVazio, estilo]}>
      <Ionicons name="person" size={tamanho * 0.45} color={colors.cinzaPlaceholder} />
    </View>
  );
}

// Número verde com legenda ("4 Avaliações")
function Numero({ valor, legenda }) {
  return (
    <View style={styles.numero}>
      <Text style={styles.valorNumero}>{valor}</Text>
      <Text style={styles.legendaNumero}>{legenda}</Text>
    </View>
  );
}

// Avaliação feita pela pessoa: empresa, estrelas, tempo, texto com "mais" e fotos
function CartaoMinhaAvaliacao({ avaliacao, onMenu, onAbrirEmpresa, onAbrirFoto }) {
  const [aberto, setAberto] = useState(false);
  const texto = avaliacao.comentario ?? '';
  const longo = texto.length > LIMITE_TEXTO;
  const quando = avaliacao.editado_em ? `Editado ${tempoDesde(avaliacao.editado_em)}` : tempoDesde(avaliacao.criado_em);

  return (
    <View style={styles.avaliacao}>
      <View style={styles.topoAvaliacao}>
        <TouchableOpacity onPress={onAbrirEmpresa} style={styles.flex} activeOpacity={0.7}>
          <Text style={styles.empresa} numberOfLines={1}>{avaliacao.empresa_nome}</Text>
          {avaliacao.empresa_categoria ? <Text style={styles.categoria} numberOfLines={1}>{avaliacao.empresa_categoria}</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => onMenu(ancoraDoToque(e))}
          style={styles.botaoMenu}
          accessibilityLabel="Opções da avaliação"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.iconeMenu} />
        </TouchableOpacity>
      </View>
      <View style={styles.linhaNota}>
        <Estrelas nota={Number(avaliacao.nota)} tamanho={16} />
        <Text style={styles.quando}>{quando}</Text>
      </View>
      {texto ? (
        <Text style={styles.comentario}>
          {longo && !aberto ? `${texto.slice(0, LIMITE_TEXTO).trimEnd()}… ` : `${texto} `}
          {longo && (
            <Text style={styles.mais} onPress={() => setAberto(!aberto)}>{aberto ? 'menos' : 'mais'}</Text>
          )}
        </Text>
      ) : null}
      {avaliacao.fotos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosAvaliacao}>
          {avaliacao.fotos.map((url) => (
            <TouchableOpacity key={url} onPress={() => onAbrirFoto(url)} activeOpacity={0.85}>
              <Image source={{ uri: url }} style={styles.fotoAvaliacao} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Seu perfil: cartão com foto, números e biografia; fotos e avaliações da pessoa (Figma 539:1110)
export default function SeuPerfilScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { dados } = useDadosUsuario(true);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [menu, setMenu] = useState(false);
  const [avaliacaoMenu, setAvaliacaoMenu] = useState(null);
  const [editando, setEditando] = useState(null);
  const [todasFotos, setTodasFotos] = useState(false);

  const carregar = useCallback(async () => {
    setFalhou(false);
    try {
      const resposta = await api.get('/usuarios/me/perfil');
      setPerfil(resposta.data);
    } catch (erro) {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const fotos = perfil?.fotos ?? [];
  const abrirFoto = (indice) => navigation.navigate('ImagemPerfil', { fotos, indice });
  const abrirFotoPorUrl = (url) => abrirFoto(Math.max(0, fotos.findIndex((f) => f.url === url)));
  const ladoMiniatura = (width - MARGEM * 2 - (COLUNAS_FOTOS - 1) * 6) / COLUNAS_FOTOS;

  let corpo;
  if (carregando) corpo = <Carregando />;
  else if (falhou) corpo = <ErroComTentarDeNovo onTentarDeNovo={carregar} />;
  else {
    corpo = (
      <>
        <TituloSecao titulo="Fotos" linha="lado" />
        {fotos.length === 0 ? (
          <Text style={styles.vazio}>As fotos que você colocar nas avaliações aparecem aqui.</Text>
        ) : (
          <>
            <TouchableOpacity onPress={() => abrirFoto(0)} activeOpacity={0.9} style={styles.fotoDestaque}>
              <Image source={{ uri: fotos[0].url }} style={styles.preenche} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.sombraFoto}>
                <Text style={styles.nomeFoto} numberOfLines={1}>{fotos[0].empresa_nome}</Text>
                <Text style={styles.tempoFoto}>{tempoDesde(fotos[0].criado_em)}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {todasFotos && fotos.length > 1 && (
              <View style={styles.grade}>
                {fotos.slice(1).map((foto, indice) => (
                  <TouchableOpacity key={foto.id_foto} onPress={() => abrirFoto(indice + 1)} activeOpacity={0.85}>
                    <Image source={{ uri: foto.url }} style={[styles.miniatura, { width: ladoMiniatura, height: ladoMiniatura }]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {fotos.length > 1 && (
              <LinhaVerMais texto={todasFotos ? 'Ver menos fotos' : 'Ver mais fotos'} onPress={() => setTodasFotos(!todasFotos)} />
            )}
          </>
        )}

        <View style={styles.espaco} />
        <TituloSecao titulo="Avaliações" linha="lado" />
        {perfil.avaliacoes.length === 0 ? (
          <EstadoVazio icone="star-outline" mensagem="Você ainda não avaliou nenhuma empresa." />
        ) : (
          perfil.avaliacoes.map((avaliacao, indice) => (
            <View key={avaliacao.id_avaliacao} style={indice > 0 && styles.divisoria}>
              <CartaoMinhaAvaliacao
                avaliacao={avaliacao}
                onMenu={(ancora) => setAvaliacaoMenu({ avaliacao, ancora })}
                onAbrirEmpresa={() => navigation.navigate('Empresa', { id: avaliacao.empresa_id, aba: 'avaliacoes' })}
                onAbrirFoto={abrirFotoPorUrl}
              />
            </View>
          ))
        )}
      </>
    );
  }

  return (
    <View style={styles.tela}>
      <StatusBar style="dark" />
      <Cabecalho onVoltar={() => navigation.goBack()} onMenu={() => setMenu(true)} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <CaixaGradiente estilo={styles.cartao} estiloConteudo={styles.cartaoConteudo}>
          <View style={styles.cartaoTopo}>
            <TouchableOpacity onPress={() => navigation.navigate('EditarPerfil')} activeOpacity={0.8}>
              <Avatar uri={dados?.foto_perfil_url} tamanho={72} />
            </TouchableOpacity>
            <View style={styles.cartaoTextos}>
              <Text style={styles.nome} numberOfLines={1}>{dados?.nome ?? ''}</Text>
              <View style={styles.numeros}>
                <Numero valor={perfil?.total_avaliacoes ?? 0} legenda="Avaliações" />
                <Numero valor={perfil?.total_fotos ?? 0} legenda="Fotos" />
              </View>
            </View>
          </View>
          <View style={styles.linha} />
          {dados?.biografia
            ? <Text style={styles.bio}>{dados.biografia}</Text>
            : (
              <TouchableOpacity onPress={() => navigation.navigate('EditarPerfil')}>
                <Text style={[styles.bio, styles.bioVazia]}>Conte um pouco sobre você em Editar perfil.</Text>
              </TouchableOpacity>
            )}
        </CaixaGradiente>
        {dados?.conta_privada && (
          <View style={styles.privada}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textoSecundario} />
            <Text style={styles.textoPrivada}>Conta privada: só você vê suas fotos e avaliações aqui.</Text>
          </View>
        )}
        {corpo}
      </ScrollView>

      <MenuPopup
        visivel={menu}
        opcoes={[{ texto: 'Editar perfil', onPress: () => navigation.navigate('EditarPerfil') }]}
        onFechar={() => setMenu(false)}
      />
      <MenuPopup
        visivel={!!avaliacaoMenu}
        ancora={avaliacaoMenu?.ancora}
        opcoes={avaliacaoMenu ? [
          { texto: 'Editar ou excluir', onPress: () => setEditando(avaliacaoMenu.avaliacao) },
          { texto: 'Abrir empresa', onPress: () => navigation.navigate('Empresa', { id: avaliacaoMenu.avaliacao.empresa_id }) },
        ] : []}
        onFechar={() => setAvaliacaoMenu(null)}
      />
      <ModalAvaliar
        visivel={!!editando}
        empresa={editando ? { id_empresa: editando.empresa_id, nome_fantasia: editando.empresa_nome } : null}
        avaliacaoAtual={editando}
        onFechar={() => setEditando(null)}
        onMudou={carregar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.fundoTela },
  conteudo: { paddingHorizontal: MARGEM, paddingBottom: 40 },
  flex: { flex: 1 },
  cartao: { marginTop: 4, marginBottom: 26 },
  cartaoConteudo: { paddingVertical: 14 },
  cartaoTopo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: colors.cinzaInput },
  avatarVazio: { alignItems: 'center', justifyContent: 'center' },
  cartaoTextos: { flex: 1, marginLeft: 16 },
  nome: { ...tipografia.tituloTela, fontSize: fs(18), color: colors.pretoTexto },
  numeros: { flexDirection: 'row', marginTop: 4 },
  numero: { marginRight: 36 },
  valorNumero: { ...tipografia.corpo, color: colors.verdePreco },
  legendaNumero: { ...tipografia.legenda, color: colors.textoSecundario },
  linha: { height: 1.5, backgroundColor: colors.bordaClara, marginVertical: 12 },
  bio: { ...tipografia.corpo, color: colors.pretoTexto },
  bioVazia: { color: colors.textoSecundario },
  privada: { flexDirection: 'row', alignItems: 'center', marginTop: -16, marginBottom: 20 },
  textoPrivada: { ...tipografia.legenda, color: colors.textoSecundario, marginLeft: 6, flex: 1 },
  vazio: { ...tipografia.legenda, color: colors.textoSecundario, marginBottom: 8 },
  fotoDestaque: { height: 170, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cinzaInput },
  preenche: { width: '100%', height: '100%' },
  sombraFoto: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 30, paddingBottom: 10 },
  nomeFoto: { ...tipografia.corpo, color: colors.brancoFundo },
  tempoFoto: { ...tipografia.legenda, color: colors.brancoFundo },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  miniatura: { borderRadius: 8, backgroundColor: colors.cinzaInput },
  espaco: { height: 18 },
  avaliacao: { paddingVertical: 14 },
  divisoria: { borderTopWidth: 1.5, borderTopColor: colors.bordaClara },
  topoAvaliacao: { flexDirection: 'row', alignItems: 'flex-start' },
  categoria: { ...tipografia.corpoMedio, color: colors.textoSecundario },
  empresa: { ...tipografia.corpo, fontSize: fs(17), color: colors.textoTitulo },
  botaoMenu: { paddingLeft: 12, paddingVertical: 4 },
  linhaNota: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  quando: { ...tipografia.corpoMedio, color: colors.textoSecundario, marginLeft: 10 },
  comentario: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginTop: 8 },
  mais: { color: colors.verdePreco, textDecorationLine: 'underline' },
  fotosAvaliacao: { marginTop: 10 },
  fotoAvaliacao: { width: 140, height: 100, borderRadius: 10, marginRight: 8, backgroundColor: colors.cinzaInput },
});
