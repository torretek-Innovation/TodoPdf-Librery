import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiInfo, FiAlertCircle, FiClock, FiTrash2 } from 'react-icons/fi';
import { Notification } from '../providers/ToastProvider';

export type { Notification };

interface NotificationsDropdownProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
    onClose: () => void;
}

export default function NotificationsDropdown({ notifications, onMarkAsRead, onClearAll, onClose }: NotificationsDropdownProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100/50 backdrop-blur-xl z-50 overflow-hidden"
        >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800">Notificaciones</h3>
                <div className="flex gap-2 text-xs">
                    {notifications.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                        >
                            <FiTrash2 /> Limpiar
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <FiX size={16} />
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                    {notifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 text-center text-gray-400 flex flex-col items-center gap-2"
                        >
                            <FiInfo size={32} className="opacity-20" />
                            <p className="text-sm">No tienes notificaciones nuevas</p>
                        </motion.div>
                    ) : (
                        notifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`p-4 border-b border-gray-50 flex gap-3 hover:bg-gray-50 transition-colors relative group ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                onClick={() => onMarkAsRead(notif.id)}
                            >
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-transparent'
                                    }`} />

                                <div className="shrink-0 mt-0.5">
                                    {notif.type === 'success' && <FiCheckCircle className="text-green-500" size={20} />}
                                    {notif.type === 'info' && <FiInfo className="text-blue-500" size={20} />}
                                    {notif.type === 'warning' && <FiAlertCircle className="text-yellow-500" size={20} />}
                                    {notif.type === 'error' && <FiAlertCircle className="text-red-500" size={20} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-semibold text-gray-800 ${!notif.read ? 'font-bold' : ''}`}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                                        <FiClock size={10} />
                                        <span>
                                            {new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
                                                -Math.round((Date.now() - notif.timestamp.getTime()) / (1000 * 60)),
                                                'minute'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
