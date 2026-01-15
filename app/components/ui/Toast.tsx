'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
}

export default function Toast({ id, message, type, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Auto close
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300); // Wait for exit animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [id, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
    };

    const styles = {
        success: 'bg-white border-l-4 border-green-500 text-gray-800 shadow-lg shadow-green-500/10',
        error: 'bg-white border-l-4 border-red-500 text-gray-800 shadow-lg shadow-red-500/10',
        info: 'bg-white border-l-4 border-blue-500 text-gray-800 shadow-lg shadow-blue-500/10',
        warning: 'bg-white border-l-4 border-yellow-500 text-gray-800 shadow-lg shadow-yellow-500/10'
    };

    const icons = {
        success: <FiCheckCircle className="text-green-500" size={20} />,
        error: <FiAlertCircle className="text-red-500" size={20} />,
        info: <FiInfo className="text-blue-500" size={20} />,
        warning: <FiAlertTriangle className="text-yellow-500" size={20} />
    };

    return (
        <div
            className={`flex items-center gap-3 p-4 rounded-lg min-w-[320px] max-w-[400px] mb-3 transform transition-all duration-300 ease-out cursor-pointer ${styles[type]}
            ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            onClick={handleClose}
        >
            <div className="flex-shrink-0 animate-bounce-in">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
                <FiX size={16} />
            </button>
        </div>
    );
}
