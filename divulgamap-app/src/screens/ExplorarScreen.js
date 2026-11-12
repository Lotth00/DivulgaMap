import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import api from '../services/api';
import TelaMapaBase from '../components/TelaMapaBase';
import CarrosselBanners from '../components/CarrosselBanners';
import TituloSecao from '../components/TituloSecao';
import CartaoOferta from '../components/CartaoOferta';
import CartaoPromocao from '../components/CartaoPromocao';
import CartaoEmpresa from '../components/CartaoEmpresa';
import CartaoServico from '../components/CartaoServico';
import AnuncioFaixa, { abrirAnuncio, registrarEventoAnuncio } from '../components/AnuncioFaixa';
import LinhaVerMais from '../components/LinhaVerMais';
import AbasPromocoes from '../components/AbasPromocoes';
import Carregando from '../components/Carregando';
import EstadoVazio from '../components/EstadoVazio';
import ErroComTentarDeNovo from '../components/ErroComTentarDeNovo';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const ABAS = [
  { valor: 'especial', rotulo: 'Especiais' },
  { valor: 'relampago', rotulo: 'Relâmpago' },
];
const QUANTIDADE_NOVAS_EMPRESAS = 6;

// Linha com rolagem horizontal (a do gesture-handler, para não brigar com o arrastar do menu)
function Carrossel({ children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carrossel} contentContainerStyle={styles.conteudoCarrossel}>
      {children}
    </ScrollView>
  );
}

