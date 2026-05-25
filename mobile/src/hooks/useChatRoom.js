import { useState, useEffect, useRef, useCallback } from 'react';
import { connectSocket, getSocket } from '../api/socket';

export function useChatRoom(conversationId, token, options = {}) {
  const { isAdminViewer, onConversationRemoved } = options;
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const roomRef = useRef(null);
  const onRemovedRef = useRef(onConversationRemoved);
  onRemovedRef.current = onConversationRemoved;

  const upsertMessage = useCallback((message) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;
      const withoutDuplicateTemp = prev.filter(
        (m) =>
          !(
            String(m.id).startsWith('temp-') &&
            m.sender_id === message.sender_id &&
            m.message === message.message
          )
      );
      return [...withoutDuplicateTemp, message];
    });
  }, []);

  const appendOptimistic = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!conversationId || !token) {
      return;
    }

    if (!isAdminViewer && !/^user_\d+_vehicle_\d+_admin_\d+$/.test(conversationId)) {
      return;
    }

    const socket = connectSocket();
    setMessages([]);
    setReady(false);

    const join = () => {
      if (roomRef.current && roomRef.current !== conversationId) {
        socket.emit('leave_room', roomRef.current);
      }
      roomRef.current = conversationId;
      socket.emit('join_room', { conversationId, token });
    };

    const onLoad = (loaded) => {
      if (roomRef.current === conversationId) {
        setMessages(loaded);
        setReady(true);
      }
    };

    const onReceive = (message) => {
      if (message.conversation_id === conversationId) {
        upsertMessage(message);
      }
    };

    const onDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleConversationDeleted = (deletedId) => {
      if (deletedId === conversationId) {
        setMessages([]);
        setReady(false);
        onRemovedRef.current?.(deletedId);
      }
    };

    const onMessagesReadUpdate = ({ conversationId: cid, readerRole }) => {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.id).startsWith('temp-')) return m;
          if (readerRole === 'admin') {
            return { ...m, is_read_by_admin: 1 };
          }
          if (readerRole === 'user') {
            return { ...m, is_read_by_user: 1 };
          }
          return m;
        })
      );
    };

    if (socket.connected) join();
    else socket.on('connect', join);

    socket.on('load_messages', onLoad);
    socket.on('receive_message', onReceive);
    socket.on('message_deleted', onDeleted);
    socket.on('conversation_deleted', handleConversationDeleted);
    socket.on('messages_read_update', onMessagesReadUpdate);

    return () => {
      socket.off('connect', join);
      socket.off('load_messages', onLoad);
      socket.off('receive_message', onReceive);
      socket.off('message_deleted', onDeleted);
      socket.off('conversation_deleted', handleConversationDeleted);
      socket.off('messages_read_update', onMessagesReadUpdate);
      if (roomRef.current === conversationId) {
        socket.emit('leave_room', conversationId);
        roomRef.current = null;
      }
    };
  }, [conversationId, token, upsertMessage, isAdminViewer]);

  const sendMessage = useCallback(
    (payload) => {
      getSocket().emit('send_message', { ...payload, token });
    },
    [token]
  );

  return { messages, sendMessage, appendOptimistic, ready };
}
