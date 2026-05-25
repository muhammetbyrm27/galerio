import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axiosConfig';
import { connectSocket, getSocket } from '../api/socket';
import useAuthStore from '../store/useAuthStore';
import { useChatRoom } from '../hooks/useChatRoom';
import { buildUserConversationId, parseConversationId } from '../utils/chatHelpers';
import ChatPanel from '../components/ChatPanel';
import VehicleDetailModal from '../components/VehicleDetailModal';
import ScreenLayout from '../components/ScreenLayout';
import useMessagesNavStore from '../store/useMessagesNavStore';
import useUnreadMessagesStore from '../store/useUnreadMessagesStore';
import {
  formatVehicleTitle,
  formatVehicleSubtitle,
  formatVehicleListLine,
} from '../utils/formatVehicle';

const MessagesScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState('');

  const [chatSession, setChatSession] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [vehicleDetail, setVehicleDetail] = useState(null);
  const [vehicleDetailVisible, setVehicleDetailVisible] = useState(false);
  const activeChatIdRef = useRef(null);

  const fetchVehicleDetail = useCallback(async (vehicleId, fallback = null) => {
    if (!vehicleId) return fallback;
    try {
      const { data } = await api.get(`/vehicles/${vehicleId}`);
      return data;
    } catch {
      return fallback;
    }
  }, []);

  const conversationId = chatSession?.conversationId ?? null;

  useEffect(() => {
    activeChatIdRef.current = chatSession?.conversationId ?? null;
  }, [chatSession?.conversationId]);

  const fetchConversations = useCallback(async () => {
    try {
      setListError('');
      const endpoint = isAdmin ? '/conversations' : '/user-conversations';
      const { data } = await api.get(endpoint);
      const seen = new Set();
      const unique = (Array.isArray(data) ? data : []).filter((c) => {
        const id = c?.conversation_id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setConversations(unique);
    } catch (err) {
      setListError(err.response?.data?.message || 'Konuşmalar yüklenemedi.');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
    if (!isAdmin) {
      useUnreadMessagesStore.getState().fetchUnreadCount();
    }
  }, [isAdmin]);

  const closeChat = useCallback(() => {
    setChatSession(null);
    setNewMessage('');
    fetchConversations();
  }, [fetchConversations]);

  const closeChatRef = useRef(closeChat);
  closeChatRef.current = closeChat;

  const handleConversationRemoved = useCallback(() => {
    Alert.alert('Sohbet silindi', 'Bu görüşme sunucudan kaldırıldı.');
    closeChatRef.current();
  }, []);

  const { messages, sendMessage, appendOptimistic, ready } = useChatRoom(conversationId, token, {
    isAdminViewer: isAdmin,
    onConversationRemoved: handleConversationRemoved,
  });

  const removeFromInbox = (conversationIdToRemove) => {
    Alert.alert(
      'Gelen kutusundan kaldır',
      'Bu sohbet yalnızca sizin listenizden kaldırılır. Karşı tarafın mesajları silinmez. Yeni mesaj gelirse sohbet tekrar görünür.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              const path = isAdmin
                ? `/conversations/${conversationIdToRemove}`
                : `/user/conversations/${conversationIdToRemove}`;
              await api.delete(path);
              if (chatSession?.conversationId === conversationIdToRemove) {
                closeChat();
              } else {
                fetchConversations();
              }
            } catch (err) {
              Alert.alert('Hata', err.response?.data?.message || 'Sohbet kaldırılamadı.');
            }
          },
        },
      ]
    );
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
    } catch (err) {
      const hint = err.response?.data?.hint;
      const msg = err.response?.data?.message || 'Bildirimler güncellenemedi.';
      Alert.alert('Hata', hint ? `${msg} (${hint})` : msg);
      return;
    }

    try {
      if (isAdmin && user?.id) {
        getSocket().emit('admin_cleared_notifications', { adminId: Number(user.id) });
      } else if (user?.id) {
        getSocket().emit('user_cleared_notifications', { userId: Number(user.id) });
      }
    } catch (_) {
      /* socket isteğe bağlı */
    }

    fetchConversations();
    if (!isAdmin) useUnreadMessagesStore.getState().fetchUnreadCount();
  };

  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  useFocusEffect(
    useCallback(() => {
      fetchConversationsRef.current();
      if (token) connectSocket(token);
    }, [token])
  );

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }

    const socket = getSocket();
    const refresh = () => fetchConversationsRef.current();

    const onConversationDeleted = (deletedId) => {
      if (activeChatIdRef.current === deletedId) {
        closeChatRef.current();
      } else {
        fetchConversationsRef.current();
      }
    };

    socket.on('conversation_deleted', onConversationDeleted);
    socket.on('conversation_read_status_updated', refresh);

    if (isAdmin) {
      socket.on('admin_refresh_conversations', refresh);
      socket.on('admin_new_unread_message', refresh);
      return () => {
        socket.off('admin_refresh_conversations', refresh);
        socket.off('admin_new_unread_message', refresh);
        socket.off('conversation_deleted', onConversationDeleted);
        socket.off('conversation_read_status_updated', refresh);
      };
    }

    socket.on('update_notification_count', refresh);
    return () => {
      socket.off('update_notification_count', refresh);
      socket.off('conversation_deleted', onConversationDeleted);
      socket.off('conversation_read_status_updated', refresh);
    };
  }, [isAdmin, token]);

  const openChatFromVehicle = useCallback(
    async (vehicle) => {
      if (!user || !token) return;
      try {
        let admin = adminUser;
        if (!admin) {
          const { data } = await api.get('/admin-user');
          admin = data;
          setAdminUser(data);
        }
        const convId = buildUserConversationId(user.id, vehicle.id, admin.id);
        const vehicleData = await fetchVehicleDetail(vehicle.id, vehicle);
        setChatSession({
          conversationId: convId,
          title: formatVehicleTitle(vehicleData),
          subtitle: formatVehicleSubtitle(vehicleData) || 'Satıcı ile mesajlaşma',
          receiverId: Number(admin.id),
          vehicleId: Number(vehicle.id),
          vehicle: vehicleData,
        });
        getSocket().emit('user_cleared_notifications', {
          userId: user.id,
          conversationId: convId,
        });
        setTimeout(() => useUnreadMessagesStore.getState().fetchUnreadCount(), 300);
      } catch {
        setListError('Admin bilgisi alınamadı, sohbet açılamadı.');
      }
    },
    [user, token, adminUser, fetchVehicleDetail]
  );

  useEffect(() => {
    const vehicle = route.params?.vehicle;
    if (vehicle && user?.role === 'user') {
      openChatFromVehicle(vehicle);
      navigation.setParams({ vehicle: undefined });
    }
  }, [route.params?.vehicle, user, openChatFromVehicle, navigation]);

  const openChatFromConversation = async (convo) => {
    const { userId, vehicleId, adminId } = parseConversationId(convo.conversation_id);
    const vid = Number(vehicleId || convo.vehicle_id);
    const vehicleData = await fetchVehicleDetail(vid, convo);

    const title = formatVehicleTitle(vehicleData || convo);
    const subtitle = isAdmin
      ? (convo.user_name || 'Müşteri')
      : formatVehicleSubtitle(vehicleData || convo) || 'Satıcı ile mesajlaşma';

    setChatSession({
      conversationId: convo.conversation_id,
      title,
      subtitle,
      receiverId: Number(isAdmin ? userId : adminId),
      vehicleId: vid,
      vehicle: vehicleData,
    });

    if (isAdmin) {
      getSocket().emit('admin_cleared_notifications', {
        adminId: Number(user.id),
        conversationId: convo.conversation_id,
      });
    } else {
      getSocket().emit('user_cleared_notifications', {
        userId: Number(user.id),
        conversationId: convo.conversation_id,
      });
      setTimeout(() => useUnreadMessagesStore.getState().fetchUnreadCount(), 300);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Mesaj silinemedi.');
    }
  };

  const handleSend = () => {
    const text = newMessage.trim();
    if (!text || !chatSession || !user || !ready) return;

    appendOptimistic({
      id: `temp-${Date.now()}`,
      conversation_id: chatSession.conversationId,
      sender_id: Number(user.id),
      receiver_id: Number(chatSession.receiverId),
      vehicle_id: chatSession.vehicleId,
      message: text,
      sender_name: user.name,
      created_at: new Date().toISOString(),
      pending: true,
    });

    sendMessage({
      conversation_id: chatSession.conversationId,
      sender_id: Number(user.id),
      receiver_id: Number(chatSession.receiverId),
      vehicle_id: Number(chatSession.vehicleId),
      message: text,
    });
    setNewMessage('');
  };

  useEffect(() => {
    useMessagesNavStore.getState().registerCloseChat(() => closeChatRef.current());
    return () => useMessagesNavStore.getState().unregisterCloseChat();
  }, []);

  const chatOpen = !!chatSession;
  const chatConversationId = chatSession?.conversationId ?? null;

  useEffect(() => {
    useMessagesNavStore.getState().setChatOpen(chatOpen, chatConversationId);
  }, [chatOpen, chatConversationId]);

  if (chatSession) {
    return (
      <>
        <ChatPanel
          title={chatSession.title}
          subtitle={chatSession.subtitle}
          vehicle={chatSession.vehicle}
          onOpenVehicle={
            chatSession.vehicle
              ? () => {
                  setVehicleDetail(chatSession.vehicle);
                  setVehicleDetailVisible(true);
                }
              : undefined
          }
          messages={messages}
          currentUserId={user.id}
          isAdmin={isAdmin}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          onSend={handleSend}
          onBack={closeChat}
          onDeleteMessage={deleteMessage}
          loading={!ready}
          sendingDisabled={!newMessage.trim()}
        />
        <VehicleDetailModal
          vehicle={vehicleDetail}
          visible={vehicleDetailVisible}
          onClose={() => {
            setVehicleDetailVisible(false);
            setVehicleDetail(null);
          }}
        />
      </>
    );
  }

  const renderConvo = ({ item }) => {
    const unread = item.unread_count > 0;
    const initial = (item.user_name || item.brand || '?').charAt(0).toUpperCase();

    return (
      <View style={[styles.convoCard, unread && styles.convoCardUnread]}>
        <TouchableOpacity
          style={styles.convoMain}
          onPress={() => openChatFromConversation(item)}
          activeOpacity={0.85}
        >
          <View style={styles.convoIcon}>
            {isAdmin ? (
              <Text style={styles.avatarLetter}>{initial}</Text>
            ) : (
              <Ionicons name="chatbubble-ellipses" size={24} color="#00f2fe" />
            )}
            {unread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.convoBody}>
            <Text style={[styles.convoTitle, unread && styles.convoTitleUnread]}>
              {isAdmin
                ? item.user_name || 'Müşteri'
                : formatVehicleTitle(item)}
            </Text>
            {isAdmin ? (
              <Text style={styles.convoVehicle} numberOfLines={2}>
                {formatVehicleListLine(item)}
              </Text>
            ) : (
              <Text style={styles.convoVehicle} numberOfLines={1}>
                {formatVehicleSubtitle(item)}
              </Text>
            )}
            <Text style={[styles.convoPreview, unread && styles.convoPreviewUnread]} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.convoTime}>
              {new Date(item.created_at).toLocaleString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => removeFromInbox(item.conversation_id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={22} color="#f87171" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loadingList) {
    return (
      <ScreenLayout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00f2fe" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.pageTitle}>{isAdmin ? 'Gelen Kutusu' : 'Mesajlarım'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={markAllAsRead}
            accessibilityLabel="Tümünü okundu işaretle"
          >
            <Ionicons name="checkmark-done-outline" size={22} color="#34d399" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              setRefreshing(true);
              fetchConversations();
            }}
          >
            <Ionicons name="refresh" size={22} color="#00f2fe" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>
        Yeşil tik: tüm okunmamışları okundu yapar. Satırdaki çöp: sohbeti yalnızca sizin listenizden kaldırır.
        Kendi mesajınızı silmek için mesaja uzun basın.{'\n'}
        Sohbetteyken çıkmak için: Mesajlar menüsüne iki kez hızlıca dokunun.
      </Text>

      {listError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{listError}</Text>
        </View>
      ) : null}

      <FlatList
        data={conversations}
        keyExtractor={(item, index) =>
          item.conversation_id ? String(item.conversation_id) : `convo-${index}`
        }
        renderItem={renderConvo}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor="#00f2fe"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="mail-open-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>Henüz mesaj yok.</Text>
            {!isAdmin ? (
              <Text style={styles.emptySub}>Bir araç ilanından mesaj başlatabilirsiniz.</Text>
            ) : null}
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : null}
      />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  refreshBtn: {
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.25)',
  },
  hint: { color: '#64748b', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  convoCardUnread: {
    borderColor: 'rgba(0,242,254,0.45)',
    backgroundColor: '#1a2d42',
  },
  convoMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 8,
  },
  convoIcon: {
    marginRight: 12,
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#00f2fe', fontSize: 18, fontWeight: '800' },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  convoBody: { flex: 1 },
  convoTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  convoTitleUnread: { color: '#00f2fe' },
  convoVehicle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  convoPreview: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  convoPreviewUnread: { color: '#cbd5e1', fontWeight: '500' },
  convoTime: { color: '#64748b', fontSize: 11, marginTop: 6 },
  emptyList: { flexGrow: 1 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
  emptySub: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});

export default MessagesScreen;
