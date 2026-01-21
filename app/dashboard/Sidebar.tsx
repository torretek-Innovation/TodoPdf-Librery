'use client';

import { FiHome, FiGrid, FiStar, FiClock, FiSettings, FiCompass, FiFile, FiFolder, FiTrash2, FiMenu } from 'react-icons/fi';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isCollapsed: boolean;
    onToggle: () => void;
    onOpenSettings: () => void;
}

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle, onOpenSettings }: SidebarProps) {
    const menuItems = [
        { id: 'home', label: 'Inicio', icon: FiHome },
        { id: 'pdfs', label: 'Libros', icon: FiFile },
        { id: 'explore', label: 'Explorar', icon: FiCompass },
        { id: 'favorites', label: 'Favoritos', icon: FiStar },
        { id: 'folders', label: 'Carpetas', icon: FiFolder },
        { id: 'trash', label: 'Papelera', icon: FiTrash2 },
    ];

    return (
        <aside
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-md border-r border-white/20 dark:border-white/10 flex flex-col py-6 shadow-lg transition-all duration-300 ease-in-out`}
        >
            {/* Toggle / Logo */}
            <div className={`mb-8 flex ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                <button
                    onClick={onToggle}
                    className="w-12 h-12 bg-gradient-to-br from-[#4F6FFF] to-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                >
                    <FiMenu size={24} className="text-white" />
                </button>
                {!isCollapsed && (
                    <div className="ml-3 flex flex-col justify-center animate-fade-in-left">
                        <span className="font-bold text-gray-800 dark:text-white text-lg leading-tight">TodoPDF</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Gestor Inteligente</span>
                    </div>
                )}
            </div>

            {/* Menu Items */}
            <nav className="flex-1 flex flex-col gap-2 px-3">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`group relative flex items-center p-3 rounded-xl transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-br from-[#4F6FFF] to-[#3D5AE6] text-white shadow-lg shadow-blue-500/30'
                                : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[#4F6FFF] dark:hover:text-white'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <div className={`${isCollapsed ? '' : 'min-w-[24px]'}`}>
                                <Icon size={20} />
                            </div>

                            {!isCollapsed && (
                                <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 animate-fade-in-left">
                                    {item.label}
                                </span>
                            )}

                            {/* Tooltip (Only when collapsed) */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Settings */}
            <div className="mt-auto px-3">
                <button
                    onClick={onOpenSettings}
                    className={`flex items-center p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-[#4F6FFF] dark:hover:text-[#4F6FFF] transition-all duration-300 group relative ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}
                    title={isCollapsed ? "Configuración" : ""}
                >
                    <div className={`${isCollapsed ? '' : 'min-w-[24px]'}`}>
                        <FiSettings size={20} />
                    </div>

                    {!isCollapsed && (
                        <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden animate-fade-in-left">
                            Configuración
                        </span>
                    )}

                    {/* Tooltip */}
                    {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            Configuración
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}