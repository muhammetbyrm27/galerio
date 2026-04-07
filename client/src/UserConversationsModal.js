import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from './config';
import { jwtDecode } from 'jwt-decode'; // EKLE
import { socket } from './socket'; // EKLE
import './UserConversationsModal.css'; // Bu CSS dosyasına da ekleme yapacağız

function UserConversationsModal({ closeModal, openChatForVehicle }) {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const decodedUser = jwtDecode(token);

            // Socket bağlantısını sağla
            if (!socket.connected) {
                socket.connect();
            }

            // Tüm bildirimleri temizle (conversationId olmadan)
            socket.emit('user_cleared_notifications', {
                userId: decodedUser.id
                // conversationId yok - tümü temizlenecek
            });

            console.log('📭 UserConversationsModal: Tüm bildirimler temizlendi');

        } catch (error) {
            console.error("Token decode hatası:", error);
        }
    }, []);
    const fetchUserConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                closeModal();
                return;
            }
            const response = await axios.get(`${API_URL}/api/user-conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConversations(response.data);
            setError('');
        } catch (err) {
            console.error("Kullanıcı konuşmaları alınamadı:", err);
            setError(err.response?.data?.message || 'Konuşmalar yüklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [closeModal]);

    useEffect(() => {
        fetchUserConversations();
    }, [fetchUserConversations]);

    const handleConversationClick = (vehicleId, conversationId) => {
        if (!vehicleId) {
            alert("Bu sohbete ait araç bilgisi bulunamadı.");
            return;
        }

        // *** YENİ EKLEME: Spesifik konuşma açılırken o konuşmanın bildirimlerini temizle ***
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                socket.emit('user_cleared_notifications', {
                    userId: decodedUser.id,
                    conversationId: conversationId
                });
            } catch (error) {
                console.error("Token decode hatası:", error);
            }
        }

        openChatForVehicle(vehicleId);
    };

    // ===> YENİ FONKSİYON: Sohbeti silmek için eklendi <===

    
    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content user-conversations-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header-user">
                    <h2>Gelen Kutusu</h2>
                    <button className="modal-close-btn" onClick={closeModal}>×</button>
                </header>
                <main className="modal-body-user">
                    {isLoading ? (
                        <p>Konuşmalar yükleniyor...</p>
                    ) : error ? (
                        <p className="error-text">{error}</p>
                    ) : conversations.length === 0 ? (
                        <div className="no-conversations-info">
                            <p>Henüz bir mesajlaşmanız yok.</p>
                            <span>İlan detay sayfalarından satıcıya mesaj gönderebilirsiniz.</span>
                        </div>
                    ) : (
                        <div className="conversations-list-container">
                            {conversations.map(convo => (
                                <div 
                                    key={convo.conversation_id} 
                                    className="conversation-summary-item" 
                                    // ===> GÜNCELLEME: Sil butonu dışındaki alana tıklanmasını sağlıyoruz
                                    onClick={() => handleConversationClick(convo.vehicle_id, convo.conversation_id)}
                                >
                                    <div className="conversation-text">
                                        <span className="convo-vehicle-title">{convo.brand} {convo.model}</span>
                                        <p className="convo-last-message">"{convo.message}"</p>
                                    </div>
                                    <div className="conversation-meta">
                                        <span className="convo-timestamp">
                                            {new Date(convo.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {convo.unread_count > 0 && (
                                            <span className="convo-unread-badge" title={`${convo.unread_count} yeni mesaj`}>
                                                {convo.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    {/* ===> YENİ BUTON: Silme butonu eklendi <=== */}

                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default UserConversationsModal;