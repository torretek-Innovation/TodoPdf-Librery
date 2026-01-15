'use client';

import { FiHome, FiGrid, FiStar, FiClock, FiSettings, FiCompass, FiFile, FiFolder, FiTrash2, FiMenu } from 'react-icons/fi';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const menuItems = [
        { id: 'home', label: 'Inicio', icon: FiHome },
        { id: 'pdfs', label: 'Libros', icon: FiFile },
        { id: 'explore', label: 'Explorar', icon: FiCompass },
        { id: 'favorites', label: 'Favoritos', icon: FiStar },
        { id: 'folders', label: 'Carpetas', icon: FiFolder },
        { id: 'trash', label: 'Papelera', icon: FiTrash2 },
    ];

    return (
        <aside className="w-20 bg-white/80 backdrop-blur-md border-r border-white/20 flex flex-col items-center py-6 shadow-lg">
            {/* Logo */}
            <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-lg">
                    <FiMenu size={24} className="text-white" />
                </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 flex flex-col items-center gap-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-br from-[#4F6FFF] to-[#3D5AE6] text-white shadow-lg shadow-blue-500/30'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#4F6FFF]'
                                }`}
                            title={item.label}
                        >
                            <Icon size={20} />

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </nav>

            {/* Settings */}
            <div className="mt-auto">
                <button
                    className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#4F6FFF] flex items-center justify-center transition-all duration-300 group relative"
                    title="Configuración"
                >
                    <FiSettings size={20} />

                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        Configuración
                    </div>
                </button>
            </div>
        </aside>
    );
}