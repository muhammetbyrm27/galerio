import { useEffect } from 'react';
import { connectSocket, getSocket } from '../api/socket';
import useAuthStore from '../store/useAuthStore';
import useUnreadMessagesStore from '../store/useUnreadMessagesStore';

/** Kullanıcı: okunmamış mesaj sayısı + socket ile canlı güncelleme */
export function useUserUnreadMessages() {
  const { user, token, isAuthenticated } = useAuthStore();
  const unreadCount = useUnreadMessagesStore((s) => s.unreadCount);
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user' || !token) {
      useUnreadMessagesStore.getState().resetUnreadCount();
      return;
    }

    const fetchUnreadCount = () => useUnreadMessagesStore.getState().fetchUnreadCount();
    fetchUnreadCount();
    connectSocket(token);

    const socket = getSocket();
    const refresh = () => fetchUnreadCount();
    const onReceive = (msg) => {
      if (Number(msg.receiver_id) === Number(user.id)) {
        refresh();
      }
    };

    socket.on('update_notification_count', refresh);
    socket.on('conversation_read_status_updated', refresh);
    socket.on('user_notifications_were_reset', refresh);
    socket.on('receive_message', onReceive);

    return () => {
      socket.off('update_notification_count', refresh);
      socket.off('conversation_read_status_updated', refresh);
      socket.off('user_notifications_were_reset', refresh);
      socket.off('receive_message', onReceive);
    };
  }, [isAuthenticated, user?.id, user?.role, token]);

  return unreadCount;
}
