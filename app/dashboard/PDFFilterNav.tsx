import { useState, useRef, useEffect } from 'react';
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
    customSortOptions,
    tags,
    selectedTag,
    onSelectTag
}: PDFFilterNavProps & {
    customSortOptions?: { value: string; label: string }[];
    tags?: string[];
    selectedTag?: string | null;
    onSelectTag?: (tag: string | null) => void;
}) {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isTagOpen, setIsTagOpen] = useState(false);

    const categoryRef = useRef<HTMLDivElement>(null);
    const tagRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
            if (tagRef.current && !tagRef.current.contains(event.target as Node)) {
                setIsTagOpen(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
        <div className="bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-md border border-white/40 dark:border-white/10 sticky top-0 z-50 rounded-2xl p-4 mb-6 shadow-sm animate-fade-in-down">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">

                {/* Search Bar */}
                <div className="relative w-full xl:w-96 group">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F6FFF] transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#4F6FFF]/20 focus:border-[#4F6FFF] outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto overflow-visible pb-2 sm:pb-0">

                    {/* Category Filter Dropdown */}
                    {categories.length > 0 && (
                        <div className="relative w-full sm:min-w-[200px]" ref={categoryRef}>
                            <button
                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                className={`w-full px-4 py-2.5 bg-white dark:bg-white/5 border rounded-xl flex items-center justify-between transition-all text-sm font-medium ${selectedCategory
                                    ? 'border-[#4F6FFF] text-[#4F6FFF] bg-[#E8F0FF]/30 dark:bg-[#4F6FFF]/10'
                                    : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-[#4F6FFF] hover:text-[#4F6FFF]'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <FiFilter size={16} className={selectedCategory ? 'text-[#4F6FFF]' : 'text-gray-400'} />
                                    <span className="truncate">
                                        {selectedCategory || 'Todas las categorías'}
                                    </span>
                                </div>
                                <FiChevronDown className={`transition-transform duration-200 flex-shrink-0 ml-2 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isCategoryOpen && (
                                <div className="absolute top-full mt-2 left-0 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#1A1D2E] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-2 z-[100] animate-fade-in origin-top-left custom-scrollbar">
                                    <div className="p-1">
                                        <button
                                            onClick={() => {
                                                onSelectCategory(null);
                                                setIsCategoryOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors ${selectedCategory === null
                                                ? 'bg-[#E8F0FF] dark:bg-[#4F6FFF]/20 text-[#4F6FFF] font-medium'
                                                : 'text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            Todas las categorías
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    onSelectCategory(cat);
                                                    setIsCategoryOpen(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors ${selectedCategory === cat
                                                    ? 'bg-[#E8F0FF] dark:bg-[#4F6FFF]/20 text-[#4F6FFF] font-medium'
                                                    : 'text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags Filter Dropdown */}
                    {tags && tags.length > 0 && onSelectTag && (
                        <div className="relative w-full sm:min-w-[180px]" ref={tagRef}>
                            <button
                                onClick={() => setIsTagOpen(!isTagOpen)}
                                className={`w-full px-4 py-2.5 bg-white dark:bg-white/5 border rounded-xl flex items-center justify-between transition-all text-sm font-medium ${selectedTag
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50/30'
                                    : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-purple-500 hover:text-purple-500'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <FiFilter size={16} className={selectedTag ? 'text-purple-500' : 'text-gray-400'} />
                                    <span className="truncate">
                                        {selectedTag ? `# ${selectedTag}` : 'Todos los tags'}
                                    </span>
                                </div>
                                <FiChevronDown className={`transition-transform duration-200 flex-shrink-0 ml-2 ${isTagOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTagOpen && (
                                <div className="absolute top-full mt-2 left-0 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#1A1D2E] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-2 z-[100] animate-fade-in origin-top-left custom-scrollbar">
                                    <div className="p-1">
                                        <button
                                            onClick={() => {
                                                onSelectTag(null);
                                                setIsTagOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors ${selectedTag === null
                                                ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium'
                                                : 'text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            Todos los tags
                                        </button>
                                        {tags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    onSelectTag(tag);
                                                    setIsTagOpen(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors ${selectedTag === tag
                                                    ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium'
                                                    : 'text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sort Dropdown */}
                    <div className="relative w-full sm:min-w-[180px]" ref={sortRef}>
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between text-gray-700 dark:text-gray-200 hover:border-[#4F6FFF] hover:text-[#4F6FFF] transition-all text-sm font-medium"
                        >
                            <span className="truncate">
                                {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Ordenar por'}
                            </span>
                            <FiChevronDown className={`transition-transform duration-200 flex-shrink-0 ml-2 ${isSortOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSortOpen && (
                            <div className="absolute top-full mt-2 right-0 w-full bg-white dark:bg-[#1A1D2E] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-fade-in origin-top-right">
                                <div className="p-1">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onSortChange(option.value);
                                                setIsSortOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors ${sortBy === option.value
                                                ? 'bg-[#E8F0FF] dark:bg-[#4F6FFF]/20 text-[#4F6FFF] font-medium'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
