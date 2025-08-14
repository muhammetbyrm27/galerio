import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './ChatModal.css';
import { socket } from './socket';

function ChatModal({ vehicle, closeModal }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const currentRoomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setCurrentUser(decodedUser);
        console.log('👤 Current user:', decodedUser);
        fetchAdminUser();
      } catch (e) {
        console.error('Token decode error:', e);
        closeModal();
      }
    } else {
      closeModal();
    }
  }, [closeModal]);

  const fetchAdminUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin-user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('👨‍💼 Admin user:', response.data);
      setAdminUser(response.data);
    } catch (error) {
      console.error("Admin kullanıcı alınamadı, varsayılan ID=1 kullanılacak");
      setAdminUser({ id: 1 }); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  // *** DÜZELTME: Conversation ID formatını standartlaştır (sadece _ kullan) ***
  const conversationId = (currentUser && adminUser)
      ? `user_${currentUser.id}_vehicle_${vehicle.id}_admin_${adminUser.id}`
      : null;

  console.log('🆔 Generated conversation ID:', conversationId);

  useEffect(() => {
    // Eğer gerekli veriler henüz yüklenmediyse bekle
    if (isLoading || !currentUser || !conversationId || !adminUser) return;

    const token = localStorage.getItem('token');
    if (!token) {
      closeModal();
      return;
    }

    // Socket bağlantısını sağla
    if (!socket.connected) {
      console.log('🔌 Socket bağlantısı kuruluyor...');
      socket.connect();
    }

    // Önceki room'dan ayrıl
    if (currentRoomRef.current && currentRoomRef.current !== conversationId) {
      console.log(`🚪 Eski room'dan ayrılıyor: ${currentRoomRef.current}`);
      socket.emit('leave_room', currentRoomRef.current);
    }

    // Yeni room'a katıl
    console.log(`🏠 Yeni room'a katılıyor: ${conversationId}`);
    currentRoomRef.current = conversationId;

    // Mesajları temizle (yeni konuşma için)
    setMessages([]);

    const onConnect = () => {
      console.log('🔗 Socket bağlandı, room\'a katılıyor:', conversationId);
      socket.emit('join_room', { conversationId, token });
      socket.emit('user_cleared_notifications', {
        userId: currentUser.id,
        conversationId: conversationId
      });
    };

    const handleLoadMessages = (loadedMessages) => {
      console.log(`📨 ${loadedMessages.length} mesaj yüklendi for conversation:`, conversationId);
      setMessages(loadedMessages);
    };

    const handleReceiveMessage = (message) => {
      console.log('📩 Mesaj alındı:', message);
      console.log('🔍 Mesaj conversation_id:', message.conversation_id);
      console.log('🔍 Mevcut conversation_id:', conversationId);

      // *** SIKI GÜVENLİK KONTROLÜ: Tam eşleşme ***
      if (message.conversation_id === conversationId) {
        console.log('✅ Mesaj bu conversation\'a ait, ekleniyor');
        setMessages((prev) => [...prev, message]);
      } else {
        console.log('❌ Mesaj farklı conversation\'a ait, ENGELLENDI');
        console.log('❌ Beklenen:', conversationId);
        console.log('❌ Gelen:', message.conversation_id);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      console.log('🗑️ Mesaj silindi:', messageId);
      setMessages((prev) => prev.filter(msg => msg.id !== messageId));
    };

    // Socket event'lerini dinle
    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    socket.on('load_messages', handleLoadMessages);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_deleted', handleMessageDeleted);
    const handleNotificationsReset = () => {
      console.log('✅ Kullanıcı Bildirimleri temizlendi');
    };

    socket.on('user_notifications_were_reset', handleNotificationsReset);
    // Cleanup function
    return () => {
      socket.off('connect', onConnect);
      socket.off('load_messages', handleLoadMessages);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_notifications_were_reset', handleNotificationsReset);
    };
  }, [currentUser, conversationId, adminUser, closeModal, isLoading]);

  // Modal kapanırken room'dan ayrıl
  useEffect(() => {
    return () => {
      if (currentRoomRef.current) {
        console.log(`🚪 Modal kapanıyor, room'dan ayrılıyor: ${currentRoomRef.current}`);
        socket.emit('leave_room', currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || !currentUser || !conversationId || !adminUser) return;

    console.log('📤 Mesaj gönderiliyor:', {
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: adminUser.id,
      vehicle_id: vehicle.id,
      message: trimmedMessage
    });

    const messageData = {
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: adminUser.id,
      vehicle_id: vehicle.id,
      message: trimmedMessage,
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Mesajı silmek istediğinizden emin misiniz? (Bu sadece sizin görünümünüzden silinecek)")) {
      // Backend'e istek GÖNDERMEYİN - sadece state'ten kaldırın
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    }
  };

  // Yükleme durumu
  if (isLoading) {
    return (
        <div className="chat-modal-overlay" onClick={closeModal}>
          <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <h3>Yükleniyor...</h3>
              <button onClick={closeModal} className="close-chat-btn">×</button>
            </div>
            <div className="chat-messages">
              <p>Bağlantı kuruluyor...</p>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="chat-modal-overlay" onClick={closeModal}>
        <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="chat-header">
            <h3>{vehicle.brand} {vehicle.model}</h3>
            <span>Satıcı ile Mesajlaşma</span>
            <button onClick={closeModal} className="close-chat-btn">×</button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  Henüz mesaj yok. İlk mesajı gönderin!
                </div>
            ) : (
                messages.map((msg) => {
                  const isSentByUser = currentUser ? parseInt(msg.sender_id) === currentUser.id : false;
                  return (
                      <div key={msg.id} className={`message-wrapper ${isSentByUser ? 'sent' : 'received'}`}>
                        <div className="message-bubble">
                          {isSentByUser && (
                              <button className="delete-message-btn" onClick={() => handleDeleteMessage(msg.id)} title="Mesajı Sil">×</button>
                          )}
                          <p>{msg.message}</p>
                          <span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mesajınızı yazın..."
                disabled={!currentUser || isLoading}
            />
            <button
                type="submit"
                disabled={!currentUser || !newMessage.trim() || isLoading}
            >
              Gönder
            </button>
          </form>
        </div>
      </div>
  );
}

export default ChatModal;