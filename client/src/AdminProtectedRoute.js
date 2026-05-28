import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AdminProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    
    if (!token) {
        return <Navigate to="/" replace />;
    }

    try {
        
        const decodedToken = jwtDecode(token);
        
        
        if (decodedToken.role !== 'admin') {
            return <Navigate to="/home" replace />; 
        }
    } catch (error) {
        
        console.error("Geçersiz token:", error);
        localStorage.removeItem('token'); 
        return <Navigate to="/" replace />;
    }

    
    return children;
};

export default AdminProtectedRoute;