export default function ExplorarScreen({ navigation }) {
  const [empresas, setEmpresas] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [abaPromocao, setAbaPromocao] = useState('especial');
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [carregandoOfertas, setCarregandoOfertas] = useState(true);
  const [falhouEmpresas, setFalhouEmpresas] = useState(false);
  const [falhouOfertas, setFalhouOfertas] = useState(false);
  const ultimaBusca = useRef(0);
  const ultimaOferta = useRef(0);
  const ultimoServico = useRef(0);
  const [atualizando, setAtualizando] = useState(false);
  const [banners, setBanners] = useState([]);
  const [faixas, setFaixas] = useState([]);
  const anunciosVistos = useRef(new Set());
  const focada = useIsFocused();

  // Anúncios de novo a cada abertura da tela; as impressões voltam a contar
  useFocusEffect(useCallback(() => {
    anunciosVistos.current = new Set();
    buscarAnuncios();
  }, []));

  async function buscarAnuncios() {
    try {
      const [respostaBanners, respostaFaixas] = await Promise.all([
        api.get('/anuncios/ativos', { params: { formato: 'banner' } }),
        api.get('/anuncios/ativos', { params: { formato: 'faixa' } }),
      ]);
      setBanners(respostaBanners.data);
      setFaixas(respostaFaixas.data);
    } catch (erro) {
      // Sem anúncios, carrossel e faixas somem
      setBanners([]);
      setFaixas([]);
    }
  }

  // Uma impressão por anúncio a cada abertura da tela
  const registrarImpressao = useCallback((id) => {
    if (anunciosVistos.current.has(id)) return;
    anunciosVistos.current.add(id);
    registrarEventoAnuncio(id, 'impressao');
  }, []);

  const tocarAnuncio = useCallback((anuncio) => abrirAnuncio(anuncio, navigation), [navigation]);

  // Empresas do mapa, filtradas pelo chip de categoria
  useEffect(() => {
    buscarEmpresas();
  }, [categoriaSelecionada]);

  // Ofertas de novo quando a localização chega (para vir a distância)
  useEffect(() => {
    buscarOfertas();
  }, [localizacao]);

  // Serviços perto, pela localização e pelo chip de categoria
  useEffect(() => {
    buscarServicos();
  }, [localizacao, categoriaSelecionada]);

  async function buscarServicos() {
    const numero = ++ultimoServico.current;
    const parametros = {};
    if (localizacao) {
      parametros.lat = localizacao.latitude;
      parametros.lng = localizacao.longitude;
    }
    if (categoriaSelecionada) parametros.categoria = categoriaSelecionada;
    try {
      const resposta = await api.get('/produtos/servicos-proximos', { params: parametros });
      if (numero === ultimoServico.current) setServicos(resposta.data);
    } catch (erro) {
      if (numero === ultimoServico.current) setServicos([]);
    }
  }

  // Arrastar para baixo: busca tudo de novo
  async function atualizar() {
    setAtualizando(true);
    await Promise.all([buscarEmpresas(), buscarOfertas(), buscarServicos(), buscarAnuncios()]);
    setAtualizando(false);
  }

  async function buscarEmpresas() {
    const numeroDaBusca = ++ultimaBusca.current;
    setCarregandoEmpresas(true);
    setFalhouEmpresas(false);
    try {
      const parametros = {};
      if (categoriaSelecionada) parametros.categoria = categoriaSelecionada;

      const resposta = await api.get('/empresas', { params: parametros });
      // Resposta de uma busca antiga é descartada
      if (numeroDaBusca === ultimaBusca.current) setEmpresas(resposta.data);
    } catch (erro) {
      console.log('Erro ao buscar empresas:', erro?.message);
      if (numeroDaBusca === ultimaBusca.current) setFalhouEmpresas(true);
    } finally {
      if (numeroDaBusca === ultimaBusca.current) setCarregandoEmpresas(false);
    }
  }

  async function buscarOfertas() {
    const numero = ++ultimaOferta.current;
    setCarregandoOfertas(true);
    setFalhouOfertas(false);
    try {
      const parametros = { limite: 50 };
      if (localizacao) {
        parametros.lat = localizacao.latitude;
        parametros.lng = localizacao.longitude;
      }
      const resposta = await api.get('/promocoes/ativas', { params: parametros });
      if (numero === ultimaOferta.current) setOfertas(resposta.data);
    } catch (erro) {
      console.log('Erro ao buscar ofertas:', erro?.message);
      if (numero === ultimaOferta.current) setFalhouOfertas(true);
    } finally {
      if (numero === ultimaOferta.current) setCarregandoOfertas(false);
    }
  }

  function tentarDeNovo() {
    buscarEmpresas();
    buscarOfertas();
  }

  const abrirEmpresa = useCallback((id) => {
    navigation.navigate('Empresa', { id });
  }, [navigation]);

  // Serviço com oferta abre a oferta; sem oferta, o perfil no cardápio com ele em destaque
  const abrirServico = useCallback((servico) => {
    if (servico.oferta_id) navigation.navigate('Oferta', { id: servico.oferta_id });
    else navigation.navigate('Empresa', { id: servico.empresa_id, aba: 'cardapio', produtoId: servico.id_produto });
  }, [navigation]);

  const abrirOferta = useCallback((oferta) => {
    navigation.navigate('Oferta', { id: oferta.id, oferta });
  }, [navigation]);

  // Ofertas separadas por seção (e filtradas pelo chip de categoria)
  const secoes = useMemo(() => {
    const visiveis = categoriaSelecionada ? ofertas.filter((o) => o.categoria === categoriaSelecionada) : ofertas;
    return {
      produtos: visiveis.filter((o) => o.tipo === 'normal' && o.tipo_item !== 'servico'),
      especial: visiveis.filter((o) => o.tipo === 'especial'),
      relampago: visiveis.filter((o) => o.tipo === 'relampago'),
    };
  }, [ofertas, categoriaSelecionada]);

  const novasEmpresas = useMemo(
    () => [...empresas].sort((a, b) => b.id_empresa - a.id_empresa).slice(0, QUANTIDADE_NOVAS_EMPRESAS),
    [empresas]
  );

  const pontos = useMemo(
    () => empresas
      .filter((empresa) => empresa.latitude && empresa.longitude)
      .map((empresa) => ({
        id: empresa.id_empresa,
        latitude: parseFloat(empresa.latitude),
        longitude: parseFloat(empresa.longitude),
      })),
    [empresas]
  );

  function conteudoInicio() {
    const carregando = (carregandoOfertas && ofertas.length === 0) || (carregandoEmpresas && empresas.length === 0);
    if (carregando) return <Carregando />;
    if (falhouOfertas && falhouEmpresas) return <ErroComTentarDeNovo onTentarDeNovo={tentarDeNovo} />;

    const promocoesDaAba = secoes[abaPromocao];
    const verMais = (titulo, tipo, itens) => () => navigation.navigate('ListaSecao', { titulo, tipo, itens });

    // Seções com conteúdo; entre uma e outra entra uma faixa de anúncio, se houver
    const blocos = [];
    if (falhouOfertas) {
      blocos.push(<ErroComTentarDeNovo key="erro" mensagem="Não foi possível carregar as ofertas." onTentarDeNovo={buscarOfertas} />);
    } else if (secoes.produtos.length) {
      const abrir = verMais('Ofertas próximas de você', 'oferta', secoes.produtos);
      blocos.push(
        <View key="produtos" style={styles.secao}>
          <TituloSecao titulo="Ofertas próximas de você" onVerMais={abrir} />
          <Carrossel>
            {secoes.produtos.map((oferta) => (
              <CartaoOferta key={oferta.id} oferta={oferta} onPress={() => abrirOferta(oferta)} />
            ))}
          </Carrossel>
          <LinhaVerMais onPress={abrir} estilo={styles.verMais} />
        </View>
      );
    }
    if (servicos.length) {
      const abrir = verMais('Serviços próximos de você', 'servico', servicos);
      blocos.push(
        <View key="servicos" style={styles.secao}>
          <TituloSecao titulo="Serviços próximos de você" onVerMais={abrir} />
          <Carrossel>
            {servicos.map((servico) => (
              <CartaoServico key={servico.id_produto} servico={servico} onPress={() => abrirServico(servico)} />
            ))}
          </Carrossel>
          <LinhaVerMais onPress={abrir} estilo={styles.verMais} />
        </View>
      );
    }
    if (!falhouOfertas) {
      blocos.push(
        <View key="ofertas" style={styles.secao}>
          <TituloSecao titulo="Ofertas" />
          <AbasPromocoes abas={ABAS} selecionada={abaPromocao} onSelecionar={setAbaPromocao} />
          {promocoesDaAba.length === 0 ? (
            <Text style={styles.textoVazio}>
              {abaPromocao === 'relampago' ? 'Nenhuma oferta relâmpago agora.' : 'Nenhuma oferta especial agora.'}
            </Text>
          ) : (
            <Carrossel>
              {promocoesDaAba.map((oferta) => (
                <CartaoPromocao key={oferta.id} oferta={oferta} onPress={() => abrirOferta(oferta)} />
              ))}
            </Carrossel>
          )}
          <LinhaVerMais
            estilo={styles.verMais}
            onPress={verMais(abaPromocao === 'relampago' ? 'Ofertas relâmpago' : 'Ofertas especiais', 'promocao', promocoesDaAba)}
          />
        </View>
      );
    }
    if (!falhouEmpresas && novasEmpresas.length > 0) {
      const abrir = verMais('Novos negócios no app', 'empresa', [...empresas].sort((a, b) => b.id_empresa - a.id_empresa));
      blocos.push(
        <View key="empresas" style={styles.secao}>
          <TituloSecao titulo="Novos negócios no app" onVerMais={abrir} />
          <Carrossel>
            {novasEmpresas.map((empresa) => (
              <CartaoEmpresa key={empresa.id_empresa} empresa={empresa} onPress={() => abrirEmpresa(empresa.id_empresa)} />
            ))}
          </Carrossel>
          <LinhaVerMais onPress={abrir} estilo={styles.verMais} />
        </View>
      );
    }

    return (
      <>
        <CarrosselBanners banners={banners} ativo={focada} onImpressao={registrarImpressao} onTocar={tocarAnuncio} />
        {blocos.length === 0 && <EstadoVazio icone="pricetags-outline" mensagem="Nenhuma oferta ativa por aqui agora." />}
        {blocos.map((bloco, indice) => (
          <React.Fragment key={bloco.key}>
            {bloco}
            {indice < blocos.length - 1 && (faixas[indice] ? (
              <AnuncioFaixa
                anuncio={faixas[indice]}
                ativo={focada}
                onImpressao={registrarImpressao}
                onPress={() => tocarAnuncio(faixas[indice])}
              />
            ) : <View style={styles.espacoEntreSecoes} />)}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <TelaMapaBase
        categoriaSelecionada={categoriaSelecionada}
        onMudarCategoria={setCategoriaSelecionada}
        pontos={pontos}
        onTocarPonto={abrirEmpresa}
        onMudarLocalizacao={setLocalizacao}
        atualizando={atualizando}
        onAtualizar={atualizar}
      >
        {conteudoInicio()}
      </TelaMapaBase>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {},
  espacoEntreSecoes: { height: 28 },
  verMais: { marginTop: 10, marginBottom: 0 },
  carrossel: { marginHorizontal: -20 },
  conteudoCarrossel: { paddingHorizontal: 20, paddingVertical: 4 },
  textoVazio: { ...tipografia.legenda, color: colors.textoSecundario },
});
