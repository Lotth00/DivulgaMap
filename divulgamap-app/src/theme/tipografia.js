import { Dimensions, PixelRatio } from 'react-native';

// Largura do quadro do Figma; telas menores reduzem a letra na mesma proporção (até 85%)
const LARGURA_FIGMA = 430;
const FATOR = Math.min(1, Math.max(0.85, Dimensions.get('window').width / LARGURA_FIGMA));

// Tamanho do Figma ajustado à tela
export function fs(tamanho) {
  return PixelRatio.roundToNearestPixel(tamanho * FATOR);
}

// Fontes carregadas no App.js
export const fontes = {
  regular: 'Poppins_400Regular',
  media: 'Poppins_500Medium',
  seminegrito: 'Poppins_600SemiBold',
  destaque: 'Koulen_400Regular',
};

// Estilos de texto usados nas telas
export default {
  tituloTela: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(20) },       // "Configurações", "Ofertas próximas de você"
  tituloSecao: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(16) },      // "Fotos", "Avaliações" (com linha ao lado)
  corpo: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(16) },
  corpoMedio: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(15) },
  legenda: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(13) },
  pequeno: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(10) },
  botao: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: fs(16) },
};
