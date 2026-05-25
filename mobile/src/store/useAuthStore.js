import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { connectSocket, disconnectSocket } from '../api/socket';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (userData, token) => {
    await AsyncStorage.setItem('token', token);
    set({ user: userData, token, isAuthenticated: true });
    connectSocket(token);
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        await AsyncStorage.removeItem('token');
        return;
      }

      set({
        user: {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        },
        token,
        isAuthenticated: true,
      });
      connectSocket(token);
    } catch {
      await AsyncStorage.removeItem('token');
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
