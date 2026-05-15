import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    loading?: boolean;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon: Icon,
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-montserrat font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
        primary: 'bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold text-white hover:scale-105 hover:shadow-glow-gold focus:ring-starlux-earth-gold',
        secondary: 'bg-starlux-bg-elevated text-starlux-text-primary hover:bg-starlux-obsidian border border-white/20 focus:ring-starlux-rose-gold',
        danger: 'bg-error text-white hover:bg-opacity-90 hover:scale-105 focus:ring-error',
        outline: 'bg-transparent text-starlux-earth-gold border-2 border-starlux-earth-gold hover:bg-starlux-earth-gold hover:text-white focus:ring-starlux-earth-gold',
    };

    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeStyles[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    處理中...
                </>
            ) : (
                <>
                    {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
                    {children}
                </>
            )}
        </button>
    );
};
