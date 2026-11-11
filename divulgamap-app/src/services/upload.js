// Envio de imagens direto para o Cloudinary (preset sem assinatura, sem chave secreta no app)
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET;

// Tipo da imagem: o informado pelo seletor ou deduzido da extensão
function tipoDaImagem(uri, mimeType) {
  if (mimeType && mimeType.startsWith('image/')) return mimeType;
  const extensao = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  return `image/${extensao === 'jpg' ? 'jpeg' : extensao}`;
}

// Envia a imagem local e devolve a URL pública (https). Usa XMLHttpRequest porque o fetch do Expo não aceita { uri } no FormData
export function enviarImagem(uri, pasta = 'divulgamap', mimeType = null) {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !PRESET) {
      reject(new Error('Envio de fotos não configurado (Cloudinary).'));
      return;
    }
    const tipo = tipoDaImagem(uri, mimeType);
    const formulario = new FormData();
    formulario.append('file', { uri, name: `foto.${tipo.split('/')[1]}`, type: tipo });
    formulario.append('upload_preset', PRESET);
    formulario.append('folder', pasta);

    const pedido = new XMLHttpRequest();
    pedido.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    pedido.onload = () => {
      let dados = {};
      try {
        dados = JSON.parse(pedido.responseText);
      } catch (e) {
        // resposta sem JSON: cai na mensagem padrão
      }
      if (pedido.status >= 200 && pedido.status < 300 && dados.secure_url) resolve(dados.secure_url);
      else reject(new Error(dados.error?.message || 'Não foi possível enviar a foto.'));
    };
    pedido.onerror = () => reject(new Error('Sem conexão para enviar a foto. Tente de novo.'));
    pedido.send(formulario);
  });
}
