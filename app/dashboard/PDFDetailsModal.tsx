'use client';

import { createPortal } from 'react-dom';
import { FiX, FiCalendar, FiFileText, FiHardDrive, FiFolder, FiClock, FiActivity } from 'react-icons/fi';
import { useEffect, useState } from 'react';

interface PDFDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdf: {
        title: string;
        fileName?: string;
        size: string;
        uploadDate: string;
        totalPages?: number;
        category?: string;
        filePath?: string;
        coverImage?: string;
        readingProgress?: number;
    };
}

export default function PDFDetailsModal({ isOpen, onClose, pdf }: PDFDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">

                {/* Encabezado con imagen de fondo borrosa o color */}
                <div className="relative h-32 bg-gradient-to-r from-[#4F6FFF] to-[#3650C9] overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all"
                    >
                        <FiX size={20} />
                    </button>
                    <div className="absolute bottom-4 left-8 text-white">
                        <h2 className="text-2xl font-bold truncate max-w-lg shadow-black/10 drop-shadow-md">
                            {pdf.title}
                        </h2>
                        <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                            <FiFileText /> Detalles del documento
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Columna Izquierda - Información Principal */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <FiCalendar size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Fecha de subida</p>
                                    <p className="font-semibold text-gray-800">
                                        {new Date(pdf.uploadDate).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                    <FiFolder size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Categoría</p>
                                    <p className="font-semibold text-gray-800">
                                        {pdf.category || 'Sin categoría'}
                                    </p>
                                </div>
                            </div>

                            {/* Progreso de lectura */}
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <FiActivity size={18} />
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">Progreso de lectura</span>
                                </div>

                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Completado</span>
                                    <span className="font-semibold text-[#4F6FFF]">
                                        {pdf.readingProgress || 0}%
                                    </span>
                                </div>

                                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#4F6FFF] to-[#7B8FFF]"
                                        style={{ width: `${pdf.readingProgress || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha - Detalles Técnicos */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                                    <FiHardDrive size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Tamaño del archivo</p>
                                    <p className="font-semibold text-gray-800">{pdf.size}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                                    <FiFileText size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Páginas</p>
                                    <p className="font-semibold text-gray-800">
                                        {pdf.totalPages || 0} páginas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer con acciones */}
                    <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}