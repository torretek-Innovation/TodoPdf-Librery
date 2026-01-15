'use client';

import { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import Dashboard from './dashboard/Dashboard';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verificar si existe un token
    const token = localStorage.getItem('token');

    if (token) {
      // Opcional: Verificar si el token es válido con tu backend
      // fetch('/api/verify-token', { headers: { Authorization: `Bearer ${token}` }})
      //     .then(res => res.ok ? setIsAuthenticated(true) : handleInvalidToken())

      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, []);
  // Mostrar un loading mientras se verifica
  if (isLoading) {
    return <div>Cargando...</div>;
  }



  const handleLogin = (email: string, password: string) => {
    setUserName(email.split('@')[0]);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E8F0FF] via-[#B8D0FF] to-[#4F6FFF] flex items-center justify-center">
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  return <Dashboard userName={userName} />;
}