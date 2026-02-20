'use client';


import { useState, useEffect, useRef } from 'react';
import { FiX, FiUser, FiMonitor, FiBell, FiShield, FiSave, FiMoon, FiSun, FiSmartphone } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';
import { getToken, getUser, updateUser } from '../lib/auth-utils';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    onUpdateUser: (name: string) => void;
    onUpdateUserImage: (url: string) => void;
}

type Tab = 'account' | 'appearance' | 'notifications' | 'security';

export default function SettingsModal({ isOpen, onClose, userName, onUpdateUser, onUpdateUserImage }: SettingsModalProps) {

    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track initial theme to revert if user cancels
    const [initialTheme, setInitialTheme] = useState<string | null>(null);

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
            const token = getToken();
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
                    setAvatarPreview(`${data.avatarPath}?t=${new Date().getTime()}`);
                }

                // Set initial theme for revert reference
                if (initialTheme === null) {
                    setInitialTheme(data.theme || 'light');
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

        // Note: We do NOT define localStorage here for preview purposes. 
        // We only save to localStorage on 'handleSave'. 
        // But for consistency across reloads if the user refreshes, handleSave handles that.
    };

    // System theme listener
    useEffect(() => {
        if (formData.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                applyTheme('system');
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [formData.theme]);

    const handleClose = () => {
        // Revert theme if cancelled and we have an initial theme
        if (initialTheme && initialTheme !== formData.theme) {
            applyTheme(initialTheme);
        }
        onClose();
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
        const token = getToken();

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

                // Get the uploaded avatar path if the backend returns it, or use the object URL / temp assumption
                // The backend likely returns { filepath: '/uploads/...' }
                const dataAvatar = await resAvatar.json();
                if (dataAvatar.filepath) {
                    onUpdateUserImage(`${dataAvatar.filepath}?t=${new Date().getTime()}`);
                } else if (avatarPreview) {
                    // Fallback if backend doesn't return path immediately but it succeeded
                    onUpdateUserImage(avatarPreview);
                }
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
                const storedUser = getUser();
                if (storedUser) {
                    updateUser({
                        ...storedUser,
                        username: formData.displayName,
                        email: formData.email
                    });
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

            // Commit settings (reset initial theme so we don't revert on close)
            setInitialTheme(formData.theme);
            localStorage.setItem('theme', formData.theme);

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
            <div className="bg-white dark:bg-[#1A1D2E] rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden border dark:border-white/10">

                {/* Sidebar */}
                <div className="w-64 bg-gray-50 dark:bg-[#11131E] border-r border-gray-200 dark:border-white/10 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        Configuración
                    </h2>
                    <nav className="space-y-2 flex-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === tab.id
                                    ? 'bg-white dark:bg-[#1A1D2E] text-purple-600 dark:text-purple-400 shadow-sm border border-gray-100 dark:border-white/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
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
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de Usuario</label>
                                        <input
                                            type="text"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#11131E] text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0a0c14] text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none transition-all"
                                        />
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
                                                onClick={() => {
                                                    setFormData({ ...formData, theme: theme.id });
                                                    applyTheme(theme.id);
                                                }}
                                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${formData.theme === theme.id
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                <theme.icon size={24} />
                                                <span className="text-sm font-medium">{theme.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#11131E] rounded-xl border border-gray-100 dark:border-white/10">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">Notificaciones de Escritorio</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Recibe alertas cuando se completen importaciones.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifications}
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                setFormData({ ...formData, notifications: checked });

                                                if (checked) {
                                                    if (!('Notification' in window)) {
                                                        showToast('Tu navegador no soporta notificaciones', 'error');
                                                        return;
                                                    }
                                                    if (Notification.permission !== 'granted') {
                                                        const permission = await Notification.requestPermission();
                                                        if (permission !== 'granted') {
                                                            showToast('Permiso de notificaciones denegado', 'error');
                                                            setFormData(prev => ({ ...prev, notifications: false }));
                                                        } else {
                                                            new Notification('¡Notificaciones activadas!', {
                                                                body: 'Ahora recibirás alertas importantes aquí.',
                                                                icon: '/icon-192x192.png' // Adjust based on public assets if available
                                                            });
                                                        }
                                                    }
                                                }
                                            }}
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
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Cambiar Contraseña</h4>
                                    <div className="space-y-4">
                                        <input
                                            type="password"
                                            placeholder="Contraseña actual"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white dark:bg-[#11131E] text-gray-800 dark:text-white"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white dark:bg-[#11131E] text-gray-800 dark:text-white"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirmar nueva contraseña"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white dark:bg-[#11131E] text-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#11131E] flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-6 py-2.5 bg-white dark:bg-[#1A1D2E] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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
