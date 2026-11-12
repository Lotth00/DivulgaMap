import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import tipografia from '../theme/tipografia';

const dois = (n) => String(n).padStart(2, '0');

// "AAAA-MM-DD" ↔ Date local
function textoParaData(texto) {
  if (!texto) return new Date();
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

// "HH:MM" ↔ Date local (hoje)
function textoParaHora(texto) {
  const data = new Date();
  const [hora, minuto] = (texto || '08:00').split(':').map(Number);
  data.setHours(hora, minuto, 0, 0);
  return data;
}

// Botão que abre o calendário ("data", valor "AAAA-MM-DD") ou o relógio ("hora", valor "HH:MM")
export default function CampoDataHora({ modo = 'data', valor, onMudar, placeholder, minimo, estilo }) {
  const [aberto, setAberto] = useState(false);
  const ehData = modo === 'data';
  const exibido = valor ? (ehData ? `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}` : valor) : '';

  function aoEscolher(evento, escolhido) {
    setAberto(Platform.OS === 'ios');
    if (evento.type !== 'set' || !escolhido) return;
    onMudar(ehData
      ? `${escolhido.getFullYear()}-${dois(escolhido.getMonth() + 1)}-${dois(escolhido.getDate())}`
      : `${dois(escolhido.getHours())}:${dois(escolhido.getMinutes())}`);
  }

  return (
    <View style={estilo}>
      <TouchableOpacity onPress={() => setAberto(true)} style={styles.campo} activeOpacity={0.7}>
        <Text style={[styles.texto, !exibido && styles.placeholder]}>{exibido || placeholder}</Text>
        <Ionicons name={ehData ? 'calendar-outline' : 'time-outline'} size={20} color={colors.textoSecundario} />
      </TouchableOpacity>
      {aberto && (
        <DateTimePicker
          value={ehData ? textoParaData(valor) : textoParaHora(valor)}
          mode={ehData ? 'date' : 'time'}
          is24Hour
          minimumDate={minimo ? textoParaData(minimo) : undefined}
          onChange={aoEscolher}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.bordaClara, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  texto: { ...tipografia.corpo, color: colors.pretoTexto },
  placeholder: { color: colors.cinzaPlaceholder },
});
