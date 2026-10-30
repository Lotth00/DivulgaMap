import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Servidor da API: local (EXPO_PUBLIC_API_URL no .env.local) ou Render
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://divulgamap.onrender.com',
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@divulgamap:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;