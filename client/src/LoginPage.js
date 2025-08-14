// BU KODUN TAMAMINI KOPYALAYIP MEVCUT LoginPage.js DOSYANIZLA DEĞİŞTİRİN

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const backgroundImages = [
  'https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/707046/pexels-photo-707046.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/3137073/pexels-photo-3137073.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
];

function LoginPage() {
  const [activeTab, setActiveTab] = useState('user');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [error, setError] = useState('');
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const clearErrors = () => setError('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email: adminEmail, password: adminPassword });
      const token = res.data.token;
      const decoded = jwtDecode(token);
      if (decoded.role !== 'admin') {
        setError('Bu alan sadece yöneticilere aittir.'); return;
      }
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş işlemi başarısız.');
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email: userEmail, password: userPassword });
      localStorage.setItem('token', res.data.token);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş işlemi başarısız.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('http://localhost:5000/api/register', { name: registerName, email: registerEmail, password: registerPassword });
      alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
      setActiveTab('user');
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız.');
    }
  };
  
  return (
    <div className="login-page-container">
      <header className="login-header">
        <div className="logo">BayramlarAuto</div>
        <nav className="main-nav">
          <a href="#destek">destek@bayramlarauto.com</a>
          <a href="#iletisim">İletişim: 0555 555 55 55</a>
        </nav>
      </header>

      <div className="visual-section">
        {backgroundImages.map((img, index) => (
          <div
            key={img}
            className="bg-image"
            style={{ backgroundImage: `url(${img})`, opacity: index === currentBgIndex ? 1 : 0 }}
          />
        ))}
        <div className="overlay"></div>
        <div className="brand-showcase">
          <h1>BayramlarAuto Galerisine Hoş Geldiniz</h1>
          <p>Kalite ve güvenin adresi. Hayalinizdeki araca bir adım daha yaklaşın.</p>
        </div>
      </div>

      <div className="form-section">
        <div className="login-wrapper glass-effect">
          <div className="role-tabs">
            <button className={`tab-button ${activeTab === 'user' ? 'active' : ''}`} onClick={() => { setActiveTab('user'); clearErrors(); }}>
              Kullanıcı Girişi
            </button>
            <button className={`tab-button ${activeTab === 'register' ? 'active' : ''}`} onClick={() => { setActiveTab('register'); clearErrors(); }}>
              Kayıt Ol
            </button>
            <button className={`tab-button admin-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => { setActiveTab('admin'); clearErrors(); }}>
              Yönetici
            </button>
          </div>

          <div className="form-content">
            {activeTab === 'admin' && (
              <form className="login-form animate-form" onSubmit={handleAdminLogin}>
                <h2>Yönetici Paneli</h2>
                <p className="form-subtitle">Lütfen yönetici bilgilerinizi giriniz.</p>
                <input type="email" placeholder="E-posta" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                <input type="password" placeholder="Şifre" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                <button type="submit">Giriş Yap</button>
                {error && <p className="error">{error}</p>}
              </form>
            )}

            {activeTab === 'user' && (
              <form className="login-form animate-form" onSubmit={handleUserLogin}>
                <h2>Tekrar Hoş Geldiniz</h2>
                <p className="form-subtitle">İlanlarımızı görmek için giriş yapın.</p>
                <input type="email" placeholder="E-posta" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                <input type="password" placeholder="Şifre" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required />
                <button type="submit">Giriş Yap</button>
                {error && <p className="error">{error}</p>}
                <div className="form-links">
                  <span onClick={() => navigate('/forgot-password')}>Şifremi Unuttum</span>
                </div>
              </form>
            )}

            {activeTab === 'register' && (
              <form className="login-form animate-form" onSubmit={handleRegister}>
                <h2>Aramıza Katılın</h2>
                <p className="form-subtitle">Fırsatlardan yararlanmak için hesap oluşturun.</p>
                <input type="text" placeholder="Ad Soyad" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required />
                <input type="email" placeholder="E-posta" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
                <input type="password" placeholder="Şifre (en az 6 karakter)" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
                <button type="submit">Hesap Oluştur</button>
                {error && <p className="error">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;