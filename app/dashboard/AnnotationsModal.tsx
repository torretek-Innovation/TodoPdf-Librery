'use client';

import { useState, useEffect } from 'react';
import { FiX, FiFileText, FiEdit3, FiMessageSquare, FiChevronRight } from 'react-icons/fi';

interface AnnotationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfId: string;
    pdfTitle: string;
    onNavigateToPage: (page: number) => void;
}

interface Annotation {
    type: 'text' | 'highlight' | 'sticky_note';
    page: number;
    content: string;
    id: string;
}

export default function AnnotationsModal({ isOpen, onClose, pdfId, pdfTitle, onNavigateToPage }: AnnotationsModalProps) {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'text' | 'highlight' | 'sticky_note'>('all');

    useEffect(() => {
        if (isOpen && pdfId) {
            loadAnnotations();
        }
    }, [isOpen, pdfId]);

    const loadAnnotations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/pdfs/${pdfId}/annotations`);
            if (res.ok) {
                const data = await res.json();

                // Convertir el objeto agrupado por página a un array plano
                const flatAnnotations: Annotation[] = [];

                Object.entries(data).forEach(([pageStr, pageData]: [string, any]) => {
                    const page = parseInt(pageStr);

                    // Textos
                    pageData.texts?.forEach((t: any) => {
                        flatAnnotations.push({
                            type: 'text',
                            page,
                            content: t.text,
                            id: t.id
                        });
                    });

                    // Highlights
                    pageData.highlights?.forEach((h: any) => {
                        flatAnnotations.push({
                            type: 'highlight',
                            page,
                            content: `Área resaltada (${Math.round(h.width)}x${Math.round(h.height)})`,
                            id: h.id
                        });
                    });

                    // Sticky Notes
                    pageData.stickyNotes?.forEach((sn: any) => {
                        flatAnnotations.push({
                            type: 'sticky_note',
                            page,
                            content: sn.text,
                            id: sn.id
                        });
                    });
                });

                // Ordenar por página
                flatAnnotations.sort((a, b) => a.page - b.page);
                setAnnotations(flatAnnotations);
            }
        } catch (error) {
            console.error('Error loading annotations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAnnotations = annotations.filter(ann =>
        filter === 'all' || ann.type === filter
    );

    const getIcon = (type: string) => {
        switch (type) {
            case 'text': return <FiFileText className="text-red-500" size={18} />;
            case 'highlight': return <FiEdit3 className="text-yellow-500" size={18} />;
            case 'sticky_note': return <FiMessageSquare className="text-blue-500" size={18} />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'text': return 'Texto';
            case 'highlight': return 'Subrayado';
            case 'sticky_note': return 'Nota';
            default: return type;
        }
    };

    const handleNavigate = (page: number) => {
        onNavigateToPage(page);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-[#1A1D2E] rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4F6FFF] to-[#8B5CF6] text-white">
                    <div>
                        <h2 className="text-xl font-bold">Anotaciones</h2>
                        <p className="text-sm text-white/80 mt-1">{pdfTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Filtros */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-[#4F6FFF] text-white shadow-md'
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
                                }`}
                        >
                            Todas ({annotations.length})
                        </button>
                        <button
                            onClick={() => setFilter('text')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filter === 'text'
                                ? 'bg-red-500 text-white shadow-md'
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
                                }`}
                        >
                            <FiFileText size={16} />
                            Textos ({annotations.filter(a => a.type === 'text').length})
                        </button>
                        <button
                            onClick={() => setFilter('highlight')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filter === 'highlight'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
                                }`}
                        >
                            <FiEdit3 size={16} />
                            Subrayados ({annotations.filter(a => a.type === 'highlight').length})
                        </button>
                        <button
                            onClick={() => setFilter('sticky_note')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filter === 'sticky_note'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/20'
                                }`}
                        >
                            <FiMessageSquare size={16} />
                            Notas ({annotations.filter(a => a.type === 'sticky_note').length})
                        </button>
                    </div>
                </div>

                {/* Lista de anotaciones */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F6FFF] mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Cargando anotaciones...</p>
                        </div>
                    ) : filteredAnnotations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-semibold mb-2">No hay anotaciones</h3>
                            <p className="text-sm">
                                {filter === 'all'
                                    ? 'Aún no has creado ninguna anotación en este documento'
                                    : `No hay ${getTypeLabel(filter).toLowerCase()}s en este documento`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAnnotations.map((ann) => (
                                <div
                                    key={ann.id}
                                    onClick={() => handleNavigate(ann.page)}
                                    className="group bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-[#4F6FFF] dark:hover:border-[#6366F1] hover:shadow-lg transition-all cursor-pointer"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getIcon(ann.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                    {getTypeLabel(ann.type)}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs font-medium text-[#4F6FFF] dark:text-[#6366F1]">
                                                    Página {ann.page}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                                                {ann.content || '(Sin contenido)'}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <FiChevronRight className="text-[#4F6FFF] dark:text-[#6366F1]" size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {filteredAnnotations.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            Mostrando {filteredAnnotations.length} de {annotations.length} anotaciones
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
