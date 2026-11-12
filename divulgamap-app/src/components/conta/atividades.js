// Nomes das ações do registro de atividades, ícone e se é um sinal de alerta
export const ACOES = {
  cadastro: { texto: 'Conta criada', icone: 'person-add-outline' },
  login: { texto: 'Entrou na conta', icone: 'log-in-outline' },
  login_falhou: { texto: 'Tentativa de entrar com senha errada', icone: 'alert-circle-outline', alerta: true },
  dados_alterados: { texto: 'Dados da conta alterados', icone: 'create-outline' },
  conta_excluida: { texto: 'Conta excluída', icone: 'trash-outline', alerta: true },
  senha_codigo_pedido: { texto: 'Código para trocar a senha pedido', icone: 'mail-outline' },
  senha_codigo_errado: { texto: 'Código de senha digitado errado', icone: 'alert-circle-outline', alerta: true },
  senha_atual_errada: { texto: 'Senha atual digitada errada', icone: 'alert-circle-outline', alerta: true },
  senha_trocada: { texto: 'Senha alterada', icone: 'key-outline' },
  empresa_criada: { texto: 'Cadastro de empresa iniciado', icone: 'storefront-outline' },
  empresa_editada: { texto: 'Empresa editada', icone: 'create-outline' },
  empresa_enviada: { texto: 'Empresa enviada para aprovação', icone: 'send-outline' },
  empresa_aprovada: { texto: 'Empresa aprovada', icone: 'checkmark-circle-outline' },
  empresa_rejeitada: { texto: 'Empresa rejeitada', icone: 'close-circle-outline' },
  reivindicacao_criada: { texto: 'Pedido para ser dono de empresa', icone: 'key-outline' },
  denuncia_criada: { texto: 'Denúncia de empresa', icone: 'flag-outline' },
  solicitacao_aceita: { texto: 'Pedido aceito pela admin', icone: 'checkmark-done-outline' },
  solicitacao_recusada: { texto: 'Pedido recusado pela admin', icone: 'close-outline' },
  empresa_dono_trocado: { texto: 'Empresa mudou de dono', icone: 'swap-horizontal-outline', alerta: true },
  anuncio_criado: { texto: 'Anúncio criado', icone: 'megaphone-outline' },
  pagamento_aprovado: { texto: 'Pagamento aprovado', icone: 'card-outline' },
};

// Ação conhecida ou o código como veio
export function acao(codigo) {
  return ACOES[codigo] ?? { texto: codigo, icone: 'ellipse-outline' };
}

// Aparelho a partir do que o celular ou navegador informa
export function nomeDoAparelho(aparelho) {
  const texto = aparelho ?? '';
  if (/okhttp|android/i.test(texto)) return 'App no Android';
  if (/cfnetwork|darwin|iphone|ipad/i.test(texto)) return 'App no iPhone';
  if (/mozilla|chrome|safari|firefox/i.test(texto)) return 'Navegador';
  return 'Outro aparelho';
}

// Data ISO → "12/11/2026 às 13:05"
export function dataHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
