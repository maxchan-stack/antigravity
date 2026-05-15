import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-white/10 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-starlux-earth-gold border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
        </div>
    );
};
