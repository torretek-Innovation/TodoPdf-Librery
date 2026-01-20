'use client';

import { useEffect, useRef, useState } from 'react';
import { FiFile, FiStar, FiTrash2, FiMoreVertical, FiEye, FiEdit, FiFolder, FiDownload, FiCheck, FiClock } from 'react-icons/fi';
import EditPDFModal from './EditPDFModal';
import { useToast } from '../providers/ToastProvider';
import { offlineStorage } from '@/lib/offline-storage';

interface PDFCardProps {
    id?: string;
    title: string;
    size: string;
    date: string;
    uploadDate: string;
    filePath: string;
    isFavorite?: boolean;
    onOpen?: () => void;
    onViewDetails?: () => void;
    category?: string;
    folderName?: string;
    totalPages?: number;
    readingProgress?: number;
    coverImage?: string;
    onUpdate?: (updatedData: {
        title?: string;
        category?: string;
        coverImage?: string;
    }) => Promise<boolean>;
    onDelete?: () => void;
    onToggleFavorite?: () => void;
    isInTrash?: boolean;
}

export default function PDFCard({
    id,
    title,
    size,
    date,
    uploadDate,
    filePath,
    isFavorite = false,
    onOpen,
    category = 'Sin categoría',
    totalPages = 0,
    readingProgress = 0,
    coverImage,
    onUpdate,
    onDelete,
    onViewDetails,
    onToggleFavorite,
    folderName,
    isInTrash = false
}: PDFCardProps) {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    const [showEditModal, setShowEditModal] = useState(false);

    // Offline State
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (id) {
            offlineStorage.isSaved(id).then(setIsDownloaded).catch(() => { });
        }
    }, [id]);

    const handleDownloadOffline = async () => {
        if (!id || !filePath) return;

        setIsDownloading(true);
        try {
            // Use proxy to get blob
            const fileUrl = filePath.startsWith('http')
                ? `/api/proxy/pdf?url=${encodeURIComponent(filePath)}`
                : filePath;

            const res = await fetch(fileUrl);
            if (!res.ok) throw new Error('Error al descargar archivo');

            const blob = await res.blob();
            await offlineStorage.savePDF(id, blob);

            setIsDownloaded(true);
            showToast('Libro descargado para lectura offline', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error en la descarga offline', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpen = () => {
        if (onOpen) {
            onOpen();
        } else {
            window.open(filePath, '_blank');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <>
            <div
                onClick={handleOpen}
                className="group bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 hover:border-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/10 transition-all duration-300 animate-fade-in cursor-pointer relative"
            >
                {/* PDF Preview */}
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FiFile size={56} className="text-gray-300 group-hover:text-[#4F6FFF] transition-colors duration-300" />
                    )}

                    {/* Offline Badge */}
                    {isDownloaded && (
                        <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm backdrop-blur-sm flex items-center gap-1 z-10 pointer-events-none">
                            <FiCheck size={10} /> OFFLINE
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (onToggleFavorite) {
                            onToggleFavorite();
                        }
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all duration-300 z-[100] 
                        ${isFavorite
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 opacity-100 scale-100'
                            : 'bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-400 hover:scale-110'
                        }`}
                    title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                    <FiStar
                        size={16}
                        className={`transition-colors ${isFavorite ? 'text-white fill-white' : ''}`}
                    />
                </button>

                {/* Info */}
                <div className="p-4 bg-white overflow-visible">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {/* Barra de Progreso */}
                            {readingProgress > 0 && (
                                <div className="mb-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Completado</span>
                                        <span className="text-xs font-bold text-[#4F6FFF]">{readingProgress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#4F6FFF] to-[#8B5CF6] rounded-full transition-all duration-500"
                                            style={{ width: `${readingProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <h3 className="font-semibold text-gray-800 truncate group-hover:text-[#4F6FFF] transition-colors text-sm">
                                {title}
                            </h3>
                            {folderName && (
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                                    <FiFolder size={10} />
                                    <span className="truncate max-w-[120px]">{folderName}</span>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1.5">{size}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                        </div>
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                                className="p-1.5 text-gray-400 hover:text-[#4F6FFF] hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <FiMoreVertical size={16} />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                                    {/* Download Offline Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadOffline();
                                            setIsMenuOpen(false);
                                        }}
                                        disabled={isDownloaded || isDownloading}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${isDownloaded ? 'text-green-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {isDownloading ? (
                                            <span className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent" />
                                        ) : isDownloaded ? (
                                            <FiCheck size={16} />
                                        ) : (
                                            <FiDownload size={16} />
                                        )}
                                        {isDownloaded ? 'Descargado' : isDownloading ? 'Bajando...' : 'Descargar Offline'}
                                    </button>

                                    <hr className="my-1 border-gray-200" />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onViewDetails) onViewDetails();
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                    >
                                        <FiEye size={16} />
                                        Ver detalles
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowEditModal(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                    >
                                        <FiEdit size={16} />
                                        Editar
                                    </button>

                                    <hr className="my-1 border-gray-200" />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDelete) {
                                                onDelete();
                                            }
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <FiTrash2 size={16} />
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showEditModal && onUpdate && (
                <EditPDFModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    pdfData={{
                        id: id || '0',
                        title: title,
                        category: category,
                        totalPages: totalPages,
                        createdAt: uploadDate || date,
                        readingProgress: readingProgress,
                        coverImage: coverImage
                    }}
                    onSave={async (updatedData) => {
                        try {
                            if (!onUpdate) {
                                console.error('onUpdate no está definido');
                                showToast('Error interno: No se puede actualizar', 'error');
                                return;
                            }

                            const success = await onUpdate(updatedData);

                            if (success) {
                                showToast('Documento actualizado correctamente', 'success');
                            } else {
                                showToast('Error al actualizar el documento', 'error');
                            }
                        } catch (error) {
                            console.error('Error en onSave:', error);
                            showToast('Error al guardar los cambios', 'error');
                        }
                    }}
                />
            )}

        </>
    );
}
