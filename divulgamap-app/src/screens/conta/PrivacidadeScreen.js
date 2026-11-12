import React, { useState, useEffect } from 'react';
import TelaConta from '../../components/conta/TelaConta';
import { Caixa, OpcaoChave, Paragrafo } from '../../components/conta/Opcoes';
import { useDadosUsuario, atualizarDados } from '../../components/conta/util';

// Privacidade da conta (Figma 534:1004): conta privada
export default function PrivacidadeScreen({ navigation }) {
  const { dados, carregando, falhou, carregar } = useDadosUsuario(true);
  const [privada, setPrivada] = useState(false);

  useEffect(() => {
    if (dados) setPrivada(!!dados.conta_privada);
  }, [dados]);

  // Muda na hora e volta atrás se o servidor recusar
  async function mudar(valor) {
    setPrivada(valor);
    if (!(await atualizarDados({ conta_privada: valor }))) setPrivada(!valor);
  }

  return (
    <TelaConta
      navigation={navigation}
      titulo="Privacidade da conta"
      descricao="Decida quem pode ver o seu perfil no DivulgaMap."
      carregando={carregando && !dados}
      falhou={falhou && !dados}
      onTentarDeNovo={carregar}
    >
      <Caixa>
        <OpcaoChave texto="Conta privada" ligada={privada} onMudar={mudar} />
        <Paragrafo>
          Com a conta privada, o seu perfil, com a lista das suas avaliações e das fotos que você enviou, fica visível só
          para você. Outras pessoas veem apenas o seu nome e a sua foto.
        </Paragrafo>
        <Paragrafo>
          As avaliações continuam aparecendo dentro de cada empresa, com o seu nome, porque ajudam outras pessoas a
          escolher. Se não quiser que uma avaliação apareça, você pode editá-la ou excluí-la em Seu perfil.
        </Paragrafo>
      </Caixa>
    </TelaConta>
  );
}
