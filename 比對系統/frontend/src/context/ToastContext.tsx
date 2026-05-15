import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        background: toast.type === 'error' ? '#e74c3c' : toast.type === 'success' ? '#2ecc71' : '#3498db',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        animation: 'fadeIn 0.3s ease-in-out'
                    }}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
