import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TelaConta from '../../components/conta/TelaConta';
import { useDadosUsuario, dataParaCampo } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

const TAMANHO_MINIMO = 6;
const ESPERA_REENVIO = 60;

// Campo com fundo em degradê (Figma 522:1149), com olho para mostrar a senha
function CampoGradiente({ valor, onMudar, placeholder, senha = false, teclado, maxLength, primeiro }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <LinearGradient
      colors={[colors.menuInicio, colors.menuFim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.4 }}
      style={[styles.campo, !primeiro && styles.campoSeguinte]}
    >
      <TextInput
        style={styles.input}
        value={valor}
        onChangeText={onMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.textoSecundario}
        secureTextEntry={senha && !visivel}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={teclado}
        maxLength={maxLength}
      />
      {senha && (
        <TouchableOpacity onPress={() => setVisivel((v) => !v)} accessibilityLabel={visivel ? 'Esconder senha' : 'Mostrar senha'}>
          <Ionicons name={visivel ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textoSecundario} />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// Alterar senha: com a senha atual ou, se esqueceu, com o código enviado por e-mail
export default function TrocarSenhaScreen({ navigation }) {
  const { usuario, entrar } = useAuth();
  const { dados } = useDadosUsuario();
  const [modo, setModo] = useState('senha');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [desconectar, setDesconectar] = useState(true);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [pedindoCodigo, setPedindoCodigo] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [espera, setEspera] = useState(0);

  // Contagem para poder pedir outro código
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const atualizada = dados?.senha_atualizada_em ? ` (atualizada em ${dataParaCampo(dados.senha_atualizada_em)})` : '';

  async function pedirCodigo() {
    setErro(null);
    setPedindoCodigo(true);
    try {
      await api.post('/usuarios/me/solicitar-codigo-senha');
      setCodigoEnviado(true);
      setEspera(ESPERA_REENVIO);
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível enviar o código. Confira sua conexão.');
    } finally {
      setPedindoCodigo(false);
    }
  }

  function trocarModo(novo) {
    setModo(novo);
    setErro(null);
  }

  // Mensagem do que falta, ou null se dá para enviar
  function conferir() {
    if (modo === 'senha' && !senhaAtual) return 'Digite a sua senha atual.';
    if (modo === 'codigo' && !/^\d{6}$/.test(codigo)) return 'Digite o código de 6 números que chegou no seu e-mail.';
    if (nova.length < TAMANHO_MINIMO) return `A senha nova precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`;
    if (nova !== confirmar) return 'As duas senhas novas não são iguais.';
    if (modo === 'senha' && nova === senhaAtual) return 'A senha nova precisa ser diferente da atual.';
    return null;
  }

  async function alterar() {
    const problema = conferir();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const corpo = { novaSenha: nova, desconectarOutros: desconectar };
      if (modo === 'senha') corpo.senhaAtual = senhaAtual;
      else corpo.codigo = codigo;
      const resposta = await api.put('/usuarios/me/senha', corpo);
      // Com "desconectar outros", este aparelho recebe um login novo
      if (resposta.data.token) await entrar(resposta.data.token, usuario);
      Alert.alert('Senha alterada', desconectar ? 'Os outros aparelhos foram desconectados.' : 'Use a senha nova no próximo login.');
      navigation.goBack();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível alterar a senha. Confira sua conexão.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Alterar senha"
      descricao={
        modo === 'senha'
          ? 'Use pelo menos 6 caracteres. Uma senha que você não usa em outros sites é mais segura.'
          : `Vamos mandar um código de 6 números para ${usuario?.email ?? 'o seu e-mail'}. Ele vale por 10 minutos.`
      }
      rodape={
        <TouchableOpacity onPress={alterar} disabled={enviando} style={styles.botao} activeOpacity={0.8}>
          {enviando ? <ActivityIndicator color={colors.brancoFundo} /> : <Text style={styles.textoBotao}>Alterar senha</Text>}
        </TouchableOpacity>
      }
    >
      {modo === 'senha' ? (
        <CampoGradiente primeiro senha valor={senhaAtual} onMudar={setSenhaAtual} placeholder={`Senha atual${atualizada}`} />
      ) : (
        <>
          <TouchableOpacity
            onPress={pedirCodigo}
            disabled={pedindoCodigo || espera > 0}
            style={[styles.botaoCodigo, (pedindoCodigo || espera > 0) && styles.inativo]}
          >
            {pedindoCodigo ? (
              <ActivityIndicator color={colors.pretoTexto} />
            ) : (
              <Text style={styles.textoBotaoCodigo}>
                {espera > 0 ? `Reenviar código em ${espera}s` : codigoEnviado ? 'Reenviar código' : 'Enviar código para o e-mail'}
              </Text>
            )}
          </TouchableOpacity>
          {codigoEnviado && (
            <CampoGradiente
              primeiro
              valor={codigo}
              onMudar={(t) => setCodigo(t.replace(/\D/g, ''))}
              placeholder="Código de 6 números"
              teclado="number-pad"
              maxLength={6}
            />
          )}
        </>
      )}

      {(modo === 'senha' || codigoEnviado) && (
        <>
          <CampoGradiente senha valor={nova} onMudar={setNova} placeholder="Senha nova" />
          <CampoGradiente senha valor={confirmar} onMudar={setConfirmar} placeholder="Digite novamente sua nova senha" />
        </>
      )}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <TouchableOpacity onPress={() => trocarModo(modo === 'senha' ? 'codigo' : 'senha')} style={styles.link}>
        <Text style={styles.textoLink}>{modo === 'senha' ? 'Esqueceu a senha?' : 'Lembrei a senha atual'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setDesconectar((d) => !d)} style={styles.opcao} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: desconectar }}>
        <View style={[styles.caixaMarcar, desconectar && styles.caixaMarcada]}>
          {desconectar && <Ionicons name="checkmark" size={14} color={colors.pretoTexto} />}
        </View>
        <Text style={styles.textoOpcao}>
          Desconectar outros dispositivos. Opção recomendada se outra pessoa utilizou sua conta
        </Text>
      </TouchableOpacity>
    </TelaConta>
  );
}

const styles = StyleSheet.create({
  campo: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, minHeight: 52 },
  campoSeguinte: { marginTop: 6 },
  input: { flex: 1, ...tipografia.corpo, color: colors.pretoTexto, paddingVertical: 12 },
  botaoCodigo: { borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 8, backgroundColor: colors.brancoFundo },
  textoBotaoCodigo: { ...tipografia.corpo, color: colors.pretoTexto },
  inativo: { opacity: 0.6 },
  erro: { ...tipografia.legenda, color: colors.vermelhoAviso, marginTop: 10 },
  link: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  textoLink: { ...tipografia.corpo, color: colors.azulLink, textDecorationLine: 'underline' },
  opcao: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, paddingLeft: 10 },
  caixaMarcar: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.pretoTexto,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2,
  },
  caixaMarcada: { backgroundColor: colors.menuFim },
  textoOpcao: { ...tipografia.corpoMedio, color: colors.pretoTexto, flex: 1 },
  botao: { backgroundColor: colors.pretoTexto, borderRadius: 16, paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  textoBotao: { ...tipografia.corpo, fontSize: fs(18), color: colors.brancoFundo },
});
