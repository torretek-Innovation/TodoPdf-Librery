'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    FiX, FiDownload, FiZoomIn, FiZoomOut, FiChevronLeft, FiChevronRight,
    FiExternalLink, FiType, FiEdit3, FiPenTool, FiTrash2, FiFileText
} from 'react-icons/fi';

// Configuración del worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    title: string;
    pdfId: string;
}

// Tipos para las herramientas
type ToolMode = 'cursor' | 'text' | 'highlight' | 'draw';

interface StickyNote {
    id: string;
    text: string;
    color: string;
    date: string;
}

interface TextAnnotation {
    id: string;
    x: number;
    y: number;
    text: string;
}

interface HighlightAnnotation {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PageAnnotations {
    notes: string; // Keep for compatibility if needed, though unused in new UI
    stickyNotes: StickyNote[];
    texts: TextAnnotation[];
    highlights: HighlightAnnotation[];
}

export default function PDFViewer({ isOpen, onClose, pdfUrl, title, pdfId }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Estado de las herramientas
    const [toolMode, setToolMode] = useState<ToolMode>('cursor');
    const [annotations, setAnnotations] = useState<Record<number, PageAnnotations>>({});

    // Referencias para dibujo/resaltado
    const isDrawing = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const pageRef = useRef<HTMLDivElement>(null);

    // Inicializar anotaciones para la página actual si no existen
    const getPageAnnotations = (page: number) => {
        return annotations[page] || { notes: '', stickyNotes: [], texts: [], highlights: [] };
    };

    const updatePageAnnotations = (page: number, newAnnotations: Partial<PageAnnotations>) => {
        setAnnotations(prev => ({
            ...prev,
            [page]: { ...prev[page], ...newAnnotations }
        }));
    };

    // --- Lógica de Sticky Notes ---
    const NOTE_COLORS = [
        'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
        'bg-blue-100 hover:bg-blue-200 border-blue-300',
        'bg-green-100 hover:bg-green-200 border-green-300',
        'bg-pink-100 hover:bg-pink-200 border-pink-300',
        'bg-purple-100 hover:bg-purple-200 border-purple-300'
    ];

    const handleAddStickyNote = () => {
        const current = getPageAnnotations(pageNumber);
        const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

        const newNote: StickyNote = {
            id: Date.now().toString(),
            text: '',
            color: randomColor,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        updatePageAnnotations(pageNumber, {
            ...current,
            stickyNotes: [newNote, ...current.stickyNotes]
        });
    };

    const handleUpdateStickyNote = (id: string, text: string) => {
        const current = getPageAnnotations(pageNumber);
        const updatedNotes = current.stickyNotes.map(note =>
            note.id === id ? { ...note, text } : note
        );
        updatePageAnnotations(pageNumber, { ...current, stickyNotes: updatedNotes });
    };

    const handleDeleteStickyNote = (id: string) => {
        const current = getPageAnnotations(pageNumber);
        const updatedNotes = current.stickyNotes.filter(note => note.id !== id);
        updatePageAnnotations(pageNumber, { ...current, stickyNotes: updatedNotes });
    };

    // Guardar progreso (Existente)
    useEffect(() => {
        if (!isOpen || numPages === 0) return;
        const saveProgress = async () => {
            try {
                await fetch(`/api/pdfs/${pdfId}/progress`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page: pageNumber, totalPages: numPages })
                });
            } catch (error) {
                console.error('Error saving progress:', error);
            }
        };
        const timeoutId = setTimeout(saveProgress, 1000);
        return () => clearTimeout(timeoutId);
    }, [pageNumber, numPages, isOpen, pdfId]);

    // Manejadores de Teclado y Scroll
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); handleZoomIn(); }
            if (e.ctrlKey && e.key === '-') { e.preventDefault(); handleZoomOut(); }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
            // Reset al cerrar
            setToolMode('cursor');
            setScale(1.0);
        };
    }, [isOpen, onClose]);

    // Cargar la última página visitada al abrir el PDF
    // Cargar la última página visitada al abrir el PDF
    useEffect(() => {
        if (isOpen && pdfId) {
            const loadLastPosition = async () => {
                try {
                    const response = await fetch(`/api/pdfs/${pdfId}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Ahora 'data.currentPage' existe y es un número válido enviado por nuestra API modificada
                        if (data.currentPage && data.currentPage > 1) {
                            setPageNumber(data.currentPage);
                        }
                    }
                } catch (error) {
                    console.error("Error al recuperar la última página:", error);
                }
            };
            loadLastPosition();
        }
    }, [isOpen, pdfId]);


    // Manejo de clicks en la página (Para Texto y Resaltado)
    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!pageRef.current) return;

        // Coordenadas relativas al contenedor de la página
        const rect = pageRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale; // Ajustar por zoom
        const y = (e.clientY - rect.top) / scale;

        if (toolMode === 'text') {
            const current = getPageAnnotations(pageNumber);
            const newText: TextAnnotation = {
                id: Date.now().toString(),
                x,
                y,
                text: 'Nuevo texto'
            };
            updatePageAnnotations(pageNumber, {
                ...current,
                texts: [...current.texts, newText]
            });
            setToolMode('cursor'); // Volver a cursor después de añadir
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (toolMode === 'highlight' && pageRef.current) {
            isDrawing.current = true;
            const rect = pageRef.current.getBoundingClientRect();
            startPos.current = {
                x: (e.clientX - rect.left) / scale,
                y: (e.clientY - rect.top) / scale
            };
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (toolMode === 'highlight' && isDrawing.current && pageRef.current) {
            const rect = pageRef.current.getBoundingClientRect();
            const endX = (e.clientX - rect.left) / scale;
            const endY = (e.clientY - rect.top) / scale;

            const width = Math.abs(endX - startPos.current.x);
            const height = Math.abs(endY - startPos.current.y);

            // Solo agregar si tiene un tamaño mínimo
            if (width > 5 && height > 5) {
                const current = getPageAnnotations(pageNumber);
                const newHighlight: HighlightAnnotation = {
                    id: Date.now().toString(),
                    x: Math.min(startPos.current.x, endX),
                    y: Math.min(startPos.current.y, endY),
                    width,
                    height
                };
                updatePageAnnotations(pageNumber, {
                    ...current,
                    highlights: [...current.highlights, newHighlight]
                });
            }
            isDrawing.current = false;
        }
    };

    // Funciones de navegación y zoom
    const handlePreviousPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    // UI Helpers
    const ActiveToolClass = (mode: ToolMode) =>
        `p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${toolMode === mode
            ? 'bg-[#4F6FFF] text-white shadow-md'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            {/* Overlay de fondo */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Contenedor Principal estilo Modal Moderno */}
            <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 bg-[#1e293b] text-white border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <FiFileText className="text-[#4F6FFF]" size={20} />
                        <h2 className="text-lg font-medium truncate max-w-md">{title}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                            <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-700 rounded"><FiZoomOut /></button>
                            <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-700 rounded"><FiZoomIn /></button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* Área de Trabajo Dividida */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Panel Izquierdo: Visor PDF */}
                    <div className="flex-1 bg-[#2b2f33] overflow-auto flex justify-center p-8 relative">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F6FFF] mb-4"></div>
                            </div>
                        )}

                        <Document
                            file={pdfUrl}
                            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setIsLoading(false); }}
                            loading={null}
                            className="relative shadow-2xl"
                        >
                            <div
                                className="relative bg-white"
                                ref={pageRef}
                                onClick={handlePageClick}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                style={{ cursor: toolMode === 'text' ? 'text' : toolMode === 'highlight' ? 'crosshair' : 'default' }}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />

                                {/* CAPA DE ANOTACIONES */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Resaltados */}
                                    {getPageAnnotations(pageNumber).highlights.map(hl => (
                                        <div
                                            key={hl.id}
                                            className="absolute bg-yellow-300 mix-blend-multiply opacity-50"
                                            style={{
                                                left: hl.x * scale,
                                                top: hl.y * scale,
                                                width: hl.width * scale,
                                                height: hl.height * scale
                                            }}
                                        />
                                    ))}

                                    {/* Textos */}
                                    {getPageAnnotations(pageNumber).texts.map(txt => (
                                        <div
                                            key={txt.id}
                                            className="absolute pointer-events-auto"
                                            style={{
                                                left: txt.x * scale,
                                                top: txt.y * scale,
                                            }}
                                        >
                                            <input
                                                type="text"
                                                defaultValue={txt.text}
                                                className="bg-transparent border border-blue-400 border-dashed hover:border-solid px-1 text-sm text-red-600 font-medium focus:outline-none focus:bg-white/80"
                                                style={{ fontSize: `${14 * scale}px` }}
                                                onChange={(e) => {
                                                    // Actualizar texto (simplificado)
                                                    const newTxt = e.target.value;
                                                    // Aquí podrías actualizar el estado si quisieras persistencia real del contenido editado
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Document>
                    </div>

                    {/* Panel Derecho: Herramientas (Estilo Imagen) */}
                    <div className="w-80 bg-[#f8f9fa] border-l border-gray-200 flex flex-col shadow-xl z-10">
                        <div className="p-4 bg-gray-100 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-500 tracking-wider">HERRAMIENTAS</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">

                            {/* Sección: Modos de Interacción */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase">Acciones</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setToolMode('text')} className={ActiveToolClass('text')}>
                                        <FiType size={20} />
                                        <span className="text-xs font-medium">Texto</span>
                                    </button>
                                    <button onClick={() => setToolMode('highlight')} className={ActiveToolClass('highlight')}>
                                        <FiEdit3 size={20} />
                                        <span className="text-xs font-medium">Subrayar</span>
                                    </button>
                                    <button onClick={() => setToolMode('cursor')} className={ActiveToolClass('cursor')}>
                                        <FiPenTool size={20} />
                                        <span className="text-xs font-medium">Cursor</span>
                                    </button>
                                </div>
                                {toolMode !== 'cursor' && (
                                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 animate-pulse">
                                        {toolMode === 'text' ? 'Haz clic en el documento para añadir texto.' : 'Arrastra para subrayar un área.'}
                                    </div>
                                )}
                            </div>

                            {/* Sección: Notas de Página (Sticky Notes) */}
                            <div className="space-y-3 flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase">
                                        Notas (Pág. {pageNumber})
                                    </h4>
                                    <button
                                        onClick={handleAddStickyNote}
                                        className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                                    >
                                        + Nueva Nota
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                    {getPageAnnotations(pageNumber).stickyNotes.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                                            <p className="text-gray-400 text-sm">No hay notas en esta página</p>
                                            <p className="text-xs text-gray-300 mt-1">Crea una para recordar algo importante</p>
                                        </div>
                                    ) : (
                                        getPageAnnotations(pageNumber).stickyNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className={`group relative p-3 rounded-xl border shadow-sm transition-all animate-scale-in ${note.color}`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider bg-white/50 px-1.5 py-0.5 rounded">
                                                        {note.date}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteStickyNote(note.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Eliminar nota"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={note.text}
                                                    onChange={(e) => handleUpdateStickyNote(note.id, e.target.value)}
                                                    className="w-full bg-transparent border-none resize-none text-sm text-gray-700 placeholder-gray-400 focus:ring-0 p-0 leading-relaxed"
                                                    placeholder="Escribe tu nota aquí..."
                                                    rows={3}
                                                    autoFocus={!note.text}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Navegación Inferior en Sidebar */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-gray-600">Página {pageNumber} de {numPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={pageNumber <= 1}
                                    className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <FiChevronLeft className="mx-auto" size={20} />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={pageNumber >= numPages}
                                    className="flex-1 py-2 bg-[#4F6FFF] text-white rounded-lg hover:bg-[#3F5FEF] disabled:opacity-50 shadow-md"
                                >
                                    <FiChevronRight className="mx-auto" size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

