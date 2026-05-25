import { useEffect } from 'react';
import { connectSocket, getSocket } from '../api/socket';
import useAuthStore from '../store/useAuthStore';

/** Giriş yapmış herkes için socket bağlantısını canlı tut (admin bildirimleri dahil) */
export function useMessageSocket() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    connectSocket(token);

    const socket = getSocket();
    const onReconnect = () => {
      connectSocket(token);
    };

    socket.on('connect', onReconnect);

    return () => {
      socket.off('connect', onReconnect);
    };
  }, [isAuthenticated, token]);
}
