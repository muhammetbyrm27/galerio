import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import './AdminChatBox.css';
import { socket } from './socket';

function AdminChatBox({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const currentRoomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        console.log('👨‍💼 Admin user decoded:', decodedUser);
        setAdminUser(decodedUser);
        setIsLoading(false);
      } catch (error) {
        console.error("Admin token decode error:", error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !adminUser || isLoading) return;

    console.log('🔄 AdminChatBox: Yeni conversation ID:', conversationId);

    const token = localStorage.getItem('token');
    if (!token) return;

    // *** GÜVENLİK KONTROLÜ: Admin sadece kendi conversation'larına erişebilir ***
    if (!conversationId.includes(`_admin_${adminUser.id}`)) {
      console.error(`🚨 GÜVENLİK İHLALİ: Admin ${adminUser.id} başkasının conversation'ına erişmeye çalıştı: ${conversationId}`);
      return;
    }

    // Socket bağlantısını sağla
    if (!socket.connected) {
      console.log('🔌 AdminChatBox: Socket bağlantısı kuruluyor...');
      socket.connect();
    }

    // Önceki room'dan ayrıl
    if (currentRoomRef.current && currentRoomRef.current !== conversationId) {
      console.log(`🚪 AdminChatBox: Eski room'dan ayrılıyor: ${currentRoomRef.current}`);
      socket.emit('leave_room', currentRoomRef.current);
    }

    // Yeni room'a katıl
    console.log(`🏠 AdminChatBox: Yeni room'a katılıyor: ${conversationId}`);
    currentRoomRef.current = conversationId;

    // Mesajları temizle (yeni konuşma için)
    setMessages([]);


    const onConnect = () => {
      console.log('🔗 AdminChatBox: Socket bağlandı, room\'a katılıyor:', conversationId);
      socket.emit('join_room', { conversationId, token });
    };

    const handleLoadMessages = (loadedMessages) => {
      console.log(`📨 AdminChatBox: ${loadedMessages.length} mesaj yüklendi for:`, conversationId);
      setMessages(loadedMessages);
    };

    const handleReceiveMessage = (message) => {
      console.log('📩 AdminChatBox: Mesaj alındı:', message);
      console.log('🔍 Mesaj conversation_id:', message.conversation_id);
      console.log('🔍 Mevcut conversation_id:', conversationId);

      // *** SIKI GÜVENLİK KONTROLÜ: Tam eşleşme kontrolü ***
      if (message.conversation_id === conversationId) {
        console.log('✅ AdminChatBox: Mesaj bu conversation\'a ait, ekleniyor');
        setMessages(prev => [...prev, message]);
      } else {
        console.log('❌ AdminChatBox: Mesaj farklı conversation\'a ait, ENGELLENDI');
        console.log('❌ Beklenen:', conversationId);
        console.log('❌ Gelen:', message.conversation_id);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      console.log('🗑️ AdminChatBox: Mesaj silindi:', messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleConversationDeleted = (deletedConvId) => {
      if (conversationId === deletedConvId) {
        console.log('🗑️ AdminChatBox: Conversation silindi:', deletedConvId);
        setMessages([]);
      }
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
    socket.on('conversation_deleted', handleConversationDeleted);

    // *** YENİ EKLEME: Bu conversation'a ait bildirimleri temizle ***
    socket.emit('admin_cleared_notifications', {
      adminId: adminUser.id,
      conversationId: conversationId
    });

    // Cleanup function
    return () => {
      socket.off('connect', onConnect);
      socket.off('load_messages', handleLoadMessages);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversation_deleted', handleConversationDeleted);
    };
  }, [conversationId, adminUser, isLoading]);

  // Component unmount olduğunda room'dan ayrıl
  useEffect(() => {
    return () => {
      if (currentRoomRef.current) {
        console.log(`🚪 AdminChatBox: Component unmount, room'dan ayrılıyor: ${currentRoomRef.current}`);
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
    if (trimmedMessage === '' || !adminUser || !conversationId) return;

    // *** DÜZELTME: Conversation ID'den user ID ve vehicle ID'yi çıkar - YENİ FORMAT ***
    const userIdMatch = conversationId.match(/user_(\d+)_/);
    const vehicleIdMatch = conversationId.match(/vehicle_(\d+)_/);

    if (!userIdMatch) {
      console.error("AdminChatBox: Sohbet kimliğinden kullanıcı ID'si alınamadı:", conversationId);
      return;
    }

    const receiver_id = parseInt(userIdMatch[1]);
    const vehicle_id = vehicleIdMatch ? parseInt(vehicleIdMatch[1]) : null;

    console.log('📤 AdminChatBox: Mesaj gönderiliyor:', {
      conversation_id: conversationId,
      sender_id: adminUser.id,
      receiver_id: receiver_id,
      vehicle_id: vehicle_id,
      message: trimmedMessage
    });

    socket.emit('send_message', {
      conversation_id: conversationId,
      sender_id: adminUser.id,
      receiver_id: receiver_id,
      vehicle_id: vehicle_id,
      message: trimmedMessage,
    });
    setNewMessage('');
  };

// Mesaj render kısmında (AdminChatBox.js'de messages.map içinde):
  messages.map((msg) => {
    const isAdminMessage = parseInt(msg.sender_id) === adminUser?.id;
    return (
        <div key={msg.id} className={`message-container ${isAdminMessage ? 'admin-message' : 'user-message'}`}>
          <div className={`message-bubble ${isAdminMessage ? 'admin-bubble' : 'user-bubble'}`}>

            <p>{msg.message}</p>
            <span className="message-time">{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
    );
  })

  // Yükleme durumu
  if (isLoading) {
    return (
        <div className="admin-chat-box">
          <div className="chat-messages-admin">
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              Yükleniyor...
            </div>
          </div>
        </div>
    );
  }

  if (!conversationId) {
    return <div className="admin-chat-box-empty"><p>Görüntülemek için bir konuşma seçin.</p></div>;
  }

  return (
      <div className="admin-chat-box">
        <div className="chat-messages-admin">
          {messages.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                Bu sohbette henüz mesaj yok.
              </div>
          ) : (
              messages.map((msg) => {
                const isAdminMessage = parseInt(msg.sender_id) === adminUser?.id;
                return (
                    <div key={msg.id} className={`message-container ${isAdminMessage ? 'admin-message' : 'user-message'}`}>
                      <div className={`message-bubble ${isAdminMessage ? 'admin-bubble' : 'user-bubble'}`}>

                        <p>{msg.message}</p>
                        <span className="message-time">{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                );
              })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form-admin" onSubmit={handleSendMessage}>
          <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Cevabınızı yazın..."
              disabled={isLoading || !adminUser}
          />
          <button
              type="submit"
              disabled={!newMessage.trim() || isLoading || !adminUser}
          >
            ➢
          </button>
        </form>
      </div>
  );
}

export default AdminChatBox;