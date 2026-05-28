import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL, { getImageUrl } from './config';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './HomePage.css'; 
import ChatModal from './ChatModal';
import { socket } from './socket';
import { FaCalculator, FaChartLine, FaEnvelope, FaSignOutAlt } from 'react-icons/fa';
import UserConversationsModal from './UserConversationsModal';

function HomePage() {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState(null);
  const [selectedVehicleForChat, setSelectedVehicleForChat] = useState(null);
  const [userFullName, setUserFullName] = useState('');
  const [isConversationsModalOpen, setIsConversationsModalOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = useCallback(() => {
    socket.disconnect(); 
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  }, [navigate]);
  
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!socket.connected) {
      socket.connect();
    }    
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/user-notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUnreadCount(response.data.unreadCount);
        console.log('📊 Okunmamış mesaj sayısı güncellendi:', response.data.unreadCount);
      } catch (error) {
        console.error("Bildirim sayısı alınamadı:", error);
      }
    };

    fetchUnreadCount(); 

    
    const handleUpdateNotification = () => {
      console.log('🔔 Yeni bildirim geldi, sayı güncelleniyor...');
      fetchUnreadCount();
    };

    const handleNotificationsReset = () => {
      console.log('📭 Bildirimler temizlendi');
      setUnreadCount(0);
    };

    socket.on('update_notification_count', handleUpdateNotification);
    socket.on('user_notifications_were_reset', handleNotificationsReset);

    
    return () => {
      socket.off('update_notification_count', handleUpdateNotification);
      socket.off('user_notifications_were_reset', handleNotificationsReset);
    };
  }, []);


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decodedToken = jwtDecode(token);
            setUserFullName(decodedToken.name); 
        } catch (error) {
            console.error("Geçersiz token, çıkış yapılıyor.", error);
            handleLogout();
        }
    } else {
        navigate('/', { replace: true });
    }

    const fetchAllVehicles = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/vehicles`);
        setVehicles(response.data);
      } catch (error) {
        console.error("Araçlar çekilirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllVehicles();
    
  }, [navigate, handleLogout]); 

  
  const handleOpenConversations = () => {
    setIsConversationsModalOpen(true);
    
    setUnreadCount(0);
  };
  const openDetailsModal = async (vehicleId) => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/${vehicleId}`);
      setSelectedVehicleForDetails(response.data);
    } catch (error) {
      alert("Araç detayları yüklenirken bir hata oluştu.");
    }
  };
  const closeDetailsModal = () => setSelectedVehicleForDetails(null);

  const openChatModal = (vehicle) => {
    if (vehicle) {
        closeDetailsModal(); 
        setSelectedVehicleForChat(vehicle); 
    }
  };
  const closeChatModal = () => setSelectedVehicleForChat(null);

  const openChatFromConversations = async (vehicleId) => {
    setIsConversationsModalOpen(false);
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/${vehicleId}`);
      setSelectedVehicleForChat(response.data);
    } catch (error) {
      alert("Sohbet açılırken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };


  if (isLoading) return <div className="loading-container">İlanlar Yükleniyor...</div>;

  return (
    <div className="home-page-container">
      <header className="home-header">
        <div className="welcome-message">
          Merhaba <span>{userFullName}</span>, Bayramlar Auto İlanlarına Hoş Geldiniz.
        </div>
        <nav className="header-actions">
          <button className="action-button" onClick={() => navigate('/kredi-hesapla')}>
            <FaCalculator />
            <span>Kredi Hesapla</span>
          </button>
          
          <button className="action-button" onClick={() => navigate('/piyasa-degeri')}>
            <FaChartLine />
            <span>Piyasa Değeri</span>
          </button>

          {}
          <button className="action-button" onClick={handleOpenConversations}>
            <FaEnvelope />
            <span>Mesajlarım</span>
            {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <button className="action-button logout" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Çıkış Yap</span>
          </button>
        </nav>
      </header>
      
      <main className="vehicle-gallery">
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="vehicle-card-item" onClick={() => openDetailsModal(vehicle.id)}>
            <div className="card-image-container">
              <img 
                src={getImageUrl(vehicle.photo_url) || 'https://via.placeholder.com/400x300/1e293b/64748b?text=Resim+Yok'} 
                alt={`${vehicle.brand} ${vehicle.model}`}
              />
            </div>
            <div className="card-content">
              <h3 className="vehicle-title">{vehicle.brand} {vehicle.model}</h3>
              <p className="vehicle-specs">{vehicle.year} • {vehicle.mileage?.toLocaleString('tr-TR')} km • {vehicle.fuel} • {vehicle.gear}</p>
              <div className="price-tag">
                {parseFloat(vehicle.sale_price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        ))}
      </main>

      {selectedVehicleForDetails && (
        <VehicleDetailModal 
          vehicle={selectedVehicleForDetails} 
          closeModal={closeDetailsModal} 
          openChat={() => openChatModal(selectedVehicleForDetails)}
        />
      )}

      {selectedVehicleForChat && (
        <ChatModal 
          key={selectedVehicleForChat.id}
          vehicle={selectedVehicleForChat} 
          closeModal={closeChatModal} 
        />
      )}

      {isConversationsModalOpen && (
        <UserConversationsModal 
            closeModal={() => setIsConversationsModalOpen(false)}
            openChatForVehicle={openChatFromConversations}
        />
      )}
    </div>
  );
}

function VehicleDetailModal({ vehicle, closeModal, openChat }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const photos = vehicle.photos || [];
  const total = photos.length;

  const nextImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % total); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + total) % total); };

  const openLightbox = (idx) => { setLightboxIndex(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lbNext = (e) => { e.stopPropagation(); setLightboxIndex(prev => (prev + 1) % total); };
  const lbPrev = (e) => { e.stopPropagation(); setLightboxIndex(prev => (prev - 1 + total) % total); };

  
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev + 1) % total);
      if (e.key === 'ArrowLeft')  setLightboxIndex(prev => (prev - 1 + total) % total);
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, total]);

  return (
    <>
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={closeModal}>×</button>
          <div className="modal-body">
            <div className="modal-images-section">
              {total > 0 ? (
                <div className="image-gallery">
                  <div className="main-image-container" onClick={() => openLightbox(currentImageIndex)}>
                    <img src={getImageUrl(photos[currentImageIndex].photo_url)} alt="Ana Araç" className="main-image" />
                    {total > 1 && (
                      <>
                        <button className="image-nav-btn prev" onClick={prevImage}>‹</button>
                        <button className="image-nav-btn next" onClick={nextImage}>›</button>
                      </>
                    )}
                    <span className="zoom-hint">🔍 Büyütmek için tıkla</span>
                  </div>
                  {total > 1 && (
                    <div className="thumbnail-container">
                      {photos.map((photo, index) => (
                        <img key={photo.id} src={getImageUrl(photo.photo_url)} alt={`Küçük ${index + 1}`}
                             className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                             onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : <p style={{ color: '#64748b' }}>Bu araç için fotoğraf bulunmamaktadır.</p>}
            </div>

            <div className="modal-info-section">
              <h2 className="vehicle-modal-title">{vehicle.brand} {vehicle.model}</h2>
              <div className="vehicle-details-grid">
                <div className="detail-item"><span className="detail-label">Yıl</span><span className="detail-value">{vehicle.year}</span></div>
                <div className="detail-item"><span className="detail-label">Kilometre</span><span className="detail-value">{vehicle.mileage?.toLocaleString('tr-TR')} km</span></div>
                <div className="detail-item"><span className="detail-label">Yakıt</span><span className="detail-value">{vehicle.fuel}</span></div>
                <div className="detail-item"><span className="detail-label">Vites</span><span className="detail-value">{vehicle.gear}</span></div>
                {vehicle.color && <div className="detail-item"><span className="detail-label">Renk</span><span className="detail-value">{vehicle.color}</span></div>}
              </div>
              <div className="price-section">
                <span className="price-label">Satış Fiyatı</span>
                <span className="price-value">{parseFloat(vehicle.sale_price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              {vehicle.description && (
                <div className="description-section">
                  <h4>Açıklama</h4>
                  <p>{vehicle.description}</p>
                </div>
              )}
              <button className="message-action-button" onClick={openChat}>
                Satıcı ile Canlı Mesajlaşma
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && total > 0 && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={getImageUrl(photos[lightboxIndex].photo_url)} alt="Tam Ekran" className="lightbox-img" />
          </div>
          <button className="lightbox-close" onClick={closeLightbox}>×</button>
          {total > 1 && (
            <>
              <button className="lightbox-nav prev" onClick={lbPrev}>‹</button>
              <button className="lightbox-nav next" onClick={lbNext}>›</button>
            </>
          )}
          <div className="lightbox-counter">{lightboxIndex + 1} / {total}</div>
        </div>
      )}
    </>
  );
}

export default HomePage;
