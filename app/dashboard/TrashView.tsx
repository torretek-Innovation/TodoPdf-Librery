'use client';

import { useState, useEffect } from 'react';
import { FiTrash2, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import PDFCard from './PDFCard';
import { useToast } from '../providers/ToastProvider';
import { getToken } from '../lib/auth-utils';

interface PDF {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    uploadDate: string;
    deletedDate?: string;
    size: number;
    totalPages?: number;
    coverImage?: string;
    category?: string;
    folderName?: string;
    isFavorite?: boolean;
    readingProgress?: number;
}

interface TrashViewProps {
    onRestore: () => void;
}

export default function TrashView({ onRestore }: TrashViewProps) {
    const [trashedPdfs, setTrashedPdfs] = useState<PDF[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    const loadTrash = async () => {
        try {
            const response = await fetch('/api/pdfs/trash', {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTrashedPdfs(data.pdfs || []);
            }
        } catch (error) {
            console.error('Error loading trash:', error);
            showToast('Error al cargar la papelera', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTrash();
    }, []);

    const handleRestore = async (pdfId: string) => {
        try {
            const response = await fetch(`/api/pdfs/${pdfId}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (response.ok) {
                showToast('PDF restaurado correctamente', 'success');
                setTrashedPdfs(prev => prev.filter(pdf => pdf.id !== pdfId));
                onRestore();
            } else {
                showToast('Error al restaurar el PDF', 'error');
            }
        } catch (error) {
            console.error('Error restoring PDF:', error);
            showToast('Error de conexión al restaurar', 'error');
        }
    };

    const handlePermanentDelete = async (pdfId: string) => {
        const confirmDelete = confirm('¿Estás seguro de que deseas eliminar este PDF permanentemente? Esta acción no se puede deshacer.');
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/pdfs/${pdfId}?permanent=true`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (response.ok) {
                showToast('PDF eliminado permanentemente', 'success');
                setTrashedPdfs(prev => prev.filter(pdf => pdf.id !== pdfId));
            } else {
                showToast('Error al eliminar el PDF', 'error');
            }
        } catch (error) {
            console.error('Error deleting PDF:', error);
            showToast('Error de conexión al eliminar', 'error');
        }
    };

    const handleEmptyTrash = async () => {
        if (trashedPdfs.length === 0) return;

        const confirmDelete = confirm(`¿Estás seguro de que deseas vaciar la papelera? Se eliminarán permanentemente ${trashedPdfs.length} archivo(s). Esta acción no se puede deshacer.`);
        if (!confirmDelete) return;

        try {
            const deletePromises = trashedPdfs.map(pdf =>
                fetch(`/api/pdfs/${pdf.id}?permanent=true`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                })
            );

            await Promise.all(deletePromises);
            showToast('Papelera vaciada correctamente', 'success');
            setTrashedPdfs([]);
        } catch (error) {
            console.error('Error emptying trash:', error);
            showToast('Error al vaciar la papelera', 'error');
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FiTrash2 className="text-red-500" />
                        Papelera
                    </h2>
                    <p className="text-gray-500 mt-2">
                        Los archivos eliminados se guardan aquí durante 30 días
                    </p>
                </div>

                {trashedPdfs.length > 0 && (
                    <button
                        onClick={handleEmptyTrash}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg"
                    >
                        <FiTrash2 size={18} />
                        Vaciar papelera
                    </button>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <FiAlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-medium">Los archivos en la papelera se pueden restaurar</p>
                    <p className="text-blue-600 mt-1">
                        Haz clic en "Restaurar" para recuperar un archivo o elimínalo permanentemente si ya no lo necesitas.
                    </p>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                    <p className="text-gray-600 mt-4">Cargando papelera...</p>
                </div>
            ) : trashedPdfs.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiTrash2 size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                        La papelera está vacía
                    </h3>
                    <p className="text-gray-500">
                        Los archivos eliminados aparecerán aquí
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {trashedPdfs.map((pdf) => (
                        <div key={pdf.id} className="relative group">
                            {/* Deleted overlay */}
                            <div className="absolute inset-0 bg-red-500/10 rounded-2xl z-10 pointer-events-none"></div>

                            <PDFCard
                                id={pdf.id}
                                title={pdf.title}
                                size={formatFileSize(pdf.size)}
                                date={pdf.deletedDate ? `Eliminado: ${formatDate(pdf.deletedDate)}` : formatDate(pdf.uploadDate)}
                                uploadDate={pdf.uploadDate}
                                filePath={pdf.filePath}
                                isFavorite={false}
                                category={pdf.category}
                                totalPages={pdf.totalPages}
                                readingProgress={pdf.readingProgress}
                                coverImage={pdf.coverImage}
                                onToggleFavorite={() => { }}
                                onOpen={() => { }}
                                onUpdate={() => Promise.resolve(true)}
                                onDelete={() => handlePermanentDelete(pdf.id)}
                                onViewDetails={() => { }}
                                isInTrash={true}
                            />

                            {/* Restore button overlay */}
                            <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleRestore(pdf.id)}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
                                    title="Restaurar"
                                >
                                    <FiRefreshCw size={16} />
                                    Restaurar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
