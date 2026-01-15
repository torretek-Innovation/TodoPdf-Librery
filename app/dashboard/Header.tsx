'use client';

import { useState, useEffect, useRef } from 'react';
import { CiSettings } from 'react-icons/ci';
import { FiSearch, FiBell, FiUser, FiLogOut, FiUpload, FiFolder, FiCheckCircle, FiAlertTriangle, FiLoader, FiX } from 'react-icons/fi';


interface HeaderProps {
    userName: string;
    onPdfUploaded?: (pdf: any) => void;
}




export default function Header({ userName, onPdfUploaded }: HeaderProps) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
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
                alert('No se encontraron archivos PDF en la carpeta seleccionada');
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
                if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
                }
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
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

    const handleLogout = () => {
        localStorage.removeItem('token');

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
        <header className="bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 shadow-sm">
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
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search"
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-none text-gray-800 rounded-lg focus:ring-2 focus:ring-[#4F6FFF] focus:bg-white outline-none transition-all placeholder-gray-400 text-sm"
                        />
                    </div>
                </div>

                {/* Date and User Section */}
                <div className="flex items-center gap-6 ml-6">
                    {/* Date */}
                    <div className="text-sm text-gray-600 font-medium hidden md:block">
                        {today}
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <FiBell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* User Profile */}
                    <div ref={menuRef} className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 focus:outline-none"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                                <FiUser size={20} />
                            </div>
                        </button>
                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#1A1D2E] border border-[#2A2D3E] rounded-lg shadow-xl z-50">
                                <button
                                    onClick={handleLogout}
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
            {importStatus.state !== 'idle' && (
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
            )}
        </header>
    );
}


