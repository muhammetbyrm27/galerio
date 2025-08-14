

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
    navigate('/');
  }, [navigate]);
  
  // ===> EKLEME 2: Bildirim sayısını çeken ve socket.io'yu dinleyen yeni bir useEffect eklendi.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!socket.connected) {
      socket.connect();
    }    // Sayfa yüklendiğinde ve yeni mesaj geldiğinde okunmamış sayısını çeken fonksiyon
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/user-notifications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUnreadCount(response.data.unreadCount);
        console.log('📊 Okunmamış mesaj sayısı güncellendi:', response.data.unreadCount);
      } catch (error) {
        console.error("Bildirim sayısı alınamadı:", error);
      }
    };

    fetchUnreadCount(); // Sayfa yüklendiğinde çek

    // Socket event'leri dinle
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

    // Cleanup
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
        navigate('/');
    }

    const fetchAllVehicles = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/vehicles');
        setVehicles(response.data);
      } catch (error) {
        console.error("Araçlar çekilirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllVehicles();
    
  }, [navigate, handleLogout]); 

  // ===> EKLEME 3: "Mesajlarım" butonuna tıklandığında sayacı sıfırlayacak yeni bir fonksiyon eklendi.
  const handleOpenConversations = () => {
    setIsConversationsModalOpen(true);
    // Modal açıldığında sayacı sıfırlayın (UserConversationsModal kendi temizliğini yapacak)
    setUnreadCount(0);
  };
  const openDetailsModal = async (vehicleId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`);
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
      const response = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`);
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

          {/* ===> EKLEME 4: Butonun onClick olayı güncellendi ve bildirim balonu eklendi. */}
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
                src={vehicle.photo_url ? `http://localhost:5000/${vehicle.photo_url}` : 'https://via.placeholder.com/400x300?text=Resim+Yok'} 
                alt={`${vehicle.brand} ${vehicle.model}`}
              />
            </div>
            <div className="card-content">
              <div>
                <h3 className="vehicle-title">{vehicle.brand} {vehicle.model}</h3>
                <p className="vehicle-specs">{vehicle.year} • {vehicle.mileage?.toLocaleString('tr-TR')} km • {vehicle.fuel}</p>
              </div>
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

// VehicleDetailModal bileşeni olduğu gibi kalabilir...
function VehicleDetailModal({ vehicle, closeModal, openChat }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev === vehicle.photos.length - 1 ? 0 : prev + 1));
  };
  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev === 0 ? vehicle.photos.length - 1 : prev - 1));
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeModal}>×</button>
        <div className="modal-body">
          <div className="modal-images-section">
            {vehicle.photos && vehicle.photos.length > 0 ? (
              <div className="image-gallery">
                <div className="main-image-container">
                  <img src={`http://localhost:5000/${vehicle.photos[currentImageIndex].photo_url}`} alt="Ana Araç" className="main-image" />
                  {vehicle.photos.length > 1 && (
                    <>
                      <button className="image-nav-btn prev" onClick={prevImage}>‹</button>
                      <button className="image-nav-btn next" onClick={nextImage}>›</button>
                    </>
                  )}
                </div>
                {vehicle.photos.length > 1 && (
                  <div className="thumbnail-container">
                    {vehicle.photos.map((photo, index) => (
                      <img key={photo.id} src={`http://localhost:5000/${photo.photo_url}`} alt={`Thumbnail ${index + 1}`}
                           className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                           onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }} />
                    ))}
                  </div>
                )}
              </div>
            ) : <p>Bu araç için fotoğraf bulunmamaktadır.</p>}
          </div>
          <div className="modal-info-section">
            <h2 className="vehicle-modal-title">{vehicle.brand} {vehicle.model}</h2>
            <div className="vehicle-details-grid">
              <div className="detail-item"><span className="detail-label">Yıl:</span><span className="detail-value">{vehicle.year}</span></div>
              <div className="detail-item"><span className="detail-label">Kilometre:</span><span className="detail-value">{vehicle.mileage?.toLocaleString('tr-TR')} km</span></div>
              <div className="detail-item"><span className="detail-label">Yakıt:</span><span className="detail-value">{vehicle.fuel}</span></div>
              <div className="detail-item"><span className="detail-label">Vites:</span><span className="detail-value">{vehicle.gear}</span></div>
            </div>
            <div className="price-section">
              <span className="price-label">Satış Fiyatı</span>
              <span className="price-value">{parseFloat(vehicle.sale_price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            {vehicle.description && (
              <div className="description-section">
                <h4>Açıklama</h4><p>{vehicle.description}</p>
              </div>
            )}
            <button className="message-action-button" onClick={openChat}>
              Satıcı ile Canlı Mesajlaşma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;