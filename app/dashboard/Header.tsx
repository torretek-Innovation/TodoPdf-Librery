'use client';

import { useRef, useState, useEffect } from 'react';
import { CiSettings } from 'react-icons/ci';
import { FiSearch, FiBell, FiUser, FiLogOut, FiUpload, FiFolder, FiCheckCircle, FiAlertTriangle, FiLoader, FiX, FiFileText, FiHome, FiStar, FiGrid, FiCompass, FiTrash2 } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationsDropdown, { Notification } from './NotificationsDropdown';
import { useToast } from '../providers/ToastProvider';
import { getToken, removeToken } from '../lib/auth-utils';

interface HeaderProps {
    userName: string;
    userImage?: string;
    onPdfUploaded?: (pdf: any) => void;
    onNavigate: (tab: string) => void;
    onOpenSettings: () => void;
}

export default function Header({ userName, userImage, onPdfUploaded, onNavigate, onOpenSettings }: HeaderProps) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { showToast, notifications, markAsRead, clearNotifications, unreadCount } = useToast();

    useEffect(() => {
        setImageError(false);
    }, [userImage]);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // System Modules Definition
    const systemModules = [
        { id: 'home', title: 'Inicio / Home', keywords: ['home', 'inicio', 'casa', 'principal'], icon: FiHome, tab: 'home' },
        { id: 'favorites', title: 'Favoritos', keywords: ['favoritos', 'destacados', 'estrellas', 'likes'], icon: FiStar, tab: 'favorites' },
        { id: 'folders', title: 'Carpetas', keywords: ['carpetas', 'directorios', 'archivos', 'organizar'], icon: FiFolder, tab: 'folders' },
        { id: 'explore', title: 'Explorar / Librería', keywords: ['explorar', 'libreria', 'buscar', 'web'], icon: FiCompass, tab: 'explore' },
        { id: 'pdfs', title: 'Todos los PDFs', keywords: ['pdfs', 'todos', 'lista', 'documentos'], icon: FiGrid, tab: 'pdfs' },
        { id: 'trash', title: 'Papelera / Basura', keywords: ['papelera', 'basura', 'eliminados', 'borrados', 'trash'], icon: FiTrash2, tab: 'trash' },
    ];

    // Repos
    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Filter results as user types for System Navigation
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            return;
        }
        const term = searchTerm.toLowerCase();

        const results = systemModules.filter(module =>
            module.title.toLowerCase().includes(term) ||
            module.keywords.some(k => k.includes(term))
        );

        setSearchResults(results);
    }, [searchTerm]);

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const [importStatus, setImportStatus] = useState<{
        state: 'idle' | 'uploading' | 'completed';
        progress: { current: number; total: number; currentFile: string };
        errors: string[];
    }>({
        state: 'idle',
        progress: { current: 0, total: 0, currentFile: '' },
        errors: []
    });

    const handleImportFiles = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.multiple = true;

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const files = target.files;

            if (!files || files.length === 0) return;

            setImportStatus({
                state: 'uploading',
                progress: { current: 0, total: files.length, currentFile: '' },
                errors: []
            });

            const newErrors: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                setImportStatus(prev => ({
                    ...prev,
                    progress: { current: i + 1, total: files.length, currentFile: file.name }
                }));

                try {
                    await processAndUploadPDF(file);
                } catch (error) {
                    newErrors.push(`${file.name}: Error al subir`);
                }
            }

            setImportStatus(prev => ({
                ...prev,
                state: 'completed',
                errors: newErrors
            }));

            if (newErrors.length > 0) {
                showToast(`Importación con ${newErrors.length} errores`, 'warning');
            } else {
                showToast(`Se importaron ${files.length} archivos correctamente`, 'success');
            }
        };

        input.click();
    };

    const handleImportFolder = () => {
        // Crear un input file invisible configurado para carpetas
        const input = document.createElement('input');
        input.type = 'file';
        input.setAttribute('webkitdirectory', ''); // Para Chrome/Edge
        input.setAttribute('directory', ''); // Para Firefox
        input.setAttribute('mozdirectory', ''); // Para Firefox antiguo

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const files = target.files;

            if (!files || files.length === 0) return;

            // Filtrar solo archivos PDF
            const pdfFiles = Array.from(files).filter(file =>
                file.name.toLowerCase().endsWith('.pdf')
            );

            if (pdfFiles.length === 0) {
                showToast('No se encontraron archivos PDF en la carpeta', 'warning');
                return;
            }

            setImportStatus({
                state: 'uploading',
                progress: { current: 0, total: pdfFiles.length, currentFile: '' },
                errors: []
            });

            const newErrors: string[] = [];

            // Procesar cada PDF encontrado
            for (let i = 0; i < pdfFiles.length; i++) {
                const file = pdfFiles[i];

                setImportStatus(prev => ({
                    ...prev,
                    progress: { current: i + 1, total: pdfFiles.length, currentFile: file.name }
                }));

                try {
                    // Extract top-level folder name from webkitRelativePath (e.g., "Folder/File.pdf" -> "Folder")
                    const folderPath = file.webkitRelativePath;
                    const folderName = folderPath ? folderPath.split('/')[0] : undefined;
                    await processAndUploadPDF(file, folderName);
                } catch (error) {
                    newErrors.push(`${file.name}: Error al subir`);
                }
            }

            setImportStatus(prev => ({
                ...prev,
                state: 'completed',
                errors: newErrors
            }));

            if (newErrors.length > 0) {
                showToast(`Carpeta importada con ${newErrors.length} errores`, 'warning');
            } else {
                showToast(`Carpeta importada: ${pdfFiles.length} archivos`, 'success');
            }
        };

        input.click();
    };

    const processAndUploadPDF = async (file: File, folderName?: string) => {
        try {
            // 1. Calcular número de páginas desde el cliente (Importación Dinámica)
            let numPages = 0;
            try {
                // ✅ IMPORTACIÓN DINÁMICA: Solo carga la librería en el navegador al momento de usarla
                const { pdfjs } = await import('react-pdf');

                // Configurar el worker dinámicamente aquí
                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                numPages = pdf.numPages;
                console.log(`📄 Páginas detectadas en ${file.name}: ${numPages}`);
            } catch (err) {
                console.warn('No se pudo contar las páginas en el cliente:', err);
            }
            const formData = new FormData();
            formData.append('file', file);
            const fileName = file.name.replace('.pdf', '');
            formData.append('title', fileName);
            formData.append('uploadDate', new Date().toISOString());
            if (folderName) {
                formData.append('folderName', folderName);
            }

            // 2. Enviar el número de páginas al servidor
            formData.append('totalPages', numPages.toString());
            const response = await fetch('/api/pdfs/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (!response.ok) {
                let errorMessage = `Error al subir ${file.name}`;
                try {
                    const errorData = await response.json();
                    if (errorData.details) errorMessage += `: ${errorData.details}`;
                    else if (errorData.error) errorMessage += `: ${errorData.error}`;
                } catch (e) {
                    errorMessage += `: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            const result = await response.json();
            // Llamar a la función callback para actualizar el dashboard
            if (onPdfUploaded && result.pdf) {
                onPdfUploaded(result.pdf);
            }
            console.log(`✅ ${file.name} importado exitosamente`);
        } catch (error) {
            console.error(`❌ Error al importar ${file.name}:`, error);
            throw error;
        }
    };
    // Old useEffect replaced by global one above
    /* 
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);
    */

    const handleLogout = () => {
        removeToken();

        setShowUserMenu(false);

        window.location.href = '/';

    };

    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className="bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-md border-b border-white/20 dark:border-white/10 px-6 py-4 shadow-sm relative z-[60]">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={handleImportFiles}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                    >
                        <FiUpload />
                        Importar PDFs
                    </button>

                    <button
                        onClick={handleImportFolder}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                    >
                        <FiFolder />
                        Importar Carpeta
                    </button>
                </div>
                {/* Search Bar */}
                <div className="flex-1 max-w-md mx-6 relative" ref={searchRef}>
                    <div className="relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF] transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            placeholder="Buscar módulo (ej: Favoritos, Carpetas...)"
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-100/50 dark:bg-white/5 border border-transparent dark:border-white/10 text-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/20 focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#4F6FFF] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                        />
                        {/* Keyboard shortcut hint could go here */}
                    </div>

                    {/* Quick Results Dropdown */}
                    <AnimatePresence>
                        {showSearchResults && searchTerm && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 p-2"
                            >
                                <p className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase tracking-wider">
                                    Navegación del Sistema
                                </p>
                                {searchResults.length > 0 ? (
                                    <ul className="space-y-1">
                                        {searchResults.map((module) => (
                                            <li key={module.id}>
                                                <button
                                                    onClick={() => {
                                                        onNavigate(module.tab);
                                                        setShowSearchResults(false);
                                                        setSearchTerm('');
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                        <module.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">{module.title}</p>
                                                        <p className="text-xs text-gray-400">Ir a {module.title}</p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <p>No se encontraron módulos</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Date and User Section */}
                <div className="flex items-center gap-6 ml-6">
                    {/* Date */}
                    <div className="text-sm text-gray-600 dark:text-gray-300 font-medium hidden md:block">
                        {today}
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white'
                                }`}
                        >
                            <FiBell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
                            )}
                        </button>
                        <AnimatePresence>
                            {showNotifications && (
                                <NotificationsDropdown
                                    notifications={notifications}
                                    onMarkAsRead={markAsRead}
                                    onClearAll={clearNotifications}
                                    onClose={() => setShowNotifications(false)}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Profile */}
                    <div ref={menuRef} className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 focus:outline-none"
                        >
                            {userImage && !imageError ? (
                                <img
                                    src={userImage}
                                    alt={userName}
                                    className="w-10 h-10 rounded-full object-cover shadow-lg hover:shadow-xl transition-shadow border-2 border-white/50"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                                    <FiUser size={20} />
                                </div>
                            )}
                        </button>
                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#1A1D2E] border border-[#2A2D3E] rounded-lg shadow-xl z-50">
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        onOpenSettings();
                                    }}
                                    className="w-full px-4 py-3 text-left text-white hover:bg-[#2A2D3E] transition-colors flex items-center gap-2 rounded-lg"
                                >
                                    <CiSettings size={18} />
                                    <span>Configuración</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3 text-left text-white hover:bg-[#2A2D3E] transition-colors flex items-center gap-2 rounded-lg"
                                >
                                    <FiLogOut size={18} />
                                    <span>Cerrar Sesión</span>
                                </button>

                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal de Importación */}
            {
                importStatus.state !== 'idle' && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full m-4 transform transition-all scale-100">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 
                                ${importStatus.state === 'uploading' ? 'bg-blue-50 text-blue-500' :
                                        importStatus.errors.length === 0 ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-yellow-500'}`}>

                                    {importStatus.state === 'uploading' ? (
                                        <FiLoader className="animate-spin" size={32} />
                                    ) : importStatus.errors.length === 0 ? (
                                        <FiCheckCircle size={32} />
                                    ) : (
                                        <FiAlertTriangle size={32} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    {importStatus.state === 'uploading' ? 'Importando Documentos' :
                                        importStatus.errors.length === 0 ? 'Importación Exitosa' : 'Importación Finalizada'}
                                </h3>
                                <p className="text-gray-500 mt-2 text-sm">
                                    {importStatus.state === 'uploading' ? `Procesando: ${importStatus.progress.currentFile}` :
                                        `Se procesaron ${importStatus.progress.total} archivos`}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <span>Progreso</span>
                                    <span>{importStatus.progress.total > 0 ? Math.round((importStatus.progress.current / importStatus.progress.total) * 100) : 0}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ease-out
                                        ${importStatus.state === 'completed'
                                                ? (importStatus.errors.length > 0 ? 'bg-yellow-500' : 'bg-green-500')
                                                : 'bg-blue-500 relative overflow-hidden'
                                            }`}
                                        style={{ width: `${importStatus.progress.total > 0 ? (importStatus.progress.current / importStatus.progress.total) * 100 : 0}%` }}
                                    >
                                        {importStatus.state === 'uploading' && (
                                            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Errors List */}
                            {importStatus.errors.length > 0 && (
                                <div className="mb-6 max-h-32 overflow-y-auto bg-red-50 rounded-lg p-3 border border-red-100">
                                    <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                                        <FiAlertTriangle size={14} />
                                        Errores ({importStatus.errors.length})
                                    </div>
                                    <ul className="space-y-1">
                                        {importStatus.errors.map((error, idx) => (
                                            <li key={idx} className="text-xs text-red-600 truncate" title={error}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            {importStatus.state === 'completed' && (
                                <button
                                    onClick={() => setImportStatus(prev => ({ ...prev, state: 'idle', errors: [] }))}
                                    className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors shadow-lg shadow-gray-200"
                                >
                                    Cerrar y Continuar
                                </button>
                            )}
                        </div>
                    </div>
                )
            }
        </header >
    );
}


