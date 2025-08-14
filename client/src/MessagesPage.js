import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AdminChatBox from './AdminChatBox';
import './MessagesPage.css';
import { useNavigate } from 'react-router-dom';
import { socket } from './socket';
import { jwtDecode } from 'jwt-decode';

function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      const response = await axios.get('http://localhost:5000/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setConversations(response.data);
      setError('');
    } catch (error) {
      console.error("Konuşmalar yüklenemedi:", error);
      const errorMessage = error.response?.data?.message || 'Konuşmalar yüklenirken bir hata oluştu.';
      setError(errorMessage);
      if (error.response?.status === 403 || error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Socket bağlantısını kur
    if (!socket.connected) {
      socket.connect();
    }
    
    fetchConversations();
    
    const handleRefresh = () => {
      console.log('🔄 Konuşmalar yenileniyor...');
      fetchConversations();
    };
    
    const handleConversationDeleted = (deletedConvId) => {
        if (selectedConversation?.conversation_id === deletedConvId) {
            setSelectedConversation(null);
        }
        fetchConversations();
    };
    
    const handleNewUnreadMessage = (data) => {
      console.log('📩 Yeni mesaj bildirimi alındı:', data);
      fetchConversations(); // Konuşma listesini yenile
    };

    // *** YENİ EKLEME: Conversation okundu durumu güncellendiğinde ***
    const handleConversationReadStatusUpdated = (data) => {
      console.log('👁️ Conversation okundu durumu güncellendi:', data);
      fetchConversations();
    };

    socket.on('admin_refresh_conversations', handleRefresh);
    socket.on('conversation_deleted', handleConversationDeleted);
    socket.on('admin_new_unread_message', handleNewUnreadMessage);
    socket.on('conversation_read_status_updated', handleConversationReadStatusUpdated);

    return () => {
      socket.off('admin_refresh_conversations', handleRefresh);
      socket.off('conversation_deleted', handleConversationDeleted);
      socket.off('admin_new_unread_message', handleNewUnreadMessage);
      socket.off('conversation_read_status_updated', handleConversationReadStatusUpdated);
    };
  }, [fetchConversations, selectedConversation]);

  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    if (window.confirm("Bu sohbeti ve içindeki tüm mesajları kalıcı olarak silmek istediğinizden emin misiniz?")) {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/conversations/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            alert(error.response?.data?.message || "Sohbet silinirken bir hata oluştu.");
        }
    }
  };

  const handleSelectConversation = (convo) => {
    setSelectedConversation(convo);
    
    // Bu konuşmaya ait bildirimleri temizle
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const adminId = jwtDecode(token).id;
            socket.emit('admin_cleared_notifications', { 
                adminId, 
                conversationId: convo.conversation_id 
            });
        } catch (error) {
            console.error("Token okunamadı veya geçersiz:", error);
        }
    }
  };

  const refreshConversations = () => {
    setIsLoading(true);
    fetchConversations();
  };

  if (isLoading) {
    return (
      <div className="messages-page-container">
        <div className="loading-container">
          <p>Konuşmalar yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  if (error && conversations.length === 0) {
    return (
      <div className="messages-page-container">
        <div className="error-container">
          <p>Hata: {error}</p>
          <button onClick={refreshConversations}>Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page-container">
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <button onClick={() => navigate('/dashboard')} className="back-to-dashboard-btn" title="Yönetim Paneline Dön">‹ Panele Dön</button>
          <h2>Gelen Kutusu</h2>
          <button onClick={refreshConversations} className="refresh-btn" title="Yenile">🔄</button>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations"><p>Henüz bir görüşme başlatılmamış.</p></div>
          ) : (
            conversations.map((convo) => {
              // *** YENİ EKLEME: Okunmamış mesaj var mı kontrol et ***
              const hasUnreadMessages = convo.unread_count > 0;
              
              return (
                <div 
                  key={convo.conversation_id} 
                  className={`conversation-item ${selectedConversation?.conversation_id === convo.conversation_id ? 'active' : ''} ${hasUnreadMessages ? 'unread' : ''}`}
                  onClick={() => handleSelectConversation(convo)}
                >
                  <div className="conversation-avatar">
                    {convo.user_name?.charAt(0).toUpperCase() || '?'}
                    {/* *** YENİ EKLEME: Okunmamış mesaj badge'i *** */}
                    {hasUnreadMessages && (
                      <span className="unread-badge">{convo.unread_count}</span>
                    )}
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <h4 className={hasUnreadMessages ? 'unread-name' : ''}>
                        {convo.user_name || 'Bilinmeyen Kullanıcı'}
                      </h4>
                      <span className="conversation-time">
                        {new Date(convo.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="vehicle-info">
                      <span className="vehicle-name">{convo.brand} {convo.model}</span>
                    </div>
                    <p className={`last-message ${hasUnreadMessages ? 'unread-message' : ''}`}>
                      {convo.message}
                      {/* *** YENİ EKLEME: Okunmamış mesaj ikonu *** */}
                      {hasUnreadMessages && <span className="unread-indicator"> ●</span>}
                    </p>
                  </div>
                 <button className="delete-conversation-btn" title="Sohbeti Sil" onClick={(e) => handleDeleteConversation(e, convo.conversation_id)}>🗑️</button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="chat-area">
        {selectedConversation ? (
          <AdminChatBox 
            key={selectedConversation.conversation_id} 
            conversationId={selectedConversation.conversation_id}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <h3>Hoş Geldiniz!</h3>
              <p>Mesajları görüntülemek için sol menüden bir konuşma seçin.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;