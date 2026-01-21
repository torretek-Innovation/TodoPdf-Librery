'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiEdit, FiUpload, FiLink, FiPlus, FiCheck, FiTrash2 } from 'react-icons/fi';

interface EditPDFModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfData: {
        id: string;
        title: string;
        category: string;
        totalPages: number;
        createdAt: string;
        readingProgress: number;
        coverImage?: string;
    };
    onSave: (updatedData: any) => void;
}

export default function EditPDFModal({ isOpen, onClose, pdfData, onSave }: EditPDFModalProps) {
    const [title, setTitle] = useState(pdfData.title);
    const [category, setCategory] = useState(pdfData.category);
    const [coverImage, setCoverImage] = useState(pdfData.coverImage || '');
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Categories Logic
    const [categories, setCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/categories')
                .then(res => res.json())
                .then(data => {
                    if (data.categories) {
                        setCategories(data.categories);
                    }
                })
                .catch(err => console.error('Error loading categories:', err));
        }
    }, [isOpen]);

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            setCategories(prev => [...prev, newCategoryName.trim()]);
            setCategory(newCategoryName.trim());
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        if (!confirm(`¿Eliminar la categoría "${categoryName}"? Los libros asociados quedarán sin categoría.`)) return;

        try {
            const res = await fetch(`/api/categories?name=${encodeURIComponent(categoryName)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setCategories(prev => prev.filter(c => c !== categoryName));
                if (category === categoryName) {
                    setCategory('');
                }
            }
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUrlSubmit = () => {
        if (imageUrl) {
            setCoverImage(imageUrl);
            setImageUrl('');
            setShowImageOptions(false);
        }
    };

    const handleSave = () => {
        onSave({
            title,
            category,
            coverImage,
        });
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-[#1A1D2E] rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Editar documento
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 dark:text-white transition"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10">

                    {/* Cover */}
                    <div>
                        <div className="aspect-[3/4] rounded-2xl border bg-gray-100 dark:bg-white/5 dark:border-white/10 overflow-hidden relative group">
                            {coverImage ? (
                                <img
                                    src={coverImage}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                                    Sin portada
                                </div>
                            )}

                            <button
                                onClick={() => setShowImageOptions(!showImageOptions)}
                                className="absolute bottom-3 right-3 p-2 bg-white dark:bg-[#1A1D2E] rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition"
                            >
                                <FiEdit size={16} />
                            </button>
                        </div>

                        {showImageOptions && (
                            <div className="mt-4 space-y-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-2 bg-[#4F6FFF] text-white rounded-lg text-sm hover:bg-[#3F5FEF]"
                                >
                                    Subir imagen
                                </button>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="URL de imagen"
                                        className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-white/5 dark:border-white/10 dark:text-white outline-none"
                                    />
                                    <button
                                        onClick={handleImageUrlSubmit}
                                        className="px-3 py-2 bg-gray-800 dark:bg-white/20 text-white rounded-lg"
                                    >
                                        <FiLink size={16} />
                                    </button>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>

                    {/* Form */}
                    <div className="space-y-6">

                        {/* Title */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Título
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 dark:bg-white/5 rounded-xl focus:ring-2 focus:ring-[#4F6FFF] outline-none dark:text-white"
                                placeholder="Nombre del PDF"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Categoría
                            </label>

                            {isAddingCategory ? (
                                <div className="flex gap-2 animate-fade-in">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#4F6FFF] dark:bg-white/5 dark:border-white/10 dark:text-white"
                                        placeholder="Nueva categoría..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddCategory();
                                            if (e.key === 'Escape') setIsAddingCategory(false);
                                        }}
                                    />
                                    <button
                                        onClick={handleAddCategory}
                                        className="px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
                                        title="Confirmar"
                                    >
                                        <FiCheck size={20} />
                                    </button>
                                    <button
                                        onClick={() => setIsAddingCategory(false)}
                                        className="px-4 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                                        title="Cancelar"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        {/* Custom Dropdown Trigger */}
                                        <div
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between cursor-pointer bg-white dark:bg-white/5 hover:border-[#4F6FFF] transition-colors"
                                        >
                                            <span className={category ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                                                {category || 'Sin categoría'}
                                            </span>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>

                                        {/* Custom Dropdown Menu */}
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1D2E] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto animate-fade-in custom-scrollbar">
                                                <div
                                                    onClick={() => {
                                                        setCategory('');
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-gray-500 italic border-b border-gray-100"
                                                >
                                                    Sin categoría
                                                </div>
                                                {categories.map((cat) => (
                                                    <div
                                                        key={cat}
                                                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 group"
                                                    >
                                                        <span
                                                            className="flex-1 cursor-pointer dark:text-gray-200"
                                                            onClick={() => {
                                                                setCategory(cat);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                        >
                                                            {cat}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCategory(cat);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Eliminar categoría"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setIsAddingCategory(true);
                                            setNewCategoryName('');
                                        }}
                                        className="px-4 py-3 bg-blue-50 dark:bg-white/5 text-[#4F6FFF] dark:text-[#6366F1] border border-blue-100 dark:border-white/10 rounded-xl hover:bg-blue-100 dark:hover:bg-white/10 transition whitespace-nowrap font-medium flex items-center gap-2"
                                    >
                                        <FiPlus size={18} />
                                        Nueva
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-200 dark:border-white/10 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-10 py-3 bg-[#4F6FFF] text-white rounded-xl font-semibold hover:bg-[#3F5FEF] transition"
                    >
                        Guardar cambios
                    </button>
                </div>

            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}