import { useEffect, useState } from 'react';
import { FiActivity, FiBook, FiBookOpen, FiClock, FiTrendingUp, FiAward } from 'react-icons/fi';

interface PDF {
    id: string;
    title: string;
    totalPages?: number;
    readingProgress?: number;
    uploadDate: string;
}

interface StatsViewProps {
    pdfs: PDF[];
    userName: string;
}

interface ReadingStreak {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string | null;
    totalDaysRead: number;
}

export default function StatsView({ pdfs, userName }: StatsViewProps) {
    const [readingStreak, setReadingStreak] = useState<ReadingStreak>({
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        totalDaysRead: 0
    });
    const [isLoadingStreak, setIsLoadingStreak] = useState(true);

    // Fetch reading streak
    useEffect(() => {
        const fetchStreak = async () => {
            try {
                const response = await fetch('/api/user/reading-streak', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setReadingStreak(data);
                }
            } catch (error) {
                console.error('Error fetching reading streak:', error);
            } finally {
                setIsLoadingStreak(false);
            }
        };
        fetchStreak();
    }, []);

    // Calcular estadísticas
    const totalBooks = pdfs.length;
    const completedBooks = pdfs.filter(p => (p.readingProgress || 0) >= 100).length;
    const inProgressBooks = pdfs.filter(p => (p.readingProgress || 0) > 0 && (p.readingProgress || 0) < 100).length;

    // Estimación de tiempo (Heurística: 2 min por página leída)
    const totalPagesRead = pdfs.reduce((acc, pdf) => {
        const pages = pdf.totalPages || 100;
        const progress = pdf.readingProgress || 0;
        return acc + Math.round((pages * progress) / 100);
    }, 0);

    const totalMinutes = totalPagesRead * 2;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Libro más leído (Mayor progreso sin estar al 100% o el último completado)
    const mostRead = [...pdfs].sort((a, b) => (b.readingProgress || 0) - (a.readingProgress || 0))[0];

    // Estilos de tarjetas
    const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl w-fit mb-4 ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
            <p className="text-gray-500 font-medium mb-1">{label}</p>
            {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Bienvenida */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Hola, <span className="text-[#4F6FFF]">{userName.includes('@') ? userName.split('@')[0] : userName}</span> 👋
                </h1>
                <p className="text-gray-500 mt-2">Aquí tienes un resumen de tu actividad de lectura.</p>
            </div>

            {/* Grid de Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={FiClock}
                    label="Tiempo de Lectura"
                    value={`${hours}h ${minutes}m`}
                    subtext="Estimado basado en tu progreso"
                    color="bg-purple-500"
                />
                <StatCard
                    icon={FiBook}
                    label="Libros en tu biblioteca"
                    value={totalBooks}
                    subtext={`${pdfs.reduce((acc, p) => acc + (p.totalPages || 0), 0)} páginas totales`}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={FiActivity}
                    label="En Progreso"
                    value={inProgressBooks}
                    subtext="Libros que estás leyendo actualmente"
                    color="bg-orange-500"
                />
                <StatCard
                    icon={FiTrendingUp}
                    label="Completados"
                    value={completedBooks}
                    subtext="¡Sigue así!"
                    color="bg-green-500"
                />
            </div>

            {/* Sección Inferior: Libro Destacado y Racha */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Libro Destacado */}
                <div className="lg:col-span-2 bg-gradient-to-r from-[#4F6FFF] to-[#3650C9] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-medium text-blue-100 mb-2">Continuar leyendo</h3>
                        {mostRead ? (
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white/20 backdrop-blur-md rounded-xl">
                                    <FiBookOpen size={40} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2 truncate max-w-md">{mostRead.title}</h2>
                                    <div className="flex items-center gap-4">
                                        <div className="h-2 w-48 bg-black/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-white/90"
                                                style={{ width: `${mostRead.readingProgress || 0}%` }}
                                            />
                                        </div>
                                        <span className="font-bold">{mostRead.readingProgress || 0}%</span>
                                    </div>
                                    <p className="mt-2 text-sm text-blue-100">
                                        Última actividad: {new Date(mostRead.uploadDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xl">No tienes libros iniciados.</p>
                        )}
                    </div>
                </div>

                {/* Tarjeta de Racha de Lectura */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 shadow-sm border border-yellow-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/30 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/30 rounded-full -ml-12 -mb-12"></div>

                    <div className="relative z-10 w-full">
                        {isLoadingStreak ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                                <p className="text-gray-500 text-sm">Cargando racha...</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center mb-4 text-3xl mx-auto shadow-lg">
                                    {readingStreak.currentStreak > 0 ? '🔥' : '📚'}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Racha de Lectura</h3>

                                {readingStreak.currentStreak > 0 ? (
                                    <>
                                        <div className="mb-4">
                                            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-1">
                                                {readingStreak.currentStreak}
                                            </p>
                                            <p className="text-gray-600 text-sm font-medium">
                                                {readingStreak.currentStreak === 1 ? 'día' : 'días'} seguidos
                                            </p>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4">
                                            ¡Mantén el ritmo! Has leído {readingStreak.totalDaysRead} {readingStreak.totalDaysRead === 1 ? 'día' : 'días'} en total
                                        </p>
                                        {readingStreak.longestStreak > readingStreak.currentStreak && (
                                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                                                <FiAward size={14} className="text-yellow-600" />
                                                <span>Mejor racha: {readingStreak.longestStreak} días</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-600 text-sm mb-6">
                                            {readingStreak.totalDaysRead > 0
                                                ? 'Comienza a leer hoy para iniciar una nueva racha'
                                                : 'Comienza a leer para iniciar tu racha'}
                                        </p>
                                        {readingStreak.longestStreak > 0 && (
                                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                                                <FiAward size={14} className="text-yellow-600" />
                                                <span>Tu mejor racha: {readingStreak.longestStreak} días</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
