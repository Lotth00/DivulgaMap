import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';
import TelaMapaBase from '../components/TelaMapaBase';
import CarrosselBanners from '../components/CarrosselBanners';
import TituloSecao from '../components/TituloSecao';
import CartaoOferta from '../components/CartaoOferta';
import CartaoPromocao from '../components/CartaoPromocao';
import CartaoEmpresa from '../components/CartaoEmpresa';
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

// Linha com rolagem horizontal
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
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [abaPromocao, setAbaPromocao] = useState('especial');
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [carregandoOfertas, setCarregandoOfertas] = useState(true);
  const [falhouEmpresas, setFalhouEmpresas] = useState(false);
  const [falhouOfertas, setFalhouOfertas] = useState(false);
  const ultimaBusca = useRef(0);
  const ultimaOferta = useRef(0);

  // Empresas do mapa, filtradas pelo chip de categoria
  useEffect(() => {
    buscarEmpresas();
  }, [categoriaSelecionada]);

  // Ofertas de novo quando a localização chega (para vir a distância)
  useEffect(() => {
    buscarOfertas();
  }, [localizacao]);

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

  const abrirOferta = useCallback((oferta) => {
    navigation.navigate('Oferta', { id: oferta.id, oferta });
  }, [navigation]);

  // Ofertas separadas por seção (e filtradas pelo chip de categoria)
  const secoes = useMemo(() => {
    const visiveis = categoriaSelecionada ? ofertas.filter((o) => o.categoria === categoriaSelecionada) : ofertas;
    return {
      produtos: visiveis.filter((o) => o.tipo === 'normal' && o.tipo_item !== 'servico'),
      servicos: visiveis.filter((o) => o.tipo === 'normal' && o.tipo_item === 'servico'),
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
    const temOfertas = secoes.produtos.length || secoes.servicos.length || secoes.especial.length || secoes.relampago.length;

    return (
      <>
        <CarrosselBanners />

        {falhouOfertas ? (
          <ErroComTentarDeNovo mensagem="Não foi possível carregar as ofertas." onTentarDeNovo={buscarOfertas} />
        ) : !temOfertas ? (
          <EstadoVazio icone="pricetags-outline" mensagem="Nenhuma oferta ativa por aqui agora." />
        ) : (
          <>
            {secoes.produtos.length > 0 && (
              <View style={styles.secao}>
                <TituloSecao titulo="Ofertas próximas de você" />
                <Carrossel>
                  {secoes.produtos.map((oferta) => (
                    <CartaoOferta key={oferta.id} oferta={oferta} onPress={() => abrirOferta(oferta)} />
                  ))}
                </Carrossel>
              </View>
            )}

            {secoes.servicos.length > 0 && (
              <View style={styles.secao}>
                <TituloSecao titulo="Serviços próximos de você" />
                <Carrossel>
                  {secoes.servicos.map((oferta) => (
                    <CartaoOferta key={oferta.id} oferta={oferta} onPress={() => abrirOferta(oferta)} />
                  ))}
                </Carrossel>
              </View>
            )}

            <View style={styles.secao}>
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
            </View>
          </>
        )}

        {!falhouEmpresas && novasEmpresas.length > 0 && (
          <View style={styles.secao}>
            <TituloSecao titulo="Novos negócios no app" />
            <Carrossel>
              {novasEmpresas.map((empresa) => (
                <CartaoEmpresa key={empresa.id_empresa} empresa={empresa} onPress={() => abrirEmpresa(empresa.id_empresa)} />
              ))}
            </Carrossel>
          </View>
        )}
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
      >
        {conteudoInicio()}
      </TelaMapaBase>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { marginBottom: 22 },
  carrossel: { marginHorizontal: -20 },
  conteudoCarrossel: { paddingHorizontal: 20, paddingVertical: 4 },
  textoVazio: { ...tipografia.legenda, color: colors.textoSecundario },
});
