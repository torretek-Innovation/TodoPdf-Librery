'use client';

import { useState } from 'react';
import { FiX, FiFolder } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateFolderModal({ isOpen, onClose, onSuccess }: CreateFolderModalProps) {
    const [folderName, setFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!folderName.trim()) {
            showToast('Ingresa un nombre para la carpeta', 'error');
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ folderName: folderName.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear carpeta');
            }

            showToast(`Carpeta "${folderName}" creada exitosamente`, 'success');
            setFolderName('');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al crear carpeta', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1A1D2E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiFolder size={20} />
                        </div>
                        <h2 className="text-xl font-bold">Nueva Carpeta</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre de la carpeta
                    </label>
                    <input
                        type="text"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                        placeholder="Ej: Documentos Importantes"
                        className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 dark:bg-white/5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all dark:text-white"
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        La carpeta se creará vacía. Puedes agregar archivos después.
                    </p>
                </div>

                <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50 dark:bg-[#1e293b] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!folderName.trim() || isCreating}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                    >
                        {isCreating ? 'Creando...' : 'Crear Carpeta'}
                    </button>
                </div>
            </div>
        </div>
    );
}
