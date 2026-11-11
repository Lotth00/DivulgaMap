import React from 'react';
import TelaSucesso from '../../components/wizard/TelaSucesso';

// Fim do cadastro (Figma 781:3672): enviado para aprovação
export default function EnviadoEmpresaScreen({ navigation }) {
  return (
    <TelaSucesso
      titulo="Seu negócio foi enviado com sucesso!"
      texto="Aguarde 3 a 4 dias para a verificação e liberação pública. Enquanto isso, você pode editar seu perfil para aprimorar as informações."
      onAvancar={() => navigation.getParent()?.goBack()}
    />
  );
}
