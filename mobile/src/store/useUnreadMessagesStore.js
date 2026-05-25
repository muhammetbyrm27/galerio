import { create } from 'zustand';
import api from '../api/axiosConfig';
import { connectSocket } from '../api/socket';
import useAuthStore from './useAuthStore';

const useUnreadMessagesStore = create((set) => ({
  unreadCount: 0,

  fetchUnreadCount: async () => {
    const { user, token, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== 'user' || !token) {
      set({ unreadCount: 0 });
      return;
    }
    try {
      connectSocket(token);
      const { data } = await api.get('/user-notifications/unread-count');
      set({ unreadCount: data?.unreadCount || 0 });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  resetUnreadCount: () => set({ unreadCount: 0 }),
}));

export default useUnreadMessagesStore;
