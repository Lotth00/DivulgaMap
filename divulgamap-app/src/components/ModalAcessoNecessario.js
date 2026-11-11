import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import CartaoAcessoNecessario from './CartaoAcessoNecessario';

// Cartão de "faça login" por cima da tela; fecha antes de ir para Entrar ou Criar conta
export default function ModalAcessoNecessario({ visivel, mensagem, navigation, onFechar }) {
  const navegacao = {
    navigate: (rota) => {
      onFechar();
      navigation.navigate(rota);
    },
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={styles.centro} onPress={() => {}}>
          <CartaoAcessoNecessario mensagem={mensagem} navigation={navegacao} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  centro: { width: '100%' },
});
