'use client';

import { useState } from 'react';
import { FiX, FiFolder, FiCheck } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';

interface PDF {
    id: string;
    title: string;
    folderName?: string;
}

interface MoveToPDFsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfs: PDF[];
    targetFolder: string;
    onSuccess: () => void;
}

export default function MovePDFsModal({ isOpen, onClose, pdfs, targetFolder, onSuccess }: MoveToPDFsModalProps) {
    const [selectedPdfs, setSelectedPdfs] = useState<string[]>([]);
    const [isMoving, setIsMoving] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    // Filter PDFs not already in target folder
    const availablePdfs = pdfs.filter(pdf => pdf.folderName !== targetFolder);

    const togglePdf = (id: string) => {
        setSelectedPdfs(prev =>
            prev.includes(id) ? prev.filter(pdfId => pdfId !== id) : [...prev, id]
        );
    };

    const handleMove = async () => {
        if (selectedPdfs.length === 0) return;

        setIsMoving(true);
        try {
            const res = await fetch('/api/folders/move-pdfs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    pdfIds: selectedPdfs,
                    folderName: targetFolder
                })
            });

            if (!res.ok) throw new Error('Error al mover archivos');

            showToast(`${selectedPdfs.length} archivo(s) movido(s) a "${targetFolder}"`, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al mover archivos', 'error');
        } finally {
            setIsMoving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Agregar a "{targetFolder}"</h2>
                        <p className="text-sm text-purple-100 mt-1">Selecciona los archivos que deseas mover</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {availablePdfs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FiFolder size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No hay archivos disponibles para mover</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {availablePdfs.map(pdf => (
                                <div
                                    key={pdf.id}
                                    onClick={() => togglePdf(pdf.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPdfs.includes(pdf.id)
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-800">{pdf.title}</h3>
                                            {pdf.folderName && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Carpeta actual: {pdf.folderName}
                                                </p>
                                            )}
                                        </div>
                                        {selectedPdfs.includes(pdf.id) && (
                                            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                                <FiCheck className="text-white" size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        {selectedPdfs.length} archivo(s) seleccionado(s)
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={selectedPdfs.length === 0 || isMoving}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                        >
                            {isMoving ? 'Moviendo...' : 'Mover Archivos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
