'use client';

import { useState, useEffect, useRef } from 'react';
import { FiX, FiUser, FiMonitor, FiBell, FiShield, FiSave, FiMoon, FiSun, FiSmartphone } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    onUpdateUser: (name: string) => void;
}

type Tab = 'account' | 'appearance' | 'notifications' | 'security';

export default function SettingsModal({ isOpen, onClose, userName, onUpdateUser }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [formData, setFormData] = useState({
        displayName: userName,
        email: '',
        theme: 'light',
        notifications: true,
        language: 'es',
        driveWatchUrl: ''
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            fetchUserProfile();
        }
    }, [isOpen]);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // Auto-fix for legacy users where username is an email and email is empty
                let displayUsername = data.username || userName;
                let displayEmail = data.email || '';

                if (!displayEmail && displayUsername && displayUsername.includes('@')) {
                    displayEmail = displayUsername;
                    displayUsername = displayUsername.split('@')[0];
                }

                setFormData({
                    displayName: displayUsername,
                    email: displayEmail,
                    theme: data.theme || 'light',
                    notifications: data.notifications ?? true,
                    language: data.language || 'es',
                    driveWatchUrl: data.driveWatchUrl || ''
                });
                if (data.avatarPath) {
                    setAvatarPreview(data.avatarPath);
                }

                // Apply theme immediately on load to sync
                applyTheme(data.theme || 'light');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const applyTheme = (theme: string) => {
        const root = window.document.documentElement;

        // Remove previous classes
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        localStorage.setItem('theme', theme);
    };

    if (!isOpen) return null;

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                showToast('El archivo es demasiado grande (Máx 1MB)', 'error');
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('token');

        try {
            // 1. Upload Avatar if changed
            if (avatarFile) {
                const formDataAvatar = new FormData();
                formDataAvatar.append('file', avatarFile);

                const resAvatar = await fetch('/api/user/avatar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formDataAvatar
                });

                if (!resAvatar.ok) throw new Error('Error al subir avatar');
            }

            // 2. Save Profile Settings
            if (activeTab !== 'security') {
                const resProfile = await fetch('/api/user/profile', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username: formData.displayName,
                        email: formData.email,
                        theme: formData.theme,
                        language: formData.language,
                        notifications: formData.notifications
                    })
                });

                if (!resProfile.ok) {
                    const error = await resProfile.json();
                    throw new Error(error.error || 'Error al guardar perfil');
                }

                const updatedUser = await resProfile.json();

                // Update local storage to reflect changes immediately
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    localStorage.setItem('user', JSON.stringify({
                        ...parsedUser,
                        username: formData.displayName,
                        email: formData.email
                    }));
                }

                // Apply theme immediately
                applyTheme(formData.theme);

                // Update parent state
                onUpdateUser(formData.displayName);

                showToast('Perfil actualizado correctamente', 'success');
            }

            // 3. Change Password
            if (activeTab === 'security') {
                if (!passwordForm.currentPassword && !passwordForm.newPassword) {
                    // Do nothing if empty
                } else {
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                        showToast('Las contraseñas nuevas no coinciden', 'error');
                        setIsLoading(false);
                        return;
                    }
                    if (!passwordForm.currentPassword) {
                        showToast('Ingresa tu contraseña actual', 'error');
                        setIsLoading(false);
                        return;
                    }

                    const resPass = await fetch('/api/user/password', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            currentPassword: passwordForm.currentPassword,
                            newPassword: passwordForm.newPassword
                        })
                    });

                    const dataPass = await resPass.json();
                    if (!resPass.ok) throw new Error(dataPass.error || 'Error al cambiar contraseña');

                    showToast('Contraseña actualizada correctamente', 'success');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }
            }

            onClose();

        } catch (error: any) {
            console.error('Save error:', error);
            showToast(error.message || 'Error al guardar cambios', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'account', label: 'Mi Cuenta', icon: FiUser },
        { id: 'appearance', label: 'Apariencia', icon: FiMonitor },
        { id: 'notifications', label: 'Notificaciones', icon: FiBell },
        { id: 'security', label: 'Seguridad', icon: FiShield },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden">

                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        Configuración
                    </h2>
                    <nav className="space-y-2 flex-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === tab.id
                                    ? 'bg-white text-purple-600 shadow-sm border border-gray-100'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        >
                            <FiX size={24} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'account' && (
                            <div className="space-y-8 max-w-lg">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden relative">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            formData.displayName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/jpg"
                                        />
                                        <button
                                            onClick={handleAvatarClick}
                                            className="text-sm text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-black transition-colors"
                                        >
                                            Cambiar Avatar
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Recomendado: JPG, PNG. Máx 1MB.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                                        <input
                                            type="text"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">El email se usa para notificaciones y recuperación.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Tema de la interfaz</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { id: 'light', label: 'Claro', icon: FiSun },
                                            { id: 'dark', label: 'Oscuro', icon: FiMoon },
                                            { id: 'system', label: 'Sistema', icon: FiSmartphone },
                                        ].map(theme => (
                                            <button
                                                key={theme.id}
                                                onClick={() => setFormData({ ...formData, theme: theme.id })}
                                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${formData.theme === theme.id
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                    }`}
                                            >
                                                <theme.icon size={24} />
                                                <span className="text-sm font-medium">{theme.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-100">
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Idioma</h4>
                                    <select
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                        className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    >
                                        <option value="es">Español (España)</option>
                                        <option value="en">English (US)</option>
                                        <option value="fr">Français</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Notificaciones de Escritorio</h4>
                                        <p className="text-sm text-gray-500">Recibe alertas cuando se completen importaciones.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifications}
                                            onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                {/* More notification options could go here */}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6 max-w-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Cambiar Contraseña</h4>
                                    <div className="space-y-4">
                                        <input
                                            type="password"
                                            placeholder="Contraseña actual"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirmar nueva contraseña"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Guardando...' : (
                                <>
                                    <FiSave /> Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
