import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AdminProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    // 1. Token var mı? Yoksa login'e yolla.
    if (!token) {
        return <Navigate to="/" replace />;
    }

    try {
        // 2. Token'ın içini aç.
        const decodedToken = jwtDecode(token);
        
        // 3. Token'daki rol 'admin' mi? Değilse, kullanıcının ana sayfasına yolla.
        if (decodedToken.role !== 'admin') {
            return <Navigate to="/Dashboard" replace />; 
        }
    } catch (error) {
        // 4. Token bozuksa veya geçersizse, yine login'e yolla.
        console.error("Geçersiz token:", error);
        localStorage.removeItem('token'); // Bozuk token'ı temizle
        return <Navigate to="/" replace />;
    }

    // Tüm kontrollerden geçtiyse, admin sayfasını göster.
    return children;
};

export default AdminProtectedRoute;