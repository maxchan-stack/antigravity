import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // MB
    onDrop: (files: File[]) => void;
    label?: string;
    className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
    accept,
    multiple = false,
    maxSize = 100,
    onDrop,
    label = '拖曳檔案至此或點擊上傳',
    className = '',
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const validateFiles = (files: File[]): File[] => {
        const maxSizeBytes = maxSize * 1024 * 1024;
        const validFiles: File[] = [];

        for (const file of files) {
            if (file.size > maxSizeBytes) {
                setError(`檔案 ${file.name} 超過大小限制 (${maxSize}MB)`);
                continue;
            }
            validFiles.push(file);
        }

        return validFiles;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setError(null);

        const files = Array.from(e.dataTransfer.files);
        const validFiles = validateFiles(files);

        if (validFiles.length > 0) {
            onDrop(validFiles);
        }
    }, [onDrop, maxSize]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = Array.from(e.target.files || []);
        const validFiles = validateFiles(files);

        if (validFiles.length > 0) {
            onDrop(validFiles);
        }

        // 重置 input 以允許上傳相同檔案
        e.target.value = '';
    }, [onDrop]);

    return (
        <div className={className}>
            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
        relative overflow-hidden
        border-2 border-dashed transition-all duration-300
        rounded-xl p-12
        cursor-pointer
        bg-starlux-bg-card/50 backdrop-blur-glass
        ${isDragging // Changed from isDragActive to isDragging to match existing state
                        ? 'border-starlux-rose-gold bg-starlux-rose-gold/10 scale-102'
                        : 'border-starlux-earth-gold/40 hover:border-starlux-earth-gold hover:bg-starlux-bg-elevated/60'
                    }
        ${className}
      `}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="pointer-events-none">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-starlux-earth-gold" />
                    <p className="text-lg font-bold text-white mb-2">{label}</p>
                    <p className="text-sm text-starlux-text-secondary">
                        {multiple ? '支援批次上傳' : '單檔上傳'} • 最大 {maxSize}MB
                    </p>
                </div>
            </div>

            {error && (
                <p className="mt-2 text-sm text-error font-medium">{error}</p>
            )}
        </div>
    );
};
