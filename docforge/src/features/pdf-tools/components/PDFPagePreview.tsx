import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { renderPDFPage } from '../utils/pdfPreview';

interface PDFPagePreviewProps {
    file: File;
    pageNum: number;
    scale?: number;
    className?: string;
    selected?: boolean;
    onSelect?: (pageNum: number) => void;
}

/**
 * PDF 頁面預覽元件
 */
export const PDFPagePreview: React.FC<PDFPagePreviewProps> = ({
    file,
    pageNum,
    scale = 0.3,
    className = '',
    selected = false,
    onSelect,
}) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadThumbnail = async () => {
            try {
                setLoading(true);
                setError(null);
                const dataUrl = await renderPDFPage(file, pageNum, scale);

                if (!cancelled) {
                    setThumbnail(dataUrl);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : '載入失敗');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadThumbnail();

        return () => {
            cancelled = true;
        };
    }, [file, pageNum, scale]);

    const handleClick = () => {
        if (onSelect) {
            onSelect(pageNum);
        }
    };

    return (
        <div
            className={`
                relative bg-starlux-bg-card rounded-xl overflow-hidden
                border-2 transition-all cursor-pointer
                ${selected ? 'border-starlux-earth-gold shadow-lg scale-105' : 'border-white/10 hover:border-starlux-earth-gold/50'}
                ${className}
            `}
            onClick={handleClick}
        >
            {/* 頁碼標籤 */}
            <div className={`
                absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold z-10
                ${selected ? 'bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold text-white' : 'bg-starlux-bg-elevated bg-opacity-90 text-white'}
            `}>
                {pageNum}
            </div>

            {/* 選中標記 */}
            {selected && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold rounded-full flex items-center justify-center z-10">
                    <span className="text-white text-xs">✓</span>
                </div>
            )}

            {/* 縮圖內容 */}
            <div className="aspect-[3/4] flex items-center justify-center bg-starlux-bg-elevated">
                {loading && (
                    <Loader2 className="w-8 h-8 text-starlux-earth-gold animate-spin" />
                )}

                {error && (
                    <div className="text-sm text-error text-center p-4">
                        {error}
                    </div>
                )}

                {thumbnail && !loading && !error && (
                    <img
                        src={thumbnail}
                        alt={`Page ${pageNum}`}
                        className="w-full h-full object-contain"
                    />
                )}
            </div>
        </div>
    );
};
