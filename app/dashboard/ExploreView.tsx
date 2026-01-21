'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiSearch, FiExternalLink, FiDownload, FiAlertCircle, FiLoader, FiTrash2, FiUpload, FiPlus, FiBookOpen, FiX, FiArrowLeft } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { useToast } from '../providers/ToastProvider';
import CreateJSONModal from './CreateJSONModal';
import PDFFilterNav from './PDFFilterNav';
import { getToken } from '../lib/auth-utils';

const PDFViewer = dynamic(() => import('./PDFViewer'), { ssr: false });

interface ExplorePDF {
    id: string;
    name: string;
    url: string;
    description?: string;
    image_path?: string;
    category?: string;
    tags?: string[];
}

interface IndexFile {
    title: string;
    description?: string;
    owner?: string;
    source?: string;
    visibility?: string;
    version?: string;
    updatedAt?: string;
    pdfs: ExplorePDF[];
}

interface SavedLibrary {
    id: number;
    name: string;
    type: string;
    url?: string;
    content: string;
    createdAt: string;
}

export default function ExploreView({ onPdfAdded }: { onPdfAdded?: () => void }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<IndexFile | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<ExplorePDF | null>(null);
    const [savedLibraries, setSavedLibraries] = useState<SavedLibrary[]>([]);
    const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Local Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name_asc');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Derived State for Filters
    const availableCategories = useMemo(() => {
        if (!data?.pdfs) return [];
        return Array.from(new Set(data.pdfs.map(p => p.category).filter(Boolean) as string[])).sort();
    }, [data]);

    const availableTags = useMemo(() => {
        if (!data?.pdfs) return [];

        // Use a map to store the 'display' version of a tag, keyed by lowercase version
        // This ensures case-insensitive deduplication but nice display
        const tagMap = new Map<string, string>();

        data.pdfs.forEach(pdf => {
            // If a category is selected, only show tags from that category
            if (filterCategory && pdf.category !== filterCategory) return;

            const processTag = (t: string) => {
                if (!t || typeof t !== 'string') return;
                const cleanTag = t.trim();
                if (!cleanTag) return;

                const lower = cleanTag.toLowerCase();
                if (!tagMap.has(lower)) {
                    tagMap.set(lower, cleanTag); // First one wins for display casing
                }
            };

            if (Array.isArray(pdf.tags)) {
                pdf.tags.forEach(processTag);
            } else if (typeof pdf.tags === 'string') {
                (pdf.tags as string).split(',').forEach(processTag);
            }
        });

        return Array.from(tagMap.values()).sort((a, b) => a.localeCompare(b));
    }, [data, filterCategory]);

    // Load saved libraries from database
    useEffect(() => {
        loadSavedLibraries();
    }, []);

    const loadSavedLibraries = async () => {
        try {
            const token = getToken();
            if (!token) {
                setSavedLibraries([]);
                return;
            }

            const res = await fetch('/api/external-libraries', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                setSavedLibraries([]);
                return;
            }

            const result = await res.json();
            if (result.libraries) {
                setSavedLibraries(result.libraries);
            }
        } catch (err) {
            console.error('Error loading libraries:', err);
            setSavedLibraries([]);
        }
    };

    const getDriveFileId = (inputUrl: string) => {
        const regex = /[-\w]{25,}/;
        const match = inputUrl.match(regex);
        return match ? match[0] : null;
    };

    const handleLoad = async (sourceUrl?: string, sourceContent?: string) => {
        const targetUrl = sourceUrl || url;
        if (!targetUrl.trim() && !sourceContent) return;

        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            let jsonData;

            if (sourceContent) {
                jsonData = JSON.parse(sourceContent);
            } else {
                let fetchUrl = targetUrl;
                const fileId = getDriveFileId(targetUrl);

                if (fileId && (targetUrl.includes('drive.google.com') || targetUrl.includes('docs.google.com'))) {
                    fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                }

                const response = await fetch(`/api/proxy?url=${encodeURIComponent(fetchUrl)}`);

                if (!response.ok) {
                    throw new Error('No se pudo acceder al archivo. Asegúrate de que el link sea público.');
                }

                jsonData = await response.json();
            }

            if (!jsonData.pdfs || !Array.isArray(jsonData.pdfs)) {
                throw new Error('El archivo no tiene el formato correcto (falta el arreglo "pdfs").');
            }

            setData(jsonData);

            // Save to database if it's a new load (not from saved libraries and not system library)
            // System library has special URL
            const isSystemLibrary = targetUrl.includes('1811m-SfCwbzjvHeE66W82K8_zvxelQgF');
            if (!sourceContent && !isSystemLibrary) {
                await saveLibrary(jsonData.title || 'Biblioteca sin nombre', targetUrl, jsonData);
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar el índice.');
            showToast(err.message || 'Error al cargar el índice', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const saveLibrary = async (name: string, url: string, content: any) => {
        try {
            const token = getToken();
            const res = await fetch('/api/external-libraries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    url,
                    content: JSON.stringify(content),
                    type: 'LINK'
                })
            });

            if (res.ok) {
                await loadSavedLibraries(); // Reload from database
            }
        } catch (err) {
            console.error('Error saving library:', err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);

            if (!jsonData.pdfs || !Array.isArray(jsonData.pdfs)) {
                throw new Error('El archivo no tiene el formato correcto.');
            }

            setData(jsonData);

            // Save to database
            const token = getToken();
            await fetch('/api/external-libraries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: jsonData.title || file.name,
                    content: text,
                    type: 'FILE'
                })
            });

            await loadSavedLibraries();
            showToast('Biblioteca cargada exitosamente', 'success');
        } catch (err: any) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteLibrary = async (id: number) => {
        if (!confirm('¿Eliminar esta biblioteca?')) return;

        try {
            const token = getToken();
            await fetch(`/api/external-libraries/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadSavedLibraries(); // Reload from database
            if (data && savedLibraries.find(lib => lib.id === id)) {
                setData(null);
            }
            showToast('Biblioteca eliminada', 'success');
        } catch (err) {
            showToast('Error al eliminar', 'error');
        }
    };

    const handleImportToLibrary = async (pdf: ExplorePDF) => {
        setImportingIds(prev => new Set(Array.from(prev).concat(pdf.id)));
        try {
            const token = getToken();
            const res = await fetch('/api/external-libraries/import-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: pdf.name,
                    url: pdf.url,
                    category: pdf.category,
                    coverImage: pdf.image_path
                })
            });

            if (!res.ok) throw new Error('Error al importar');

            showToast(`✅ "${pdf.name}" se agregó a tu biblioteca`, 'success');
            if (onPdfAdded) onPdfAdded();
        } catch (err: any) {
            showToast(err.message || 'Error al importar', 'error');
        } finally {
            setImportingIds(prev => {
                const newSet = new Set(Array.from(prev));
                newSet.delete(pdf.id);
                return newSet;
            });
        }
    };

    const handleDownloadPDF = (pdf: ExplorePDF) => {
        const fileIdMatch = pdf.url.match(/\/d\/(.*?)\//);
        if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            window.open(downloadUrl, '_blank');
        } else {
            showToast('No se pudo obtener el enlace de descarga', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto min-h-[80vh]">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {data && (
                        <button
                            onClick={() => {
                                setData(null);
                                setSelectedPdf(null);
                            }}
                            className="p-2 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                        >
                            <FiArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Explorar Bibliotecas</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {data ? `Viendo: ${data.title}` : 'Carga índices JSON desde Google Drive o archivos locales'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <FiPlus /> Crear Diccionario
                </button>
            </div>

            {/* Input Section */}
            <div className="bg-white dark:bg-[#1A1D2E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 mb-8">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Pega el link del archivo pdf-index.json..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#11131E] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all dark:text-white dark:placeholder-gray-500"
                        />
                    </div>
                    <button
                        onClick={() => handleLoad()}
                        disabled={isLoading || !url}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        {isLoading ? <FiLoader className="animate-spin" /> : 'Cargar'}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        <FiUpload /> Subir Archivo
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm">
                        <FiAlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>

            {/* Saved Libraries */}
            {savedLibraries.length > 0 && !data && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Bibliotecas Guardadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedLibraries.map((lib) => (
                            <div
                                key={lib.id}
                                className={`bg-white dark:bg-[#1A1D2E] p-4 rounded-xl border transition-all group cursor-pointer ${lib.id === -1
                                    ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/10 dark:border-blue-700/30'
                                    : 'border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/50'
                                    }`}
                                onClick={() => handleLoad(lib.url, lib.content)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{lib.name}</h4>
                                        {lib.id === -1 && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                                SISTEMA
                                            </span>
                                        )}
                                    </div>
                                    {lib.id !== -1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteLibrary(lib.id);
                                            }}
                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {lib.id === -1 ? 'Biblioteca del Sistema' : lib.type === 'LINK' ? 'Desde URL' : 'Archivo local'} • {new Date(lib.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {data && (
                <div className="animate-fade-in">
                    {/* Header Info */}
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-500/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{data.title || 'Colección'}</h3>
                                {data.description && <p className="text-gray-600 dark:text-gray-300 mt-1">{data.description}</p>}
                                {data.version && <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">v{data.version}</span>}
                            </div>
                            {data.updatedAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1A1D2E] px-3 py-1 rounded-full border border-gray-200 dark:border-white/10">
                                    Actualizado: {new Date(data.updatedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {data.owner && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Por: {data.owner}</span>
                                {data.source && <span className="text-gray-300 dark:text-gray-600">•</span>}
                                {data.source && <span>{data.source}</span>}
                            </div>
                        )}
                    </div>

                    {/* Filter Nav */}
                    <PDFFilterNav
                        categories={availableCategories}
                        selectedCategory={filterCategory}
                        onSelectCategory={(cat) => {
                            setFilterCategory(cat);
                            setFilterTag(null);
                        }}
                        tags={availableTags}
                        selectedTag={filterTag}
                        onSelectTag={setFilterTag}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        customSortOptions={[
                            { value: 'name_asc', label: 'Nombre (A-Z)' },
                            { value: 'name_desc', label: 'Nombre (Z-A)' },
                        ]}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {data.pdfs
                            .filter(pdf => {
                                // Search (basic text search)
                                if (searchTerm) {
                                    const term = searchTerm.toLowerCase();
                                    const matchesName = pdf.name.toLowerCase().includes(term);
                                    const matchesCat = pdf.category?.toLowerCase().includes(term);
                                    const matchesTags = pdf.tags?.some(tag => tag.toLowerCase().includes(term));
                                    if (!matchesName && !matchesCat && !matchesTags) return false;
                                }

                                // Category Filter
                                if (filterCategory && pdf.category !== filterCategory) return false;

                                // Tag Filter
                                if (filterTag) {
                                    const lowerFilter = filterTag.toLowerCase();
                                    const hasTag = Array.isArray(pdf.tags)
                                        ? pdf.tags.some(t => t?.toLowerCase().trim() === lowerFilter)
                                        : (typeof pdf.tags === 'string' && (pdf.tags as string).toLowerCase().split(',').map(t => t.trim()).includes(lowerFilter));

                                    if (!hasTag) return false;
                                }

                                return true;
                            })
                            .sort((a, b) => {
                                if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
                                return a.name.localeCompare(b.name);
                            })
                            .map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className="bg-white dark:bg-[#1A1D2E] rounded-2xl border border-gray-100 dark:border-white/10 p-4 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-500/30 transition-all group flex flex-col h-full"
                                >
                                    <div
                                        className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 overflow-hidden relative"
                                    >
                                        {pdf.image_path ? (
                                            <img src={pdf.image_path} alt={pdf.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <FiExternalLink size={48} />
                                            </div>
                                        )}
                                    </div>

                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate mb-1" title={pdf.name}>{pdf.name}</h4>

                                    {pdf.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 flex-1">{pdf.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {pdf.category && (
                                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                                                {pdf.category}
                                            </span>
                                        )}
                                        {pdf.tags?.slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-full">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        <button
                                            onClick={() => handleImportToLibrary(pdf)}
                                            disabled={importingIds.has(pdf.id)}
                                            className={`flex-1 px-3 py-2 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${importingIds.has(pdf.id) ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                                                }`}
                                        >
                                            {importingIds.has(pdf.id) ? (
                                                <>
                                                    <FiLoader className="animate-spin" size={14} /> Agregando...
                                                </>
                                            ) : (
                                                <>
                                                    <FiBookOpen size={14} /> Agregar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPDF(pdf)}
                                            className="px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs rounded-lg transition-colors"
                                        >
                                            <FiDownload size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {!data && !isLoading && !error && savedLibraries.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <FiExternalLink size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No hay bibliotecas cargadas</p>
                    <p className="text-sm">Ingresa un link o sube un archivo JSON para comenzar</p>
                </div>
            )}

            {/* Create JSON Modal */}
            {showCreateModal && (
                <CreateJSONModal onClose={() => setShowCreateModal(false)} />
            )}
        </div>
    );
}
