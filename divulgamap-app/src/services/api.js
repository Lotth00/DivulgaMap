import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const api = axios.create({
  baseURL: 'https://divulgamap.onrender.com', 
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@divulgamap:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;