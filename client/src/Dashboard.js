

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { socket } from './socket';
import { jwtDecode } from 'jwt-decode';

// Component artık bildirim sayısını App.js'den 'notificationCount' adında bir prop olarak alıyor.
function Dashboard({ notificationCount }) {
  const navigate = useNavigate();

  // *** DÜZELTME: Dashboard açıldığında bildirimleri temizle ***
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && socket.connected) {
        try {
            const adminId = jwtDecode(token).id;
            // Dashboard açıldığında bildirimleri sıfırla
            socket.emit('admin_cleared_notifications', { adminId });
        } catch (error) {
            console.error("Token okunamadı:", error);
        }
    }
  }, []); // Sadece component mount olduğunda çalışır

  const handleLogout = () => {
    localStorage.removeItem('token');
    // Socket bağlantısı App.js tarafından yönetildiği için,
    // bu çıkış işlemi sonrası App.js bağlantıyı otomatik olarak kesecektir.
    navigate('/', { replace: true });
  };

  // *** DÜZELTME: Messages sayfasına giderken bildirimleri temizle ***
  const handleGoToMessages = () => {
    const token = localStorage.getItem('token');
    if (token && socket.connected) {
        try {
            const adminId = jwtDecode(token).id;
            socket.emit('admin_cleared_notifications', { adminId });
        } catch (error) {
            console.error("Token okunamadı:", error);
        }
    }
    navigate('/admin/messages');
  };

  return (
    <div className="dashboard-wrapper">
      <div className="car-animation-lane">
        <div className="car"></div>
        <div className="car"></div>
        <div className="car"></div>
        <div className="car"></div>
      </div>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <span>Yönetici Paneli</span>
          <button onClick={handleLogout} className="logout-button">
            Çıkış Yap
          </button>
        </header>
                
        <main className="dashboard-content">
          <div className="title-section">
            <h1>🚗 BayramlarAuto Yönetim Paneli</h1>
            <p>Hoş geldiniz! Ne yapmak istersiniz?</p>
          </div>
          <nav className="navigation-buttons">
            <button onClick={() => navigate('/admin/vehicles')}>Araç Yönetimi</button>
            <button onClick={() => navigate('/admin/personnel')}>Personel Yönetimi</button>
            <button onClick={() => navigate('/admin/kredi')}>Kredi Hesaplama</button>
            <button onClick={() => navigate('/admin/piyasa')}>Piyasa Değeri</button>
                        
            {/* *** DÜZELTME: Buton artık handleGoToMessages kullanıyor *** */}
            <button className="messages-button" onClick={handleGoToMessages}>
              Gelen Mesajlar
              {/* Bildirim sayısını doğrudan prop'tan okuyup gösteriyor. */}
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>
          </nav>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;