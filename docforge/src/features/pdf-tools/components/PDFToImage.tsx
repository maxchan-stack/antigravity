import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { pdfToImages } from '../utils/pdfToImage';
import { workerPool } from '../utils/pdfWorkerPool';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 確保 Worker 已初始化
workerPool.ensureWorkerReady();

export const PDFToImage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState(0.95);
    const [scale, setScale] = useState(2);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileDrop = (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            setFile(files[0]);
        }
    };

    const handleConvert = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const images = await pdfToImages(file, quality, scale);

            if (images.length === 1) {
                // 單頁直接下載
                saveAs(images[0], `${file.name.replace('.pdf', '')}_page_1.jpg`);
            } else {
                // 多頁打包 ZIP
                const zip = new JSZip();
                images.forEach((blob, index) => {
                    zip.file(`page_${index + 1}.jpg`, blob);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `${file.name.replace('.pdf', '')}_images.zip`);
            }

            alert(`成功轉換 ${images.length} 頁為圖片！`);
        } catch (error) {
            console.error('轉換失敗:', error);
            alert('轉換失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">🖼️ PDF 轉 JPG</h1>
                <p className="text-white/90">將 PDF 每頁轉換為高品質 JPG 圖片</p>
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
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <h3 className="font-bold mb-4">📄 {file.name}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    圖片品質：{Math.round(quality * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="100"
                                    value={quality * 100}
                                    onChange={(e) => setQuality(parseInt(e.target.value) / 100)}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    解析度：{scale}x
                                </label>
                                <div className="flex gap-4">
                                    {[1, 2, 3].map((s) => (
                                        <Button
                                            key={s}
                                            variant={scale === s ? 'primary' : 'outline'}
                                            size="sm"
                                            onClick={() => setScale(s)}
                                        >
                                            {s}x
                                        </Button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {scale === 1 && '標準（檔案小）'}
                                    {scale === 2 && '高清（推薦）'}
                                    {scale === 3 && '超高清（檔案大）'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleConvert}
                        loading={isProcessing}
                        icon={ImageIcon}
                    >
                        {isProcessing ? '轉換中...' : '轉換為 JPG'}
                    </Button>

                    <button
                        onClick={() => setFile(null)}
                        className="text-sm text-error hover:underline w-full"
                    >
                        重新選擇檔案
                    </button>
                </div>
            )}
        </div>
    );
};
