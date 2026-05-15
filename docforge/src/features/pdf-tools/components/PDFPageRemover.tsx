import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { removePDFPages } from '../utils/pdfPageRemover';
import { getPDFPageCount } from '../utils/pdfPreview';
// 使用懶加載版本提升大型 PDF 效能
import { LazyPDFPreview } from './LazyPDFPreview';
import { saveAs } from 'file-saver';

export const PDFPageRemover: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileDrop = async (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            const pdfFile = files[0];
            setFile(pdfFile);

            try {
                const count = await getPDFPageCount(pdfFile);
                setPageCount(count);
                setSelectedPages(new Set());
            } catch (error) {
                console.error('取得PDF頁數失敗:', error);
                alert('無法讀取 PDF 檔案');
                setFile(null);
            }
        }
    };

    const handlePageToggle = (pageNum: number) => {
        setSelectedPages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pageNum)) {
                newSet.delete(pageNum);
            } else {
                newSet.add(pageNum);
            }
            return newSet;
        });
    };

    const handleRemove = async () => {
        if (!file || selectedPages.size === 0) return;

        setIsProcessing(true);
        try {
            const pagesToRemove = Array.from(selectedPages);
            const resultBlob = await removePDFPages(file, pagesToRemove);
            saveAs(resultBlob, `${file.name.replace('.pdf', '')}_removed_pages.pdf`);
            alert(`成功移除 ${selectedPages.size} 頁！`);
        } catch (error) {
            console.error('移除頁面失敗:', error);
            alert('移除失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">📑 PDF 頁面移除器</h1>
                <p className="text-white/90">選擇特定頁面移除並生成新 PDF</p>
            </div>

            {!file ? (
                <DropZone
                    accept="application/pdf"
                    multiple={false}
                    maxSize={100}
                    onDrop={handleFileDrop}
                    label="拖曳 PDF 檔案至此"
                />
            ) : (
                <div className="space-y-6">
                    <div className="bg-starlux-bg-card rounded-xl p-6 border border-white/10">
                        <h3 className="font-bold text-white mb-2">📄 {file.name}</h3>
                        <p className="text-sm text-starlux-text-secondary mb-4">總頁數：{pageCount} 頁</p>

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-bold text-white">
                                    已選擇 {selectedPages.size} 頁移除
                                    {selectedPages.size > 0 && ` (保留 ${pageCount - selectedPages.size} 頁)`}
                                </p>
                                {selectedPages.size > 0 && (
                                    <button
                                        onClick={() => setSelectedPages(new Set())}
                                        className="text-sm text-error hover:underline"
                                    >
                                        清除選擇
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* PDF 頁面預覽網格 - 使用懶加載優化效能 */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                                <LazyPDFPreview
                                    key={pageNum}
                                    file={file}
                                    pageNum={pageNum}
                                    selected={selectedPages.has(pageNum)}
                                    onSelect={handlePageToggle}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="flex-1"
                            onClick={handleRemove}
                            loading={isProcessing}
                            icon={Trash2}
                            disabled={selectedPages.size === 0}
                        >
                            {isProcessing ? '處理中...' : `移除選定的 ${selectedPages.size} 頁`}
                        </Button>

                        <button
                            onClick={() => setFile(null)}
                            className="text-sm text-starlux-text-secondary hover:text-starlux-text-primary transition-colors"
                        >
                            重新選擇檔案
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
