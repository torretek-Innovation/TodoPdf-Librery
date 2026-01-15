'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FiFolder, FiArrowLeft, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Sidebar from './Sidebar';
import Header from './Header';
import PDFCard from './PDFCard';
import PDFDetailsModal from './PDFDetailsModal';
import StatsView from './StatsView';
import ExploreView from './ExploreView';
import MovePDFsModal from './MovePDFsModal';
import CreateFolderModal from './CreateFolderModal';
import RenameFolderModal from './RenameFolderModal';
import PDFFilterNav from './PDFFilterNav';
import { useToast } from '../providers/ToastProvider';

// Importar PDFViewer solo en el cliente para evitar errores de SSR
const PDFViewer = dynamic(() => import('./PDFViewer'), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="text-white mt-4">Cargando visor...</p>
            </div>
        </div>
    ),
});

interface DashboardProps {
    userName: string;
}

interface PDF {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    uploadDate: string;
    size: number;
    totalPages?: number;
    coverImage?: string;
    category?: string;
    folderName?: string;
    isFavorite?: boolean;
    readingProgress?: number;
}

export default function Dashboard({ userName }: DashboardProps) {
    const [activeTab, setActiveTab] = useState('home');
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [allPdfs, setAllPdfs] = useState<PDF[]>([]); // Include placeholders for folder counting
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [showMovePDFsModal, setShowMovePDFsModal] = useState(false);
    const [selectedFolderForMove, setSelectedFolderForMove] = useState<string>('');
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const { showToast } = useToast();

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    const [detailPdf, setDeatilspdf] = useState<PDF | null>(null);


    //eliminar pdf
    const handleDeletePdf = async (pdfId: string) => {
        const confirmDelete = confirm('¿Estás seguro de que deseas eliminar este PDF?');
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/pdfs/${pdfId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                // Eliminar del estado local
                setPdfs(prevPdfs => prevPdfs.filter(pdf => pdf.id !== pdfId));

                // Cerrar visor si el PDF eliminado estaba abierto
                if (selectedPdf?.id === pdfId) {
                    handleClosePdf();
                }
                showToast('Libro eliminado correctamente', 'success');
            } else {
                const error = await response.json();
                console.error('Error eliminando PDF:', error);
                showToast(error.message || 'No se pudo eliminar el PDF', 'error');
            }
        } catch (error) {
            console.error('Error eliminando PDF:', error);
            showToast('Error de conexión al eliminar', 'error');
        }
    };


    // Estados para el visor de PDF
    const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    // Función para cargar PDFs desde el servidor
    const loadPDFs = async () => {
        try {
            const response = await fetch('/api/pdfs', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const allData = data.pdfs || [];
                setAllPdfs(allData); // Store all including placeholders
                // Filter out folder placeholders for display
                const realPdfs = allData.filter((pdf: PDF) => pdf.title !== '.folder_placeholder');
                setPdfs(realPdfs);
            }
        } catch (error) {
            console.error('Error cargando PDFs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar PDFs al montar el componente
    useEffect(() => {
        loadPDFs();
    }, []);

    // Callback para cuando se sube un nuevo PDF
    const handlePdfUploaded = (newPdf: PDF) => {
        setPdfs(prevPdfs => [...prevPdfs, newPdf]);
    };

    // Función para actualizar un PDF
    const handleUpdatePdf = async (pdfId: string, updatedData: Partial<PDF>) => {
        try {
            console.log('Enviando actualización a API:', { pdfId, updatedData });

            const response = await fetch(`/api/pdfs/${pdfId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedData)
            });

            console.log('Respuesta de la API:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('Datos recibidos:', data);

                // Actualizar el estado local
                setPdfs(prevPdfs =>
                    prevPdfs.map(pdf =>
                        pdf.id === pdfId
                            ? { ...pdf, ...updatedData }
                            : pdf
                    )
                );
                return true;
            } else {
                const errorData = await response.json();
                console.error('Error de la API:', errorData);
                return false;
            }
        } catch (error) {
            console.error('Error actualizando PDF:', error);
            return false;
        }
    };

    // Función para abrir el visor de PDF
    const handleOpenPdf = (pdf: PDF) => {
        setSelectedPdf(pdf);
        setIsViewerOpen(true);
    };

    // Función para cerrar el visor
    const handleClosePdf = () => {
        setIsViewerOpen(false);
        setTimeout(() => {
            setSelectedPdf(null);
            loadPDFs(); // Recargar lista para actualizar progreso
        }, 300);
    };

    // Función para formatear el tamaño del archivo
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Función para formatear la fecha
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
        return date.toLocaleDateString('es-ES');
    };

    const toggleFavorite = async (id: string) => {
        try {
            const res = await fetch(`/api/pdfs/${id}/favorite`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                setPdfs(prev => prev.map(pdf =>
                    pdf.id === id ? { ...pdf, isFavorite: data.isFavorite } : pdf
                ));
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleDeleteFolder = async (folderName: string) => {
        if (!confirm(`¿Eliminar la carpeta "${folderName}" y todos sus archivos?`)) return;

        try {
            const res = await fetch(`/api/folders/${encodeURIComponent(folderName)}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Error al eliminar carpeta');

            showToast(`Carpeta "${folderName}" eliminada`, 'success');
            loadPDFs(); // Reload PDFs
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar carpeta', 'error');
        }
    };

    // Filter Logic Helper
    const getFilteredAndSortedPDFs = () => {
        let filtered = pdfs.filter(pdf => {
            // Tab filtering
            if (activeTab === 'favorites' && !pdf.isFavorite) return false;
            if (activeTab === 'folders') {
                if (selectedCategory) {
                    if (pdf.folderName !== selectedCategory) return false;
                } else {
                    return false; // Should be handled by folder view
                }
            }

            // Search filtering
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesTitle = pdf.title.toLowerCase().includes(term);
                const matchesCategory = pdf.category?.toLowerCase().includes(term);
                if (!matchesTitle && !matchesCategory) return false;
            }

            // Category filtering
            if (filterCategory && pdf.category !== filterCategory) return false;

            return true;
        });

        // Sorting
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
                case 'oldest':
                    return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
                case 'name_asc':
                    return a.title.localeCompare(b.title);
                case 'name_desc':
                    return b.title.localeCompare(a.title);
                case 'size_desc':
                    return b.size - a.size;
                case 'size_asc':
                    return a.size - b.size;
                default:
                    return 0;
            }
        });
    };

    // Extract unique categories for the current view (ignoring text search to keep options available)
    const getAvailableCategories = () => {
        const relevantPDFs = pdfs.filter(pdf => {
            if (activeTab === 'favorites' && !pdf.isFavorite) return false;
            if (activeTab === 'folders' && selectedCategory && pdf.folderName !== selectedCategory) return false;
            return true;
        });
        const categories = new Set(relevantPDFs.map(p => p.category).filter(Boolean) as string[]);
        return Array.from(categories);
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#E8F0FF] via-[#B8D0FF] to-[#4F6FFF] overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    userName={userName}
                    onPdfUploaded={handlePdfUploaded}
                    onNavigate={(tab) => {
                        setActiveTab(tab);
                        // Reset filters when navigating via header
                        setSelectedCategory(null);
                        setFilterCategory(null);
                    }}
                />


                <main className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'explore' ? (
                        <ExploreView />
                    ) : activeTab === 'home' ? (
                        <StatsView pdfs={pdfs} userName={userName} />
                    ) : (
                        <div className="max-w-7xl mx-auto">
                            <div className="mb-6 flex items-center gap-4">
                                {activeTab === 'folders' && selectedCategory && (
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-600"
                                    >
                                        <FiArrowLeft size={24} />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {activeTab === 'favorites' ? 'Mis Favoritos' :
                                            activeTab === 'folders' ? (selectedCategory || 'Carpetas') :
                                                'Mis Libros'}
                                    </h2>
                                    <p className="text-gray-600 mt-1">
                                        {activeTab === 'favorites'
                                            ? `Tus documentos destacados (${pdfs.filter(p => p.isFavorite).length})`
                                            : activeTab === 'folders' && !selectedCategory
                                                ? 'Explora tus documentos por carpetas'
                                                : `Gestiona y organiza tus documentos`
                                        }
                                    </p>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-20">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F6FFF]"></div>
                                    <p className="text-gray-600 mt-4">Cargando PDFs...</p>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'folders' && !selectedCategory ? (
                                        // VISTA DE CARPETAS CON GESTOR
                                        <div>
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-xl font-bold text-gray-800">Gestor de Carpetas</h3>
                                                <button
                                                    onClick={() => setShowCreateFolderModal(true)}
                                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
                                                >
                                                    <FiPlus /> Nueva Carpeta
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                {Object.entries(allPdfs.reduce((acc, pdf) => {
                                                    const folder = pdf.folderName?.trim();
                                                    if (folder) {
                                                        // Count only real PDFs, not placeholders
                                                        if (pdf.title !== '.folder_placeholder') {
                                                            acc[folder] = (acc[folder] || 0) + 1;
                                                        } else if (!acc[folder]) {
                                                            // If only placeholder exists, show 0
                                                            acc[folder] = 0;
                                                        }
                                                    }
                                                    return acc;
                                                }, {} as Record<string, number>)).map(([folderName, count]) => (
                                                    <div
                                                        key={folderName}
                                                        className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/40 hover:border-[#4F6FFF]/30 hover:shadow-xl hover:shadow-[#4F6FFF]/10 transition-all group flex flex-col items-center justify-center text-center gap-4 animate-fade-in relative"
                                                    >
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingFolder(folderName);
                                                                    setNewFolderName(folderName);
                                                                }}
                                                                className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                                                title="Renombrar"
                                                            >
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFolder(folderName);
                                                                }}
                                                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <div
                                                            onClick={() => setSelectedCategory(folderName)}
                                                            className="w-full cursor-pointer"
                                                        >
                                                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-100 transition-colors relative mx-auto">
                                                                <FiFolder size={32} className="text-[#8B5CF6] fill-[#8B5CF6]/20" />
                                                                <span className="absolute -top-1 -right-1 bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                    {count}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-semibold text-gray-800 mt-3 truncate">{folderName}</h4>
                                                            <p className="text-xs text-gray-500">{count} archivo{count !== 1 ? 's' : ''}</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedFolderForMove(folderName);
                                                                setShowMovePDFsModal(true);
                                                            }}
                                                            className="w-full px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <FiPlus size={12} /> Agregar archivos
                                                        </button>
                                                    </div>
                                                ))}

                                                {Object.keys(allPdfs.reduce((acc, pdf) => {
                                                    if (pdf.folderName) acc[pdf.folderName] = 1;
                                                    return acc;
                                                }, {} as Record<string, number>)).length === 0 && (
                                                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 opacity-60">
                                                            <FiFolder size={64} className="mb-4 text-gray-300" />
                                                            <p className="text-lg font-medium">No hay carpetas importadas</p>
                                                            <p className="text-sm">Usa el botón "Importar Carpeta" para organizar tus archivos.</p>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    ) : (
                                        // VISTA DE LISTA DE PDFs
                                        <>
                                            {(() => {
                                                const filteredPDFs = getFilteredAndSortedPDFs();
                                                const availableCategories = getAvailableCategories();

                                                return (
                                                    <div>
                                                        <PDFFilterNav
                                                            categories={availableCategories}
                                                            selectedCategory={filterCategory}
                                                            onSelectCategory={setFilterCategory}
                                                            searchTerm={searchTerm}
                                                            onSearchChange={setSearchTerm}
                                                            sortBy={sortBy}
                                                            onSortChange={setSortBy}
                                                        />

                                                        {filteredPDFs.length === 0 ? (
                                                            <div className="text-center py-20">
                                                                <div className="text-6xl mb-4">📄</div>
                                                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                                                    No se encontraron documentos
                                                                </h3>
                                                                <p className="text-gray-500">
                                                                    Intenta ajustar los filtros o tu búsqueda
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                                {filteredPDFs.map((pdf) => (
                                                                    <PDFCard
                                                                        key={pdf.id}
                                                                        id={pdf.id}
                                                                        title={pdf.title}
                                                                        size={formatFileSize(pdf.size)}
                                                                        date={formatDate(pdf.uploadDate)}
                                                                        uploadDate={pdf.uploadDate}
                                                                        filePath={pdf.filePath}
                                                                        isFavorite={pdf.isFavorite}
                                                                        category={pdf.category}
                                                                        totalPages={pdf.totalPages}
                                                                        readingProgress={pdf.readingProgress}
                                                                        coverImage={pdf.coverImage}
                                                                        onToggleFavorite={() => toggleFavorite(pdf.id)}
                                                                        onOpen={() => handleOpenPdf(pdf)}
                                                                        onUpdate={(updatedData) => handleUpdatePdf(pdf.id, updatedData)}
                                                                        onDelete={() => handleDeletePdf(pdf.id)}
                                                                        onViewDetails={() => setDeatilspdf(pdf)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div >

            {/* PDF Viewer Modal */}
            {
                selectedPdf && (
                    <PDFViewer
                        isOpen={isViewerOpen}
                        onClose={handleClosePdf}
                        pdfUrl={selectedPdf.filePath}
                        title={selectedPdf.title}
                        pdfId={selectedPdf.id}
                    />
                )
            }

            {/* Modal de Detalles */}
            {
                detailPdf && (
                    <PDFDetailsModal
                        isOpen={!!detailPdf}
                        onClose={() => setDeatilspdf(null)}
                        pdf={{
                            title: detailPdf.title,
                            size: formatFileSize(detailPdf.size),
                            uploadDate: detailPdf.uploadDate,
                            totalPages: detailPdf.totalPages,
                            category: detailPdf.category,
                            readingProgress: detailPdf.readingProgress
                        }}
                    />
                )
            }

            {/* Modal para mover PDFs a carpeta */}
            <MovePDFsModal
                isOpen={showMovePDFsModal}
                onClose={() => setShowMovePDFsModal(false)}
                pdfs={pdfs}
                targetFolder={selectedFolderForMove}
                onSuccess={() => {
                    loadPDFs();
                    setShowMovePDFsModal(false);
                }}
            />

            {/* Modal para crear carpeta */}
            <CreateFolderModal
                isOpen={showCreateFolderModal}
                onClose={() => setShowCreateFolderModal(false)}
                onSuccess={() => {
                    loadPDFs();
                    setShowCreateFolderModal(false);
                }}
            />

            {/* Modal para renombrar carpeta */}
            <RenameFolderModal
                isOpen={!!editingFolder}
                onClose={() => setEditingFolder(null)}
                currentName={editingFolder || ''}
                onSuccess={() => {
                    loadPDFs();
                    setEditingFolder(null);
                }}
            />
        </div >
    );
}
