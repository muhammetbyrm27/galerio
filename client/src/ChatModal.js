import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import API_URL from './config';
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
      const response = await axios.get(`${API_URL}/api/admin-user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('👨‍💼 Admin user:', response.data);
      setAdminUser(response.data);
    } catch (error) {
      console.error("Admin kullanıcı alınamadı, varsayılan ID=1 kullanılacak");
      setAdminUser({ id: 1 }); 
    } finally {
      setIsLoading(false);
    }
  };

  
  const conversationId = (currentUser && adminUser)
      ? `user_${currentUser.id}_vehicle_${vehicle.id}_admin_${adminUser.id}`
      : null;

  console.log('🆔 Generated conversation ID:', conversationId);

  useEffect(() => {
    
    if (isLoading || !currentUser || !conversationId || !adminUser) return;

    const token = localStorage.getItem('token');
    if (!token) {
      closeModal();
      return;
    }

    
    if (!socket.connected) {
      console.log('🔌 Socket bağlantısı kuruluyor...');
      socket.connect();
    }

    
    if (currentRoomRef.current && currentRoomRef.current !== conversationId) {
      console.log(`🚪 Eski room'dan ayrılıyor: ${currentRoomRef.current}`);
      socket.emit('leave_room', currentRoomRef.current);
    }

    
    console.log(`🏠 Yeni room'a katılıyor: ${conversationId}`);
    currentRoomRef.current = conversationId;

    
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
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('load_messages', handleLoadMessages);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_notifications_were_reset', handleNotificationsReset);
    };
  }, [currentUser, conversationId, adminUser, closeModal, isLoading]);

  
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

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Mesajı silmek istediğinizden emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Mesaj silinemedi:', error);
      alert(error.response?.data?.message || 'Mesaj silinemedi.');
    }
  };

  
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
                        {isSentByUser && (
                          <button className="delete-message-btn" onClick={() => handleDeleteMessage(msg.id)} title="Mesajı Sil">×</button>
                        )}
                        <div className="message-bubble">
                          <p>{msg.message}</p>
                          <span className="message-time">{new Date(msg.created_at.endsWith('Z') ? msg.created_at : msg.created_at + 'Z').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
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
