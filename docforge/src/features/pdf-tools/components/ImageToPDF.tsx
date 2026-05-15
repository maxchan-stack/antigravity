import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { imagesToPDF } from '../utils/imageToPdf';
import { saveAs } from 'file-saver';

export const ImageToPDF: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        try {
            const pdfBlob = await imagesToPDF(files);
            saveAs(pdfBlob, `images_to_pdf_${Date.now()}.pdf`);
            alert('轉換完成！');
        } catch (error) {
            console.error('轉換失敗:', error);
            alert('轉換失敗');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">🖼️ 圖片轉 PDF</h1>
                <p className="text-white/90">將多張圖片合併成單一 PDF 檔案</p>
            </div>

            {files.length === 0 ? (
                <DropZone
                    accept="image/*"
                    multiple={true}
                    maxSize={50}
                    onDrop={handleFilesAdded}
                    label="拖曳圖片檔案至此（支援 JPG/PNG/WebP）"
                />
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                        <h3 className="font-bold mb-2">已上傳圖片 ({files.length})</h3>
                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-sm truncate">{file.name}</span>
                                    <button
                                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                                        className="text-error text-sm"
                                    >
                                        移除
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleConvert}
                        loading={isProcessing}
                        icon={Download}
                    >
                        {isProcessing ? '轉換中...' : '轉換為 PDF'}
                    </Button>
                </div>
            )}
        </div>
    );
};
