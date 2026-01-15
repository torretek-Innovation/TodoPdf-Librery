import { FiActivity, FiBook, FiBookOpen, FiClock, FiTrendingUp } from 'react-icons/fi';

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

export default function StatsView({ pdfs, userName }: StatsViewProps) {
    // Calcular estadísticas
    const totalBooks = pdfs.length;
    const completedBooks = pdfs.filter(p => (p.readingProgress || 0) >= 100).length;
    const inProgressBooks = pdfs.filter(p => (p.readingProgress || 0) > 0 && (p.readingProgress || 0) < 100).length;

    // Estimación de tiempo (Heurística: 2 min por página leída)
    // Asumimos que el progreso % representa páginas leídas sobre un promedio de 100 páginas si totalPages no existe
    const totalPagesRead = pdfs.reduce((acc, pdf) => {
        const pages = pdf.totalPages || 100; // Fallback
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
                    Hola, <span className="text-[#4F6FFF]">{userName}</span> 👋
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

            {/* Sección Inferior: Libro Destacado y Gráficos (Placeholder visual) */}
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

                {/* Tarjeta de Motivación */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-4 text-2xl">
                        🏆
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Racha de Lectura</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Has leído durante <strong className="text-gray-800">3 días</strong> seguidos. ¡Mantén el ritmo!
                    </p>
                    <button className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                        Ver logros
                    </button>
                </div>
            </div>
        </div>
    );
}
