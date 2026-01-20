'use client';

import { useTTS } from '../context/TTSContext';
import { FiPlay, FiPause, FiX, FiVolume2, FiMaximize2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniPlayerProps {
    onRestore?: (pdfId: string, page?: number) => void;
}

export default function MiniPlayer({ onRestore }: MiniPlayerProps) {
    const { state, currentMetadata, isMinimized, pause, resume, stop, setIsMinimized } = useTTS();

    // Only show if minimized and active (playing or paused)
    if (!isMinimized || state === 'IDLE') return null;

    const handleRestore = () => {
        if (currentMetadata.pdfId && onRestore) {
            onRestore(currentMetadata.pdfId, currentMetadata.page);
            setIsMinimized(false); // Maximize (technically hide mini player as viewer opens)
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-[100] w-80 bg-[#1e293b] text-white rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col cursor-pointer hover:border-[#4F6FFF] transition-colors"
                onClick={handleRestore}
            >
                {/* Progress bar (Visual only for now) */}
                <div className="h-1 w-full bg-gray-700">
                    <div className="h-full bg-[#4F6FFF] animate-pulse w-full origin-left" />
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-[#4F6FFF]/20 flex items-center justify-center shrink-0 text-[#4F6FFF]">
                            <div className="relative">
                                <FiVolume2 size={20} />
                                {state === 'PLAYING' && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Leyendo ahora</span>
                            <h4 className="text-sm font-semibold truncate leading-tight">{currentMetadata.title || 'Documento'}</h4>
                        </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={state === 'PLAYING' ? pause : resume}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            {state === 'PLAYING' ? <FiPause size={18} /> : <FiPlay size={18} />}
                        </button>
                        <button
                            onClick={stop}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
