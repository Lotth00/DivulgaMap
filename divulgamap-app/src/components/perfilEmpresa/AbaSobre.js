import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TituloSecao from '../TituloSecao';
import CartaoHorario from './CartaoHorario';
import BlocoContato from './BlocoContato';
import colors from '../../theme/colors';
import tipografia from '../../theme/tipografia';

const TEXTO_TIPO = { comercio: 'Comércio', servico: 'Prestação de serviços', ambos: 'Comércio e serviços' };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Aba "Sobre": descrição, tipo, categorias, horário completo e contatos
export default function AbaSobre({ empresa }) {
  const desde = empresa.data_cadastro ? new Date(empresa.data_cadastro) : null;

  return (
    <View>
      <View style={styles.bloco}>
        <TituloSecao titulo="Descrição" linha="lado" />
        <Text style={styles.texto}>{empresa.descricao || 'A empresa ainda não escreveu uma descrição.'}</Text>
      </View>

      <View style={styles.bloco}>
        <TituloSecao titulo="Detalhes" linha="lado" />
        {TEXTO_TIPO[empresa.tipo] && <Text style={styles.texto}>{TEXTO_TIPO[empresa.tipo]}</Text>}
        {empresa.categorias?.length > 0 && (
          <View style={styles.chips}>
            {empresa.categorias.map((categoria) => (
              <View key={categoria} style={styles.chip}>
                <Text style={styles.textoChip}>{categoria}</Text>
              </View>
            ))}
          </View>
        )}
        {desde && !Number.isNaN(desde.getTime()) && (
          <Text style={styles.desde}>No DivulgaMap desde {MESES[desde.getMonth()]} de {desde.getFullYear()}</Text>
        )}
      </View>

      <View style={styles.bloco}>
        <CartaoHorario empresa={empresa} abertoInicial />
      </View>

      <View style={styles.bloco}>
        <TituloSecao titulo="Contato" linha="lado" />
        <BlocoContato empresa={empresa} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: 22 },
  texto: { ...tipografia.corpo, color: colors.pretoTexto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { backgroundColor: colors.menuInicio, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginRight: 8, marginBottom: 8 },
  textoChip: { ...tipografia.legenda, color: colors.pretoTexto },
  desde: { ...tipografia.legenda, color: colors.textoSecundario, marginTop: 4 },
});
