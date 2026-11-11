import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useWizard, mensagemDeErro } from '../../context/WizardContext';
import TelaWizard from '../../components/wizard/TelaWizard';
import CampoWizard from '../../components/wizard/CampoWizard';
import { mascaraTelefone, telefoneValido } from '../../components/conta/util';
import colors from '../../theme/colors';
import tipografia, { fs } from '../../theme/tipografia';

// Link opcional: vazio ou começando com http(s)
function linkValido(texto) {
  const limpo = texto.trim();
  return !limpo || /^https?:\/\/\S+\.\S+/i.test(limpo) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(limpo);
}

// Etapa 5 (Figma 626:1123): telefone, site e link do Google Maps
export default function ContatoEmpresaScreen({ navigation }) {
  const { empresa, salvar } = useWizard();
  const [telefone, setTelefone] = useState(empresa?.telefone ?? '');
  const [site, setSite] = useState(empresa?.site ?? '');
  const [mapa, setMapa] = useState(empresa?.google_maps_url ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function avancar() {
    if (!linkValido(site) || !linkValido(mapa)) {
      setErro('Confira o site e o link do Google Maps (por exemplo, www.minhaloja.com.br).');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      // Link sem "https://" ganha o prefixo, para abrir no navegador
      const comProtocolo = (texto) => (texto.trim() && !/^https?:\/\//i.test(texto.trim()) ? `https://${texto.trim()}` : texto.trim());
      await salvar({ telefone, site: comProtocolo(site), google_maps_url: comProtocolo(mapa) });
      // As próximas etapas (verificação, horário, fotos) chegam nas M22 e M23
      Alert.alert(
        'Dados salvos',
        'O seu cadastro ficou guardado como rascunho. As próximas etapas, como verificação, horários e fotos, chegam numa próxima versão do app.'
      );
      navigation.getParent()?.goBack();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaWizard
      navigation={navigation}
      passo={5}
      titulo="Informações de contato"
      descricao="O telefone aparece no perfil da empresa. Se for celular, as pessoas também podem chamar no WhatsApp."
      erro={erro}
      podeAvancar={telefoneValido(telefone)}
      enviando={enviando}
      onAvancar={avancar}
    >
      <View style={styles.linha}>
        <View style={styles.pais}>
          <Text style={styles.bandeira}>🇧🇷</Text>
        </View>
        <CampoWizard
          estilo={styles.telefone}
          placeholder="Número de telefone"
          value={telefone}
          onChangeText={(t) => setTelefone(mascaraTelefone(t))}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>
      <CampoWizard placeholder="Site (opcional)" value={site} onChangeText={setSite} autoCapitalize="none" keyboardType="url" maxLength={255} />
      <CampoWizard placeholder="Localização no Google Maps (opcional)" value={mapa} onChangeText={setMapa} autoCapitalize="none" keyboardType="url" maxLength={500} />
    </TelaWizard>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row' },
  pais: {
    width: 54, height: 54, borderRadius: 12, borderWidth: 2, borderColor: colors.bordaClara, backgroundColor: colors.fundoCaixa,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  bandeira: { ...tipografia.corpo, fontSize: fs(22) },
  telefone: { flex: 1 },
});
