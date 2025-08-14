// export default ForgotPasswordPage;
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ===> DEĞİŞİKLİK 1: ARTIK KENDİ ÖZEL CSS DOSYASINI KULLANIYOR <===
import './ForgotPasswordPage.css'; 

function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/request-password-reset', { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/verify-and-reset-password', {
        email, code, newPassword
      });
      setMessage(res.data.message);
      setError('');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // ===> DEĞİŞİKLİK 2: JSX YAPISI YENİ TASARIMA GÖRE DÜZENLENDİ <===
  return (
    <div className="forgot-password-container">
      <div className="forgot-password-form">
        
        {step === 1 && (
          <>
            <h2>Şifre Sıfırlama</h2>
            <p className="form-subtitle">Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin.</p>
            <input
              type="email"
              placeholder="Kayıtlı e-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="button" onClick={handleRequestCode} disabled={isLoading}>
              {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Yeni Şifre Belirle</h2>
            <p className="form-subtitle">{email} adresine gönderilen 6 haneli kodu ve yeni şifrenizi giriniz.</p>
            <input
              type="text"
              placeholder="Güvenlik Kodu"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Yeni Şifre"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="button" onClick={handleResetPassword} disabled={isLoading}>
              {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Başarılı!</h2>
            <p className="form-subtitle">{message}</p>
            <button type="button" onClick={() => navigate('/')}>Giriş Sayfasına Dön</button>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {/* Kullanıcıyı Giriş Sayfasına döndüren bir link eklemek her zaman iyidir. */}
        {step !== 3 && <button className="back-to-login-button" onClick={() => navigate('/')}>Giriş Yap'a Dön</button>}

      </div>
    </div>
  );
}

export default ForgotPasswordPage;