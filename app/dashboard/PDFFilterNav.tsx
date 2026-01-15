import { useState } from 'react';
import { FiSearch, FiFilter, FiChevronDown, FiGrid, FiList } from 'react-icons/fi';

interface PDFFilterNavProps {
    categories: string[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    sortBy: string;
    onSortChange: (sort: string) => void;
    placeholder?: string;
}

export default function PDFFilterNav({
    categories,
    selectedCategory,
    onSelectCategory,
    searchTerm,
    onSearchChange,
    sortBy,
    onSortChange,
    placeholder = "Buscar documentos...",
    customSortOptions
}: PDFFilterNavProps & { customSortOptions?: { value: string; label: string }[] }) {
    const [isSortOpen, setIsSortOpen] = useState(false);

    const defaultSortOptions = [
        { value: 'newest', label: 'Más recientes' },
        { value: 'oldest', label: 'Más antiguos' },
        { value: 'name_asc', label: 'Nombre (A-Z)' },
        { value: 'name_desc', label: 'Nombre (Z-A)' },
        { value: 'size_desc', label: 'Mayor tamaño' },
        { value: 'size_asc', label: 'Menor tamaño' },
    ];

    const sortOptions = customSortOptions || defaultSortOptions;

    return (
        <div className="bg-white/80 backdrop-blur-md border border-white/40 sticky top-0 z-10 rounded-2xl p-4 mb-6 shadow-sm animate-fade-in-down">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Search Bar */}
                <div className="relative w-full md:w-96 group">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF] transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/20 focus:border-[#4F6FFF] outline-none transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">

                    {/* Categories Pill List */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 pr-2 border-r border-gray-200 mr-2">
                            <button
                                onClick={() => onSelectCategory(null)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === null
                                    ? 'bg-[#4F6FFF] text-white shadow-md shadow-[#4F6FFF]/20'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Todos
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => onSelectCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                        ? 'bg-[#4F6FFF] text-white shadow-md shadow-[#4F6FFF]/20'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sort Dropdown */}
                    <div className="relative min-w-[160px]">
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-gray-700 hover:border-[#4F6FFF] hover:text-[#4F6FFF] transition-all text-sm font-medium"
                        >
                            <span className="truncate">
                                {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Ordenar por'}
                            </span>
                            <FiChevronDown className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSortOpen && (
                            <div className="absolute top-full mt-2 right-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in origin-top-right">
                                {sortOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onSortChange(option.value);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${sortBy === option.value
                                            ? 'bg-[#E8F0FF] text-[#4F6FFF] font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
