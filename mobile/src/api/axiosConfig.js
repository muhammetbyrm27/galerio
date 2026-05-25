import { create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config';

const api = create({
  baseURL: `${API_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
