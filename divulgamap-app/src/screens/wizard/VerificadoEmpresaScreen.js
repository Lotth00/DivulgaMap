import React from 'react';
import TelaSucesso from '../../components/wizard/TelaSucesso';

// Depois do código certo (Figma "Verificação validada"): os dados anteriores ficam travados
export default function VerificadoEmpresaScreen({ navigation }) {
  // Horário vira o começo da pilha: voltar não leva mais às etapas de dados
  const avancar = () => navigation.reset({ index: 0, routes: [{ name: 'WizardHorario' }] });
  return (
    <TelaSucesso
      titulo="Verificação validada com sucesso!"
      texto="Sua identidade foi confirmada com segurança. Agora você pode continuar com o processo normalmente."
      onAvancar={avancar}
    />
  );
}
