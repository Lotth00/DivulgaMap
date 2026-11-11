import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import api from '../../services/api';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import CampoWizard from '../../components/wizard/CampoWizard';
import Carregando from '../../components/Carregando';
import { NOMES_DIAS } from '../../components/perfilEmpresa/util';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

// 0 = domingo ... 6 = sábado (mesmo padrão do perfil da empresa)
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function semanaPadrao() {
  return DIAS.map(() => ({ aberto: false, abertura: '08:00', fechamento: '18:00' }));
}

// "0830" → "08:30"
function mascaraHora(texto) {
  const n = texto.replace(/\D/g, '').slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}:${n.slice(2)}` : n;
}

function horaValida(texto) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

// Etapa 8 (Figma 644:1343): os 7 dias, cada um aberto (com horário) ou fechado
export default function HorarioEmpresaScreen({ navigation }) {
  const { empresa, salvar } = useWizard();
  const [semana, setSemana] = useState(semanaPadrao);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Rascunho retomado: traz os horários já salvos
  useEffect(() => {
    api.get(`/horarios/empresa/${empresa.id_empresa}`)
      .then((resposta) => {
        if (!resposta.data.length) return;
        const nova = semanaPadrao();
        resposta.data.forEach((h) => {
          if (h.dia_semana < 0 || h.dia_semana > 6) return;
          nova[h.dia_semana] = {
            aberto: !h.fechado && !!h.abertura,
            abertura: h.abertura ? h.abertura.slice(0, 5) : '08:00',
            fechamento: h.fechamento ? h.fechamento.slice(0, 5) : '18:00',
          };
        });
        setSemana(nova);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [empresa.id_empresa]);

  function alterar(dia, campos) {
    setSemana((atual) => atual.map((d, i) => (i === dia ? { ...d, ...campos } : d)));
  }

  async function avancar() {
    const invalido = semana.findIndex((d) => d.aberto && (!horaValida(d.abertura) || !horaValida(d.fechamento) || d.abertura === d.fechamento));
    if (invalido >= 0) {
      setErro(`Confira o horário de ${NOMES_DIAS[invalido].toLowerCase()} (use o formato 08:00).`);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await salvar({
        horarios: semana.map((d, i) => ({
          dia_semana: i,
          abertura: d.aberto ? d.abertura : null,
          fechamento: d.aberto ? d.fechamento : null,
          fechado: !d.aberto,
        })),
      });
      navigation.navigate('WizardDescricao');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={8}
      titulo="Horário de funcionamento"
      descricao="Marque os dias em que a empresa abre e o horário de cada um. Se fechar depois da meia-noite, é só colocar o fechamento no dia seguinte (ex.: 18:00 às 02:00)."
      erro={erro}
      podeAvancar={!carregando}
      enviando={enviando}
      onAvancar={avancar}
    >
      {carregando ? (
        <Carregando />
      ) : (
        <View style={styles.caixa}>
          {semana.map((d, i) => (
            <View key={DIAS[i]} style={[styles.dia, i < 6 && styles.divisoria]}>
              <View style={styles.linha}>
                <Text style={styles.nome}>{DIAS[i]}</Text>
                <Switch
                  value={d.aberto}
                  onValueChange={(v) => alterar(i, { aberto: v })}
                  trackColor={{ false: colors.cinzaInput, true: colors.gradienteTopo }}
                  thumbColor={colors.pretoTexto}
                  accessibilityLabel={`${DIAS[i]} aberto`}
                />
                <Text style={styles.estado}>{d.aberto ? 'Aberto' : 'Fechado'}</Text>
              </View>
              {d.aberto && (
                <View style={styles.linha}>
                  <CampoWizard
                    estilo={styles.hora}
                    value={d.abertura}
                    onChangeText={(t) => alterar(i, { abertura: mascaraHora(t) })}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="08:00"
                    accessibilityLabel={`${DIAS[i]}, abre às`}
                  />
                  <Text style={styles.ate}>às</Text>
                  <CampoWizard
                    estilo={styles.hora}
                    value={d.fechamento}
                    onChangeText={(t) => alterar(i, { fechamento: mascaraHora(t) })}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="18:00"
                    accessibilityLabel={`${DIAS[i]}, fecha às`}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  caixa: { borderWidth: 2, borderColor: colors.bordaClara, borderRadius: 16, backgroundColor: colors.fundoCaixa, paddingHorizontal: 18 },
  dia: { paddingVertical: 8 },
  divisoria: { borderBottomWidth: 1, borderBottomColor: colors.bordaClara },
  linha: { flexDirection: 'row', alignItems: 'center' },
  nome: { ...tipografia.corpoMedio, color: colors.pretoTexto, flex: 1 },
  estado: { ...tipografia.corpoMedio, color: colors.textoSecundario, width: 70, textAlign: 'right' },
  hora: { flex: 1, marginTop: 6, marginBottom: 4, textAlign: 'center', paddingVertical: 8 },
  ate: { ...tipografia.corpoMedio, color: colors.pretoTexto, marginHorizontal: 12 },
});
