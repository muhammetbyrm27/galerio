import { create } from 'zustand';

const DOUBLE_PRESS_MS = 450;
const lastPressAt = {};

export const handleMessagesTabDoublePress = (routeKey, event) => {
  const now = Date.now();
  const last = lastPressAt[routeKey] || 0;
  const isDouble = now - last < DOUBLE_PRESS_MS;
  lastPressAt[routeKey] = now;

  if (isDouble) {
    const closed = useMessagesNavStore.getState().tryCloseChat();
    if (closed && event?.preventDefault) {
      event.preventDefault();
    }
  }
};

const useMessagesNavStore = create((set, get) => ({
  isChatOpen: false,
  activeConversationId: null,
  closeChatFn: null,

  setChatOpen: (open, conversationId = null) => {
    const nextConversationId = open ? conversationId : null;
    const { isChatOpen, activeConversationId } = get();
    if (isChatOpen === open && activeConversationId === nextConversationId) {
      return;
    }
    set({
      isChatOpen: open,
      activeConversationId: nextConversationId,
    });
  },

  registerCloseChat: (fn) => set({ closeChatFn: fn }),

  unregisterCloseChat: () =>
    set({ closeChatFn: null, isChatOpen: false, activeConversationId: null }),

  tryCloseChat: () => {
    const { isChatOpen, closeChatFn } = get();
    if (isChatOpen && closeChatFn) {
      closeChatFn();
      return true;
    }
    return false;
  },
}));

export default useMessagesNavStore;
