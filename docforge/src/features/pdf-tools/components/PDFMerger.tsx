import React, { useState } from 'react';
import { Upload, X, Download, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { mergePDFs, getPDFPageCount } from '../utils/pdfMerger';

interface PDFFile {
    id: string;
    file: File;
    name: string;
    size: number;
    pageCount: number;
    preview?: string;
}

export const PDFMerger: React.FC = () => {
    const [files, setFiles] = useState<PDFFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // 處理檔案上傳
    const handleFilesAdded = async (newFiles: File[]) => {
        const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            alert('請上傳 PDF 檔案');
            return;
        }

        setIsProcessing(true);

        const processedFiles: PDFFile[] = [];
        for (const file of pdfFiles) {
            try {
                const pageCount = await getPDFPageCount(file);
                processedFiles.push({
                    id: `${Date.now()}-${Math.random()}`,
                    file,
                    name: file.name,
                    size: file.size,
                    pageCount,
                });
            } catch (error) {
                console.error(`處理 ${file.name} 失敗:`, error);
            }
        }

        setFiles(prev => [...prev, ...processedFiles]);
        setIsProcessing(false);
    };

    // 移除單一檔案
    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    // 清除所有檔案
    const clearAll = () => {
        setFiles([]);
    };

    // 拖曳開始
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    // 拖曳結束
    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // 拖曳放置
    const handleDrop = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const newFiles = [...files];
        const [draggedFile] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, draggedFile);

        setFiles(newFiles);
        setDraggedIndex(null);
    };

    // 執行合併
    const handleMerge = async () => {
        if (files.length < 2) {
            alert('至少需要 2 個 PDF 檔案才能合併');
            return;
        }

        setIsProcessing(true);

        try {
            const fileObjects = files.map(f => f.file);
            const mergedBlob = await mergePDFs(fileObjects);

            // 下載合併後的 PDF
            const url = URL.createObjectURL(mergedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged_${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

            alert('PDF 合併成功！');
        } catch (error) {
            console.error('合併失敗:', error);
            alert('合併失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* 標題 */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">📄 PDF 合併器</h1>
                <p className="text-white/90">批次合併多個 PDF 檔案，支援拖曳調整順序</p>
            </div>

            {/* 上傳區域 */}
            {files.length === 0 ? (
                <DropZone
                    accept="application/pdf"
                    multiple={true}
                    maxSize={100}
                    onDrop={handleFilesAdded}
                    label="拖曳 PDF 檔案至此或點擊上傳"
                />
            ) : (
                <div className="space-y-4">
                    {/* 檔案列表 */}
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    已上傳檔案 ({files.length})
                                </h3>
                                <p className="text-sm text-gray-500">
                                    總頁數：{totalPages} 頁
                                </p>
                            </div>
                            <button
                                onClick={clearAll}
                                className="text-sm text-error hover:underline flex items-center gap-1"
                            >
                                <Trash2 size={16} />
                                清除全部
                            </button>
                        </div>

                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div
                                    key={file.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(index)}
                                    className={`
                    flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 
                    ${draggedIndex === index ? 'border-primary opacity-50' : 'border-gray-200'}
                    hover:border-primary transition-all cursor-move
                  `}
                                >
                                    <GripVertical className="text-gray-400" size={20} />

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {file.pageCount} 頁 • {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                                    >
                                        <X className="text-error" size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 新增更多檔案 */}
                    <button
                        onClick={() => document.getElementById('add-more-files')?.click()}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                        <Upload size={20} />
                        新增更多 PDF 檔案
                    </button>
                    <input
                        id="add-more-files"
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) {
                                handleFilesAdded(Array.from(e.target.files));
                            }
                            e.target.value = '';
                        }}
                    />

                    {/* 合併按鈕 */}
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleMerge}
                        disabled={isProcessing || files.length < 2}
                        loading={isProcessing}
                        icon={Download}
                    >
                        {isProcessing ? '合併中...' : '🎉 合併 PDF 並下載'}
                    </Button>

                    {files.length < 2 && (
                        <p className="text-sm text-warning text-center">
                            ⚠️ 請上傳至少 2 個 PDF 檔案
                        </p>
                    )}
                </div>
            )}

            {/* 使用說明 */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">💡 使用提示</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 拖曳檔案左側的 ≡ 圖示可調整合併順序</li>
                    <li>• 支援批次上傳，可一次選擇多個 PDF</li>
                    <li>• 所有處理皆在本地端完成，檔案不會上傳</li>
                    <li>• 單一檔案最大 100MB</li>
                </ul>
            </div>
        </div>
    );
};
