'use client';

import { useState, useEffect } from 'react';
import { FiX, FiEdit2 } from 'react-icons/fi';
import { useToast } from '../providers/ToastProvider';

interface RenameFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onSuccess: () => void;
}

export default function RenameFolderModal({ isOpen, onClose, currentName, onSuccess }: RenameFolderModalProps) {
    const [newName, setNewName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
        }
    }, [isOpen, currentName]);

    if (!isOpen) return null;

    const handleRename = async () => {
        if (!newName.trim()) {
            showToast('Ingresa un nombre para la carpeta', 'error');
            return;
        }

        if (newName.trim() === currentName) {
            onClose();
            return;
        }

        setIsRenaming(true);
        try {
            const res = await fetch(`/api/folders/${encodeURIComponent(currentName)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName: newName.trim() })
            });

            if (!res.ok) {
                throw new Error('Error al renombrar carpeta');
            }

            showToast(`Carpeta renombrada a "${newName}"`, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al renombrar carpeta', 'error');
        } finally {
            setIsRenaming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiEdit2 size={20} />
                        </div>
                        <h2 className="text-xl font-bold">Renombrar Carpeta</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nuevo nombre
                    </label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                        placeholder="Nombre de la carpeta"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Nombre actual: <span className="font-medium text-gray-700">{currentName}</span>
                    </p>
                </div>

                <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleRename}
                        disabled={!newName.trim() || isRenaming}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                    >
                        {isRenaming ? 'Renombrando...' : 'Renombrar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
