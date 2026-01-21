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
  const [userImage, setUserImage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verificar si existe un token
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token) {
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Prioritize username, then try to fallback to name or email
          const displayName = user.username || user.name || user.email?.split('@')[0] || 'Usuario';
          setUserName(displayName);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // Fetch fresh profile data
      fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load profile');
        })
        .then(data => {
          if (data.username) setUserName(data.username);
          // Use the avatar path from API if available
          if (data.avatarPath) {
            setUserImage(data.avatarPath);
          } else {
            // Fallback to default
            setUserImage('/uploads/avatars/user.png');
          }
        })
        .catch(err => {
          console.error('Profile fetch error:', err);
          setUserImage('/uploads/avatars/user.png');
        });

      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, []);

  // Mostrar un loading mientras se verifica
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const handleLogin = (email: string, password: string) => {
    setUserName(email.split('@')[0]);
    // Set default on login
    setUserImage('/uploads/avatars/user.png');
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

  return <Dashboard userName={userName} onUpdateUser={setUserName} userImage={userImage} onUpdateUserImage={setUserImage} />;
}