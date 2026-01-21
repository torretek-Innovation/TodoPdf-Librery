'use client';

import { useState } from 'react';
import { FiX, FiMail, FiLock, FiUser } from 'react-icons/fi';
import { setToken, setUser } from '../lib/auth-utils';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (email: string, password: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                    isLogin
                        ? {
                            username: email,
                            password: password,
                        }
                        : {
                            username: name,
                            email: email,
                            password: password,
                        }
                ),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error en la autenticación');
                return;
            }

            // Guardar el token y usuario
            // Guardar el token y usuario usando la utilidad
            setToken(data.token, rememberMe);
            setUser(data.user, rememberMe);

            // Llamar a onLogin para actualizar el estado en el componente padre
            onLogin(data.user.username || email, password);

        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor');
        }
    };


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#E8F0FF] via-[#B8D0FF] to-[#4F6FFF] backdrop-blur-md animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Glow decorativo */}
            <div className="absolute w-[520px] h-[520px] bg-[#4F6FFF]/30 blur-[120px] rounded-full" />

            <div className="relative w-full max-w-md mx-4 transform transition-all hover:scale-[1.01] duration-500">
                <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_-20px_rgba(79,111,255,0.6)] overflow-hidden border border-white/60 relative z-10">

                    {/* Decorative Elements on Card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-[2.5rem] -z-10"></div>

                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] p-8 text-white">
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors text-white z-20"
                        >
                            <FiX size={20} />
                        </button>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_70%)]" />

                        <div className="mb-6">
                            <div className="inline-block bg-white p-3 rounded-2xl shadow-lg">
                                <img src="/logo/logo_with_letter.png" alt="TorreTek Logo" className="h-10 object-contain" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold leading-tight">
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </h2>
                        <p className="text-white/90 text-sm mt-2 max-w-xs">
                            {isLogin
                                ? 'Accede y gestiona tu biblioteca de PDFs'
                                : 'Organiza, guarda y controla tus documentos'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                    Nombre completo
                                </label>
                                <div className="relative group">
                                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl
                                               focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent
                                               transition-all outline-none"
                                        placeholder="Juan Pérez"
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                Correo electrónico
                            </label>
                            <div className="relative group">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl
                                           focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent
                                           transition-all outline-none"
                                    placeholder="correo@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl
                                           focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent
                                           transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 text-[#4F6FFF] border-gray-300 rounded focus:ring-[#4F6FFF]"
                                    />
                                    <span className="ml-2 text-gray-600">Recordarme</span>
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="relative w-full py-4 rounded-xl font-semibold text-white
                                   bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6]
                                   shadow-lg shadow-[#4F6FFF]/30
                                   hover:shadow-xl hover:shadow-[#4F6FFF]/40
                                   transition-all transform hover:-translate-y-[1px] active:scale-[0.98]"
                        >
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 pb-8 text-center">
                        <p className="text-sm text-gray-600">
                            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-1 text-[#4F6FFF] hover:text-[#3D5AE6] font-semibold transition-colors"
                            >
                                {isLogin ? 'Regístrate' : 'Inicia sesión'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );


}