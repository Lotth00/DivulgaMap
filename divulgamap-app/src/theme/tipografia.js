// Fontes carregadas no App.js
export const fontes = {
  regular: 'Poppins_400Regular',
  media: 'Poppins_500Medium',
  seminegrito: 'Poppins_600SemiBold',
  destaque: 'Koulen_400Regular',
};

// Estilos de texto usados nas telas
export default {
  tituloTela: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 20 },       // "Configurações", "Ofertas próximas de você"
  tituloSecao: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 17 },      // "Fotos", "Avaliações" (com linha ao lado)
  corpo: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 16 },
  corpoMedio: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 15 },
  legenda: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 13 },
  pequeno: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 11 },
  botao: { fontFamily: fontes.regular, includeFontPadding: false, fontSize: 16 },
};
