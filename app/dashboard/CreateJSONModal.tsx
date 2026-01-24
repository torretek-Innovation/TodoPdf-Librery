'use client';

import { useRef, useState } from 'react';
import { FiX, FiPlus, FiTrash2, FiDownload, FiInfo, FiUpload, FiRefreshCw, FiLink } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';

interface ExplorePDF {
    id: string;
    name: string;
    url: string;
    description?: string;
    image_path?: string;
    category?: string;
    tags?: string[];
}

export default function CreateJSONModal({ onClose }: { onClose: () => void }) {
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
    const [driveUrl, setDriveUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScanDrive = async () => {
        if (!driveUrl) return;
        setIsScanning(true);

        try {
            const response = await fetch('/api/automation/scan-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderUrl: driveUrl })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al escanear carpeta');
            }

            if (data.pdfs && Array.isArray(data.pdfs)) {
                // Merge new PDFs with existing ones (or replace if existing list is empty/user prefers)
                // Here we append new ones
                setPdfs(prev => [...prev, ...data.pdfs]);

                // Update metadata if empty
                setFormData(prev => ({
                    ...prev,
                    title: prev.title || data.title || '',
                    description: prev.description || data.description || '',
                    owner: prev.owner || data.owner || ''
                }));

                showToast(`¡Escaneo completado! Se encontraron ${data.pdfs.length} libros.`, 'success');
            } else {
                showToast('No se encontraron PDFs en la respuesta', 'warning');
            }

        } catch (error: any) {
            console.error('Scan error:', error);
            showToast(error.message, 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (!Array.isArray(json.pdfs)) {
                throw new Error('Formato de JSON inválido: falta el arreglo "pdfs"');
            }

            setFormData({
                title: json.title || '',
                description: json.description || '',
                owner: json.owner || '',
                source: json.source || 'google-drive',
                visibility: json.visibility || 'public',
                version: json.version || '1.0.0'
            });

            setPdfs(json.pdfs);
            showToast('JSON cargado para editar', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al leer el archivo JSON', 'error');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1A1D2E] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Crear Diccionario de PDFs</h2>
                            <p className="text-purple-100 text-sm">Crea tu propio índice JSON para compartir con otros</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                title="Importar JSON existente"
                            >
                                <FiUpload size={18} /> <span className="hidden sm:inline">Importar JSON</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <FiX size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info General */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-5 rounded-2xl border border-purple-100 dark:border-purple-500/10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                <FiInfo className="text-white" size={18} />
                            </div>
                            <h3 className="font-bold text-gray-800">Información General</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Título de la Biblioteca <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                                    placeholder="Mi Biblioteca de PDFs"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Propietario</label>
                                <input
                                    type="text"
                                    value={formData.owner}
                                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Tu nombre"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Versión</label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="1.0.0"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Describe tu colección de documentos..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Automation Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <FiRefreshCw className="text-white" size={18} />
                            </div>
                            <h3 className="font-bold text-gray-800">Automatización</h3>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    URL de Carpeta de Google Drive (Pública)
                                </label>
                                <div className="relative">
                                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={driveUrl}
                                        onChange={(e) => setDriveUrl(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleScanDrive}
                                disabled={isScanning || !driveUrl}
                                className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 min-w-[140px]"
                            >
                                {isScanning ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Escanear...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiRefreshCw /> Escanear
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-blue-600/70 mt-3 ml-1">
                            * El escaneo buscará PDFs y portadas automáticamente. Este proceso puede tomar varios segundos.
                        </p>
                    </div>

                    {/* PDFs Section */}
                    <div className="bg-white dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                PDFs <span className="text-sm font-normal text-gray-500">({pdfs.length})</span>
                            </h3>
                            <button
                                onClick={addPDF}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg text-white rounded-lg text-sm flex items-center gap-2 transition-all"
                            >
                                <FiPlus /> Agregar PDF
                            </button>
                        </div>

                        {pdfs.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-sm">No hay PDFs agregados. Haz clic en "Agregar PDF" para comenzar.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {pdfs.map((pdf, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-purple-200 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-semibold text-purple-600">PDF #{index + 1}</span>
                                            <button
                                                onClick={() => removePDF(index)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre *</label>
                                                <input
                                                    type="text"
                                                    value={pdf.name || ''}
                                                    onChange={(e) => updatePDF(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1A1D2E] border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                                                    placeholder="JavaScript Básico"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">URL de Google Drive *</label>
                                                <input
                                                    type="text"
                                                    value={pdf.url || ''}
                                                    onChange={(e) => updatePDF(index, 'url', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1A1D2E] border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                                                    placeholder="https://drive.google.com/file/d/..."
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">URL de Imagen (Portada)</label>
                                                <input
                                                    type="text"
                                                    value={pdf.image_path || ''}
                                                    onChange={(e) => updatePDF(index, 'image_path', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                    placeholder="https://drive.google.com/uc?export=view&id=IMAGE_ID"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del PDF</label>
                                                <textarea
                                                    value={pdf.description || ''}
                                                    onChange={(e) => updatePDF(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                                    rows={2}
                                                    placeholder="Breve descripción del documento..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                                                <input
                                                    type="text"
                                                    value={pdf.category || ''}
                                                    onChange={(e) => updatePDF(index, 'category', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                    placeholder="Programación"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Tags (separados por coma)</label>
                                                <input
                                                    type="text"
                                                    value={pdf.tags?.join(', ') || ''}
                                                    onChange={(e) => updatePDF(index, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                    placeholder="javascript, frontend"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50 dark:bg-[#1e293b]">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!formData.title || pdfs.filter(p => p.name && p.url).length === 0}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2"
                        >
                            <FiDownload /> Descargar JSON
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
