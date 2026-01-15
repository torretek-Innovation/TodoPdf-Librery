'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiExternalLink, FiDownload, FiAlertCircle, FiLoader, FiTrash2, FiUpload, FiPlus, FiBookOpen, FiX, FiArrowLeft } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { useToast } from '../providers/ToastProvider';
import CreateJSONModal from './CreateJSONModal';

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

export default function ExploreView() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<IndexFile | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<ExplorePDF | null>(null);
    const [savedLibraries, setSavedLibraries] = useState<SavedLibrary[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    // Load saved libraries from database
    useEffect(() => {
        loadSavedLibraries();
    }, []);

    const loadSavedLibraries = async () => {
        try {
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
        setIsImporting(true);
        try {
            const token = localStorage.getItem('token');
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
        } catch (err: any) {
            showToast(err.message || 'Error al importar', 'error');
        } finally {
            setIsImporting(false);
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
                            className="p-2 hover:bg-white/80 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                        >
                            <FiArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Explorar Bibliotecas</h2>
                        <p className="text-gray-600">
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Pega el link del archivo pdf-index.json..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => handleLoad()}
                        disabled={isLoading || !url}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
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
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                        <FiAlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>

            {/* Saved Libraries */}
            {savedLibraries.length > 0 && !data && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Bibliotecas Guardadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedLibraries.map((lib) => (
                            <div
                                key={lib.id}
                                className={`bg-white p-4 rounded-xl border transition-all group cursor-pointer ${lib.id === -1
                                    ? 'border-blue-300 bg-blue-50/30'
                                    : 'border-gray-200 hover:border-purple-300'
                                    }`}
                                onClick={() => handleLoad(lib.url, lib.content)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800">{lib.name}</h4>
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
                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
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
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{data.title || 'Colección'}</h3>
                                {data.description && <p className="text-gray-600 mt-1">{data.description}</p>}
                                {data.version && <span className="text-xs text-gray-500 mt-1 block">v{data.version}</span>}
                            </div>
                            {data.updatedAt && (
                                <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                                    Actualizado: {new Date(data.updatedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {data.owner && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                                <span className="font-medium">Por: {data.owner}</span>
                                {data.source && <span className="text-gray-300">•</span>}
                                {data.source && <span>{data.source}</span>}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {data.pdfs.map((pdf) => (
                            <div
                                key={pdf.id}
                                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:border-purple-200 transition-all group flex flex-col h-full"
                            >
                                <div
                                    className="aspect-[3/4] bg-gray-100 rounded-xl mb-4 overflow-hidden relative"
                                >
                                    {pdf.image_path ? (
                                        <img src={pdf.image_path} alt={pdf.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <FiExternalLink size={48} />
                                        </div>
                                    )}
                                </div>

                                <h4 className="font-bold text-gray-800 truncate mb-1" title={pdf.name}>{pdf.name}</h4>

                                {pdf.description && (
                                    <p className="text-xs text-gray-500 mb-2 line-clamp-2 flex-1">{pdf.description}</p>
                                )}

                                <div className="flex flex-wrap gap-1 mb-3">
                                    {pdf.category && (
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                            {pdf.category}
                                        </span>
                                    )}
                                    {pdf.tags?.slice(0, 2).map((tag, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => handleImportToLibrary(pdf)}
                                        disabled={isImporting}
                                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <FiBookOpen size={14} /> Agregar
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPDF(pdf)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors"
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

// Create JSON View Component
function CreateJSONView({ onBack }: { onBack: () => void }) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        owner: '',
        source: 'google-drive',
        visibility: 'public',
        version: '1.0.0'
    });
    const [pdfs, setPdfs] = useState<Partial<ExplorePDF>[]>([]);

    const addPDF = () => {
        setPdfs([...pdfs, {
            id: `pdf-${Date.now()}`,
            name: '',
            description: '',
            url: '',
            image_path: '',
            category: '',
            tags: []
        }]);
    };

    const updatePDF = (index: number, field: string, value: any) => {
        const updated = [...pdfs];
        updated[index] = { ...updated[index], [field]: value };
        setPdfs(updated);
    };

    const removePDF = (index: number) => {
        setPdfs(pdfs.filter((_, i) => i !== index));
    };

    const handleDownload = () => {
        const jsonData = {
            ...formData,
            updatedAt: new Date().toISOString(),
            pdfs: pdfs.filter(pdf => pdf.name && pdf.url)
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.title.replace(/[^a-z0-9]/gi, '_') || 'biblioteca'}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Archivo JSON descargado exitosamente', 'success');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <FiX size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Crear Diccionario de PDFs</h2>
                    <p className="text-gray-600 text-sm">Crea tu propio índice JSON para compartir</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título de la Biblioteca *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Mi Biblioteca de PDFs"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Propietario
                        </label>
                        <input
                            type="text"
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            rows={3}
                            placeholder="Describe tu colección de documentos..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Versión
                        </label>
                        <input
                            type="text"
                            value={formData.version}
                            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">PDFs ({pdfs.length})</h3>
                    <button
                        onClick={addPDF}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                        <FiPlus /> Agregar PDF
                    </button>
                </div>

                {pdfs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>No hay PDFs agregados. Haz clic en "Agregar PDF" para comenzar.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pdfs.map((pdf, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-medium text-gray-700">PDF #{index + 1}</span>
                                    <button
                                        onClick={() => removePDF(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Nombre del PDF *</label>
                                        <input
                                            type="text"
                                            value={pdf.name || ''}
                                            onChange={(e) => updatePDF(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="JavaScript Básico"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">ID único</label>
                                        <input
                                            type="text"
                                            value={pdf.id || ''}
                                            onChange={(e) => updatePDF(index, 'id', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="js-basico"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">URL de Google Drive *</label>
                                        <input
                                            type="text"
                                            value={pdf.url || ''}
                                            onChange={(e) => updatePDF(index, 'url', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="https://drive.google.com/file/d/FILE_ID/view"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">URL de Imagen (Portada)</label>
                                        <input
                                            type="text"
                                            value={pdf.image_path || ''}
                                            onChange={(e) => updatePDF(index, 'image_path', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="https://drive.google.com/uc?export=view&id=IMAGE_ID"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Categoría</label>
                                        <input
                                            type="text"
                                            value={pdf.category || ''}
                                            onChange={(e) => updatePDF(index, 'category', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="Programación"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Tags (separados por coma)</label>
                                        <input
                                            type="text"
                                            value={pdf.tags?.join(', ') || ''}
                                            onChange={(e) => updatePDF(index, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="javascript, frontend, basico"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">Descripción</label>
                                        <textarea
                                            value={pdf.description || ''}
                                            onChange={(e) => updatePDF(index, 'description', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            rows={2}
                                            placeholder="Breve descripción del contenido..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleDownload}
                    disabled={!formData.title || pdfs.filter(p => p.name && p.url).length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                    <FiDownload /> Descargar JSON
                </button>
            </div>
        </div>
    );
}
