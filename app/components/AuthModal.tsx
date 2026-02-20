'use client';

import { useState } from 'react';
import { FiX, FiMail, FiLock, FiUser, FiShield, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { setToken, setUser } from '../lib/auth-utils';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (email: string, password: string) => void;
}

// Preguntas de seguridad predefinidas
const SECURITY_QUESTIONS = [
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu primera mascota?',
    '¿Cuál es el nombre de tu mejor amigo de la infancia?',
    '¿Cuál es tu comida favorita?',
    '¿Cuántos hermanos tienes?',
    '¿Cuál es el nombre de tu escuela primaria?',
    '¿Cuál fue tu primer trabajo?',
    '¿Cuál es tu película favorita?',
    '¿Cuál es el segundo nombre de tu madre?',
    '¿Cuál es tu color favorito?',
];

type ModalView = 'login' | 'register-step1' | 'register-step2' | 'recover-step1' | 'recover-step2' | 'recover-step3' | 'recover-success';

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
    const [view, setView] = useState<ModalView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Registro - paso 2 (pregunta de seguridad)
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    // Recuperación
    const [recoverUsername, setRecoverUsername] = useState('');
    const [recoverQuestion, setRecoverQuestion] = useState('');
    const [recoverAnswer, setRecoverAnswer] = useState('');
    const [recoverUserId, setRecoverUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setSelectedQuestion('');
        setSecurityAnswer('');
        setRecoverUsername('');
        setRecoverQuestion('');
        setRecoverAnswer('');
        setRecoverUserId(null);
        setNewPassword('');
        setConfirmPassword('');
        setErrorMsg('');
        setIsLoading(false);
    };

    const switchView = (newView: ModalView) => {
        resetForm();
        setView(newView);
    };

    // === HANDLER: Login ===
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'Error en la autenticación');
                setIsLoading(false);
                return;
            }

            setToken(data.token, rememberMe);
            setUser(data.user, rememberMe);
            onLogin(data.user.username || email, password);
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // === HANDLER: Register Step 1 → Step 2 ===
    const handleRegisterStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!name || !email || !password) {
            setErrorMsg('Todos los campos son requeridos');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setView('register-step2');
    };

    // === HANDLER: Register Step 2 (submit final) ===
    const handleRegisterStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!selectedQuestion) {
            setErrorMsg('Selecciona una pregunta de seguridad');
            return;
        }
        if (!securityAnswer.trim()) {
            setErrorMsg('Escribe tu respuesta');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: name,
                    email,
                    password,
                    securityQuestion: selectedQuestion,
                    securityAnswer: securityAnswer,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'Error al crear la cuenta');
                setIsLoading(false);
                return;
            }

            setToken(data.token, true);
            setUser(data.user, true);
            onLogin(data.user.username || email, password);
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // === HANDLER: Recovery Step 1 - Buscar usuario ===
    const handleRecoverStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!recoverUsername.trim()) {
            setErrorMsg('Ingresa tu nombre de usuario o correo');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'find-user',
                    username: recoverUsername,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'Error al buscar la cuenta');
                setIsLoading(false);
                return;
            }

            setRecoverUserId(data.userId);
            setRecoverQuestion(data.question);
            setView('recover-step2');
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // === HANDLER: Recovery Step 2 - Verificar respuesta ===
    const handleRecoverStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!recoverAnswer.trim()) {
            setErrorMsg('Escribe tu respuesta');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'verify-answer',
                    userId: recoverUserId,
                    answer: recoverAnswer,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'Respuesta incorrecta');
                setIsLoading(false);
                return;
            }

            setView('recover-step3');
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // === HANDLER: Recovery Step 3 - Cambiar contraseña ===
    const handleRecoverStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!newPassword || !confirmPassword) {
            setErrorMsg('Completa ambos campos');
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: recoverUserId,
                    newPassword,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.error || 'Error al cambiar la contraseña');
                setIsLoading(false);
                return;
            }

            setView('recover-success');
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    // === Título y subtítulo dinámico ===
    const getHeaderInfo = () => {
        switch (view) {
            case 'login':
                return { title: 'Iniciar Sesión', subtitle: 'Accede y gestiona tu biblioteca de PDFs' };
            case 'register-step1':
                return { title: 'Crear Cuenta', subtitle: 'Organiza, guarda y controla tus documentos' };
            case 'register-step2':
                return { title: 'Pregunta de Seguridad', subtitle: 'Necesaria para recuperar tu cuenta si olvidas la contraseña' };
            case 'recover-step1':
                return { title: 'Recuperar Cuenta', subtitle: 'Ingresa tu usuario o correo para comenzar' };
            case 'recover-step2':
                return { title: 'Pregunta de Seguridad', subtitle: 'Responde correctamente para verificar tu identidad' };
            case 'recover-step3':
                return { title: 'Nueva Contraseña', subtitle: 'Establece tu nueva contraseña' };
            case 'recover-success':
                return { title: '¡Listo!', subtitle: 'Tu contraseña ha sido actualizada' };
            default:
                return { title: '', subtitle: '' };
        }
    };

    const { title, subtitle } = getHeaderInfo();

    // === Indicador de pasos para registro ===
    const renderStepIndicator = (currentStep: number, totalSteps: number) => (
        <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i < currentStep ? 'w-8 bg-white' : i === currentStep ? 'w-8 bg-white/80' : 'w-2 bg-white/30'
                        }`}
                />
            ))}
        </div>
    );

    // === Error toast ===
    const renderError = () => errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-shake">
            <FiAlertCircle className="flex-shrink-0" size={18} />
            <span>{errorMsg}</span>
        </div>
    );

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
                        {/* Botón Atrás (para vistas que no son login/register-step1) */}
                        {(view === 'register-step2' || view.startsWith('recover')) && view !== 'recover-success' && (
                            <button
                                onClick={() => {
                                    setErrorMsg('');
                                    if (view === 'register-step2') setView('register-step1');
                                    else if (view === 'recover-step2') setView('recover-step1');
                                    else if (view === 'recover-step3') setView('recover-step2');
                                    else switchView('login');
                                }}
                                className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors text-white z-20"
                            >
                                <FiArrowLeft size={20} />
                            </button>
                        )}

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

                        {/* Step indicator para registro */}
                        {(view === 'register-step1' || view === 'register-step2') &&
                            renderStepIndicator(view === 'register-step1' ? 0 : 1, 2)
                        }

                        <h2 className="text-3xl font-bold leading-tight">{title}</h2>
                        <p className="text-white/90 text-sm mt-2 max-w-xs">{subtitle}</p>
                    </div>

                    {/* ========== FORMULARIOS ========== */}
                    <div className="p-8 space-y-6">

                        {renderError()}

                        {/* === LOGIN === */}
                        {view === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Correo o usuario</label>
                                    <div className="relative group">
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="correo@ejemplo.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Contraseña</label>
                                    <div className="relative group">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

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
                                    <button
                                        type="button"
                                        onClick={() => switchView('recover-step1')}
                                        className="text-[#4F6FFF] hover:text-[#3D5AE6] font-semibold transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Ingresando...
                                        </span>
                                    ) : 'Iniciar Sesión'}
                                </button>
                            </form>
                        )}

                        {/* === REGISTER STEP 1 === */}
                        {view === 'register-step1' && (
                            <form onSubmit={handleRegisterStep1} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Nombre completo</label>
                                    <div className="relative group">
                                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Juan Pérez"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Correo electrónico</label>
                                    <div className="relative group">
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="correo@ejemplo.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Contraseña</label>
                                    <div className="relative group">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98]"
                                >
                                    Siguiente
                                </button>
                            </form>
                        )}

                        {/* === REGISTER STEP 2 (Pregunta de seguridad) === */}
                        {view === 'register-step2' && (
                            <form onSubmit={handleRegisterStep2} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">
                                        <FiShield className="inline mr-1 mb-0.5" />
                                        Selecciona una pregunta
                                    </label>
                                    <select
                                        value={selectedQuestion}
                                        onChange={(e) => setSelectedQuestion(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none text-gray-700 appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Elige una pregunta --</option>
                                        {SECURITY_QUESTIONS.map((q, i) => (
                                            <option key={i} value={q}>{q}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Tu respuesta</label>
                                    <div className="relative group">
                                        <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="text"
                                            value={securityAnswer}
                                            onChange={(e) => setSecurityAnswer(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Escribe tu respuesta..."
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 pl-1">
                                        💡 Recuerda esta respuesta. La necesitarás si olvidas tu contraseña.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Creando cuenta...
                                        </span>
                                    ) : 'Crear Cuenta'}
                                </button>
                            </form>
                        )}

                        {/* === RECOVER STEP 1 (Buscar usuario) === */}
                        {view === 'recover-step1' && (
                            <form onSubmit={handleRecoverStep1} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Usuario o correo</label>
                                    <div className="relative group">
                                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="text"
                                            value={recoverUsername}
                                            onChange={(e) => setRecoverUsername(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Tu usuario o correo electrónico"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Buscando...
                                        </span>
                                    ) : 'Buscar mi cuenta'}
                                </button>
                            </form>
                        )}

                        {/* === RECOVER STEP 2 (Responder pregunta) === */}
                        {view === 'recover-step2' && (
                            <form onSubmit={handleRecoverStep2} className="space-y-5">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-blue-800 mb-1">Tu pregunta de seguridad:</p>
                                    <p className="text-blue-700 font-medium">{recoverQuestion}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Tu respuesta</label>
                                    <div className="relative group">
                                        <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="text"
                                            value={recoverAnswer}
                                            onChange={(e) => setRecoverAnswer(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Escribe tu respuesta..."
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Verificando...
                                        </span>
                                    ) : 'Verificar respuesta'}
                                </button>
                            </form>
                        )}

                        {/* === RECOVER STEP 3 (Nueva contraseña) === */}
                        {view === 'recover-step3' && (
                            <form onSubmit={handleRecoverStep3} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Nueva contraseña</label>
                                    <div className="relative group">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 pl-1">Confirmar contraseña</label>
                                    <div className="relative group">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF]" size={20} />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/50 focus:border-transparent transition-all outline-none"
                                            placeholder="Repite la contraseña"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            Guardando...
                                        </span>
                                    ) : 'Cambiar Contraseña'}
                                </button>
                            </form>
                        )}

                        {/* === RECOVER SUCCESS === */}
                        {view === 'recover-success' && (
                            <div className="text-center space-y-5">
                                <div className="flex justify-center">
                                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                        <FiCheckCircle className="text-green-500" size={40} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-gray-700 font-medium text-lg">Contraseña actualizada</p>
                                    <p className="text-gray-500 text-sm mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                                </div>
                                <button
                                    onClick={() => switchView('login')}
                                    className="relative w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] shadow-lg shadow-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/40 transition-all transform hover:-translate-y-[1px] active:scale-[0.98]"
                                >
                                    Ir a Iniciar Sesión
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {(view === 'login' || view === 'register-step1') && (
                        <div className="px-8 pb-8 text-center">
                            <p className="text-sm text-gray-600">
                                {view === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                                <button
                                    onClick={() => switchView(view === 'login' ? 'register-step1' : 'login')}
                                    className="ml-1 text-[#4F6FFF] hover:text-[#3D5AE6] font-semibold transition-colors"
                                >
                                    {view === 'login' ? 'Regístrate' : 'Inicia sesión'}
                                </button>
                            </p>
                        </div>
                    )}

                    {/* Footer para recovery */}
                    {view === 'recover-step1' && (
                        <div className="px-8 pb-8 text-center">
                            <p className="text-sm text-gray-600">
                                ¿Recordaste tu contraseña?
                                <button
                                    onClick={() => switchView('login')}
                                    className="ml-1 text-[#4F6FFF] hover:text-[#3D5AE6] font-semibold transition-colors"
                                >
                                    Inicia sesión
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}