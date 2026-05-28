import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL, { getImageUrl } from './config';
import { jwtDecode } from 'jwt-decode';
import { socket } from './socket';
import './UserConversationsModal.css';

function UserConversationsModal({ closeModal, openChatForVehicle }) {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const decodedUser = jwtDecode(token);

            
            if (!socket.connected) {
                socket.connect();
            }

            
            socket.emit('user_cleared_notifications', {
                userId: decodedUser.id
                
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

    const handleRemoveFromInbox = async (e, conversationId) => {
        e.stopPropagation();
        if (
            !window.confirm(
                'Bu sohbet yalnızca sizin gelen kutunuzdan kaldırılır. Karşı tarafın mesajları silinmez. Devam edilsin mi?'
            )
        ) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/user/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchUserConversations();
        } catch (err) {
            alert(err.response?.data?.message || 'Sohbet kaldırılamadı.');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/notifications/mark-all-read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const decodedUser = jwtDecode(token);
            socket.emit('user_cleared_notifications', { userId: decodedUser.id });
            fetchUserConversations();
        } catch (err) {
            alert(err.response?.data?.message || 'Bildirimler güncellenemedi.');
        }
    };

    const handleConversationClick = (vehicleId, conversationId) => {
        if (!vehicleId) {
            alert("Bu sohbete ait araç bilgisi bulunamadı.");
            return;
        }

        
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

    

    
    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content user-conversations-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header-user">
                    <h2>Gelen Kutusu</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {conversations.length > 0 && (
                            <button
                                type="button"
                                className="modal-close-btn"
                                title="Tümünü okundu işaretle"
                                onClick={handleMarkAllAsRead}
                            >
                                ✓
                            </button>
                        )}
                        <button className="modal-close-btn" onClick={closeModal}>×</button>
                    </div>
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
                            {conversations.map(convo => {
                                const ts = convo.created_at;
                                const date = new Date(ts && ts.endsWith('Z') ? ts : ts + 'Z');
                                const dateStr = date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                const price = convo.sale_price
                                    ? parseFloat(convo.sale_price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                    : null;
                                return (
                                <div
                                    key={convo.conversation_id}
                                    className={`conversation-summary-item${convo.unread_count > 0 ? ' unread' : ''}`}
                                    onClick={() => handleConversationClick(convo.vehicle_id, convo.conversation_id)}
                                >
                                    <div className="convo-photo-wrap">
                                        {convo.photo_url ? (
                                            <img src={getImageUrl(convo.photo_url)} alt={`${convo.brand} ${convo.model}`} className="convo-photo" />
                                        ) : (
                                            <div className="convo-photo-placeholder">🚗</div>
                                        )}
                                    </div>
                                    <div className="conversation-text">
                                        <span className="convo-vehicle-title">{convo.brand} {convo.model}</span>
                                        <span className="convo-vehicle-specs">
                                            {convo.year}{convo.mileage ? ` • ${Number(convo.mileage).toLocaleString('tr-TR')} km` : ''}{convo.fuel ? ` • ${convo.fuel}` : ''}{convo.gear ? ` • ${convo.gear}` : ''}
                                        </span>
                                        {price && <span className="convo-price">{price}</span>}
                                        <p className="convo-last-message">"{convo.message}"</p>
                                    </div>
                                    <div className="conversation-meta">
                                        <span className="convo-timestamp">{dateStr}</span>
                                        {convo.unread_count > 0 && (
                                            <span className="convo-unread-badge">{convo.unread_count}</span>
                                        )}
                                        <button
                                            type="button"
                                            className="delete-convo-btn"
                                            title="Gelen kutusundan kaldır"
                                            onClick={(e) => handleRemoveFromInbox(e, convo.conversation_id)}
                                        >🗑️</button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default UserConversationsModal;
