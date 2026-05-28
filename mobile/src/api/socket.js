import { io } from 'socket.io-client';
import API_URL from '../config';

let socket = null;
let lastAuthToken = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};


export const connectSocket = (token) => {
  const s = getSocket();
  if (token) {
    if (token !== lastAuthToken) {
      s.auth = { token };
      lastAuthToken = token;
      if (s.connected) {
        s.disconnect();
      }
    }
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  lastAuthToken = null;
  if (socket?.connected) {
    socket.disconnect();
  }
};

export default getSocket;
