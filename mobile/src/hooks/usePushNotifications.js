import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { connectSocket, getSocket } from '../api/socket';
import useAuthStore from '../store/useAuthStore';
import useMessagesNavStore from '../store/useMessagesNavStore';
import {
  isNotificationsSupported,
  initNotifications,
  requestNotificationPermissions,
  showMessageNotification,
} from '../services/notifications';

const shouldNotifyForConversation = (conversationId) => {
  const appState = AppState.currentState;
  const { isChatOpen, activeConversationId } = useMessagesNavStore.getState();

  if (isChatOpen && activeConversationId === conversationId) {
    return false;
  }
  if (appState !== 'active') {
    return true;
  }
  return !isChatOpen || activeConversationId !== conversationId;
};

export function usePushNotifications() {
  const { token, user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const userId = user?.id;
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) return;

    let cancelled = false;

    const setup = async () => {
      if (isNotificationsSupported) {
        await initNotifications();
        await requestNotificationPermissions();
      }
      if (cancelled) return;
      initialized.current = true;
      connectSocket(token);
    };

    setup();

    const socket = getSocket();

    const onAdminUnread = (payload) => {
      if (!isNotificationsSupported || !isAdmin) return;
      const convId = payload?.conversationId;
      if (!convId || !shouldNotifyForConversation(convId)) return;
      const preview = payload?.message?.message || 'Yeni müşteri mesajı';
      const sender = payload?.message?.sender_name;
      showMessageNotification({
        title: sender ? `${sender} — yeni mesaj` : 'Yeni mesaj',
        body: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
        data: { conversationId: convId },
      });
    };

    const onReceiveMessage = (message) => {
      if (!isNotificationsSupported || isAdmin) return;
      if (parseInt(message.receiver_id, 10) !== parseInt(userId, 10)) return;
      if (parseInt(message.sender_id, 10) === parseInt(userId, 10)) return;
      const convId = message.conversation_id;
      if (!convId || !shouldNotifyForConversation(convId)) return;
      const preview = message.message || 'Yeni mesaj';
      showMessageNotification({
        title: 'Satıcıdan yeni mesaj',
        body: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
        data: { conversationId: convId },
      });
    };

    socket.on('admin_new_unread_message', onAdminUnread);
    socket.on('receive_message', onReceiveMessage);

    return () => {
      cancelled = true;
      socket.off('admin_new_unread_message', onAdminUnread);
      socket.off('receive_message', onReceiveMessage);
    };
  }, [isAuthenticated, token, userId, isAdmin]);
}
