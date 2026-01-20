'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    FiX, FiDownload, FiZoomIn, FiZoomOut, FiChevronLeft, FiChevronRight,
    FiExternalLink, FiType, FiEdit3, FiPenTool, FiTrash2, FiFileText,
    FiVolume2, FiSquare
} from 'react-icons/fi';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración del worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    title: string;
    pdfId: string;
    initialPage?: number;
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

import { offlineStorage } from '@/lib/offline-storage';
import { useTTS } from '../context/TTSContext';
import TTSHighlighter from './TTSHighlighter';

// ...

export default function PDFViewer({ isOpen, onClose, pdfUrl, title, pdfId, initialPage }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const { speak, stop, state: ttsState, voice, voices, setVoice, setIsMinimized } = useTTS();

    // Offline / Internal URL State
    const [internalPdfUrl, setInternalPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (pdfId) {
            offlineStorage.getPDF(pdfId).then((record) => {
                if (record?.blob) {
                    const url = URL.createObjectURL(record.blob);
                    setInternalPdfUrl(url);
                }
            }).catch(console.error);
        }
        return () => {
            // Cleanup object URL if exists
            if (internalPdfUrl) URL.revokeObjectURL(internalPdfUrl);
        };
    }, [pdfId]);

    // Al cerrar el modal, si está leyendo, minimizamos en lugar de detener
    useEffect(() => {
        if (!isOpen && ttsState === 'PLAYING') {
            setIsMinimized(true);
        }
    }, [isOpen]);

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

    // --- Persistence & Sync ---
    const loadAnnotations = async () => {
        if (!pdfId) return;
        try {
            const res = await fetch(`/api/pdfs/${pdfId}/annotations`);
            if (res.ok) {
                const data = await res.json();
                // Merge with existing local state if needed, or mostly replace
                // Data is grouped by page
                setAnnotations(data);
            }
        } catch (e) {
            console.error("Failed to load annotations", e);
        }
    };

    // Initial load
    useEffect(() => {
        loadAnnotations();
    }, [pdfId]);

    // Save debounced
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveAnnotationsForPage = (page: number, currentAnns: PageAnnotations) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                console.log(`💾 Guardando anotaciones de la página ${page}...`);
                const response = await fetch(`/api/pdfs/${pdfId}/annotations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        page,
                        annotations: currentAnns
                    })
                });

                if (response.ok) {
                    console.log(`✅ Anotaciones guardadas exitosamente en página ${page}`);
                } else {
                    console.error(`❌ Error al guardar: ${response.status}`);
                }
            } catch (e) {
                console.error("Failed to save annotations", e);
            }
        }, 1000); // 1s debounce
    };

    const updatePageAnnotations = (page: number, newAnnotations: Partial<PageAnnotations>) => {
        setAnnotations(prev => {
            const prevPage = prev[page] || { notes: '', stickyNotes: [], texts: [], highlights: [] };
            const merged = { ...prevPage, ...newAnnotations };

            // Trigger save
            saveAnnotationsForPage(page, merged);

            return {
                ...prev,
                [page]: merged
            };
        });
    };

    // --- Dragging Logic for Texts ---
    const dragItem = useRef<{ id: string, startX: number, startY: number, initialX: number, initialY: number } | null>(null);

    const handleTextMouseDown = (e: React.MouseEvent, id: string, x: number, y: number) => {
        if (toolMode !== 'cursor') return;
        e.stopPropagation(); // Prevent drawing/selecting
        dragItem.current = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: x,
            initialY: y
        };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragItem.current) {
            const dx = (e.clientX - dragItem.current.startX) / scale;
            const dy = (e.clientY - dragItem.current.startY) / scale;

            const newX = dragItem.current.initialX + dx;
            const newY = dragItem.current.initialY + dy;

            // Update local state immediately for smooth drag
            // We optimize to not trigger full save on every frame, but react state update is needed for render
            // Ensure we don't spam updatePageAnnotations logic too hard
            setAnnotations(prev => {
                const current = prev[pageNumber] || { notes: '', stickyNotes: [], texts: [], highlights: [] };
                const updatedTexts = current.texts.map(t =>
                    t.id === dragItem.current!.id ? { ...t, x: newX, y: newY } : t
                );
                return { ...prev, [pageNumber]: { ...current, texts: updatedTexts } };
            });
        }

        if (isDrawing.current && toolMode === 'highlight' && pageRef.current) {
            // ... drawing highlight preview could go here if implemented
        }
    };

    const handleGlobalMouseUp = () => {
        if (dragItem.current) {
            // Final save on drop
            const current = getPageAnnotations(pageNumber);
            saveAnnotationsForPage(pageNumber, current);
            dragItem.current = null;
        }
    };

    // Attach global mouse up listener
    useEffect(() => {
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [pageNumber, annotations]); // Re-bind if page changes to ensure closure captures correctly? 
    // Actually handleGlobalMouseUp needs access to latest state for saving? 
    // `saveAnnotationsForPage` uses `pdfId` from closure. The `current` in handleGlobalMouseUp needs to be fresh.
    // Better: just trigger a save of the *current* state in the drag end. 
    // Since we updated state in mouseMove, `getPageAnnotations` (if using ref or latest state) would be good. 
    // React state closure issue: handleGlobalMouseUp defined in render closes over current state.
    // It's safer to rely on the debounce in update? 
    // But drag-move updates state. The last state update triggers debounce. 
    // So we actually don't need manual save in mouse up IF mouseMove updates state via `updatePageAnnotations`.
    // BUT mouseMove above sets state directly to avoid `saveAnnotationsForPage` logic spam.
    // Let's change mouseMove to use `updatePageAnnotations` but maybe with a flag? or just let debounce handle it. 
    // Debounce is 1s. Dragging might generate 60fps updates. 
    // Debounce clears previous timeout. So only last one runs. It is fine.




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

    // --- Gestión de Textos y Resaltados ---
    const handleUpdateText = (id: string, newText: string) => {
        const current = getPageAnnotations(pageNumber);
        const updatedTexts = current.texts.map(t => t.id === id ? { ...t, text: newText } : t);
        updatePageAnnotations(pageNumber, { ...current, texts: updatedTexts });
    };

    const handleDeleteText = (id: string) => {
        const current = getPageAnnotations(pageNumber);
        const updatedTexts = current.texts.filter(t => t.id !== id);
        updatePageAnnotations(pageNumber, { ...current, texts: updatedTexts });
    };

    const handleDeleteHighlight = (id: string) => {
        const current = getPageAnnotations(pageNumber);
        const updatedHighlights = current.highlights.filter(h => h.id !== id);
        updatePageAnnotations(pageNumber, { ...current, highlights: updatedHighlights });
    };

    // --- Tema de Lectura ---
    const [readingTheme, setReadingTheme] = useState<'light' | 'dark' | 'sepia'>('light');

    const getThemeStyles = () => {
        switch (readingTheme) {
            case 'dark': return { filter: 'invert(1) hue-rotate(180deg)', mixBlendMode: 'multiply' }; // Simple invert for dark mode feel
            case 'sepia': return { filter: 'sepia(0.5)' };
            default: return {};
        }
    };

    // For rendering the PDF container background behind the page
    const getContainerBackground = () => {
        switch (readingTheme) {
            case 'dark': return 'bg-gray-900';
            case 'sepia': return 'bg-[#f4ecd8]';
            default: return 'bg-[#2b2f33]'; // Default dark gray background for viewer
        }
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

    const handleToggleRead = async () => {
        if (!pdfDocument) return;

        if (ttsState === 'PLAYING') {
            stop();
            return;
        }

        try {
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = await page.getTextContent();

            if (!textContent || !textContent.items) {
                alert('No se pudo extraer texto de esta página.');
                return;
            }

            const text = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            if (!text || !text.trim()) {
                alert('No se detectó texto legible en esta página.');
                return;
            }

            speak(text, { title, pdfId, page: pageNumber });
        } catch (err) {
            console.error('Error al leer PDF:', err);
        }
    };

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
    useEffect(() => {
        if (isOpen && pdfId) {
            // If explicit start page provided (e.g. from mini player), use it
            if (initialPage && initialPage > 0) {
                setPageNumber(initialPage);
                return;
            }

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
    }, [isOpen, pdfId, initialPage]);


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
        // Si estamos en modo highlight, preparamos para dibujar O limpiamos selección previa
        if (toolMode === 'highlight' && pageRef.current) {
            // Check if user is clicking on an existing annotation (this event bubbles up if not stopped)
            // Ideally annotation clicks stop propagation, but just in case.

            isDrawing.current = true;
            const rect = pageRef.current.getBoundingClientRect();
            startPos.current = {
                x: (e.clientX - rect.left) / scale,
                y: (e.clientY - rect.top) / scale
            };
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (toolMode === 'highlight' && pageRef.current) {
            const rectContainer = pageRef.current.getBoundingClientRect();

            // 1. FIRST PRIORITY: Text Selection Highlighting
            // If the user selected text while in highlight mode, we highlight that specific text.
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0 && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rects = range.getClientRects();

                if (rects.length > 0) {
                    const current = getPageAnnotations(pageNumber);
                    const newHighlights: HighlightAnnotation[] = [];

                    for (let i = 0; i < rects.length; i++) {
                        const r = rects[i];
                        // Convert viewport rect to PDF page coordinates
                        const hx = (r.left - rectContainer.left) / scale;
                        const hy = (r.top - rectContainer.top) / scale;
                        const hw = r.width / scale;
                        const hh = r.height / scale;

                        newHighlights.push({
                            id: Date.now().toString() + '-' + i,
                            x: hx,
                            y: hy,
                            width: hw,
                            height: hh
                        });
                    }

                    updatePageAnnotations(pageNumber, {
                        ...current,
                        highlights: [...current.highlights, ...newHighlights]
                    });

                    selection.removeAllRanges(); // Clear selection after highlighting
                    isDrawing.current = false;
                    return; // Done
                }
            }

            // 2. SECOND PRIORITY: Box Drawing (Fallback if no text selected)
            // Only if isDrawing is true (started inside the page)
            if (isDrawing.current) {
                const endX = (e.clientX - rectContainer.left) / scale;
                const endY = (e.clientY - rectContainer.top) / scale;

                const width = Math.abs(endX - startPos.current.x);
                const height = Math.abs(endY - startPos.current.y);

                // Solo agregar si tiene un tamaño mínimo (evitar clicks accidentales)
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
                    <div className={`flex-1 overflow-auto flex justify-center p-8 relative transition-colors duration-300 ${getContainerBackground()}`}>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F6FFF] mb-4"></div>
                            </div>
                        )}

                        <Document
                            file={internalPdfUrl || pdfUrl}
                            onLoadSuccess={(pdf) => { setNumPages(pdf.numPages); setPdfDocument(pdf); setIsLoading(false); }}
                            loading={null}
                            className="relative shadow-2xl transition-all duration-300"
                        >
                            <div
                                className="relative bg-white"
                                ref={pageRef}
                                onClick={handlePageClick}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                style={{
                                    cursor: toolMode === 'text' ? 'text' : toolMode === 'highlight' ? 'crosshair' : 'default',
                                    ...(readingTheme === 'dark' ? { filter: 'invert(0.9) hue-rotate(180deg)' } : readingTheme === 'sepia' ? { filter: 'sepia(0.3)' } : {})
                                }}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={false}
                                />

                                {/* CAPA DE HIGHLIGHT TTS */}
                                <TTSHighlighter
                                    active={ttsState === 'PLAYING'}
                                    charIndex={useTTS().charIndex}
                                    pageRef={pageRef as React.RefObject<HTMLDivElement>}
                                />

                                {/* CAPA DE ANOTACIONES */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Resaltados */}
                                    {getPageAnnotations(pageNumber).highlights.map(hl => (
                                        <div
                                            key={hl.id}
                                            className="absolute group pointer-events-auto"
                                            style={{
                                                left: hl.x * scale,
                                                top: hl.y * scale,
                                                width: hl.width * scale,
                                                height: hl.height * scale
                                            }}
                                        >
                                            <div className="w-full h-full bg-yellow-300 mix-blend-multiply opacity-50" />
                                            {/* Botón Eliminar Highlights (aparece en hover) */}
                                            {toolMode === 'cursor' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(hl.id); }}
                                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100 shadow-md"
                                                    title="Eliminar Subrayado"
                                                >
                                                    <FiX size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Textos */}
                                    {getPageAnnotations(pageNumber).texts.map(txt => (
                                        <div
                                            key={txt.id}
                                            className={`absolute pointer-events-auto group z-20 ${toolMode === 'cursor' ? 'cursor-move' : ''}`}
                                            style={{
                                                left: txt.x * scale,
                                                top: txt.y * scale,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => handleTextMouseDown(e, txt.id, txt.x, txt.y)}
                                        >
                                            <div className="relative">
                                                <textarea
                                                    defaultValue={txt.text}
                                                    className="bg-transparent border border-transparent hover:border-blue-300 border-dashed rounded px-1 text-sm text-red-600 font-medium focus:outline-none focus:bg-white/95 focus:border-solid focus:border-blue-500 focus:shadow-sm resize-none overflow-hidden min-w-[120px]"
                                                    style={{
                                                        fontSize: `${14 * scale}px`,
                                                        height: `${24 * scale}px`, // Altura inicial
                                                        lineHeight: 1.2
                                                    }}
                                                    onBlur={(e) => handleUpdateText(txt.id, e.target.value)}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${target.scrollHeight}px`;
                                                    }}
                                                />
                                                {/* Botón Eliminar Texto */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteText(txt.id);
                                                    }}
                                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100 shadow-md z-30 cursor-pointer"
                                                    title="Eliminar Texto"
                                                >
                                                    <FiX size={12} />
                                                </button>
                                            </div>
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
                            <div className="space-y-4">
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
                                    <button
                                        onClick={handleToggleRead}
                                        className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${ttsState === 'PLAYING' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {ttsState === 'PLAYING' ? <FiSquare size={20} /> : <FiVolume2 size={20} />}
                                        <span className="text-xs font-medium">{ttsState === 'PLAYING' ? 'Parar' : 'Leer Voz'}</span>
                                    </button>
                                </div>

                                {/* Nueva Sección: Temas de Lectura */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Modo de Lectura</h4>
                                    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setReadingTheme('light')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${readingTheme === 'light' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Claro
                                        </button>
                                        <button
                                            onClick={() => setReadingTheme('sepia')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${readingTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Sepia
                                        </button>
                                        <button
                                            onClick={() => setReadingTheme('dark')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${readingTheme === 'dark' ? 'bg-[#1a1a1a] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Oscuro
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Voz del narrador</h4>
                                    <select
                                        className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:border-[#4F6FFF]"
                                        value={voice?.name || ''}
                                        onChange={(e) => {
                                            const selected = voices.find(v => v.name === e.target.value);
                                            if (selected) setVoice(selected);
                                        }}
                                    >
                                        {voices.map(v => (
                                            <option key={v.name} value={v.name}>
                                                {v.name.slice(0, 25)}... ({v.lang})
                                            </option>
                                        ))}
                                    </select>
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

