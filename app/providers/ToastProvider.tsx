'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    notifications: Notification[];
    markAsRead: (id: string) => void;
    clearNotifications: () => void;
    unreadCount: number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Add to notifications history
        const titles: Record<string, string> = {
            success: 'Operación Exitosa',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        const newNotification: Notification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            title: titles[type] || 'Notificación',
            message,
            type: type as any,
            timestamp: new Date(),
            read: false
        };

        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <ToastContext.Provider value={{ showToast, notifications, markAsRead, clearNotifications, unreadCount }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
                {/* Pointer events auto to allow clicking toasts, but container transparent */}
                <div className="pointer-events-auto">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={removeToast}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
