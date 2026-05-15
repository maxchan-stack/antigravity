import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { batchConvertImages } from '../utils/imageConverter';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const ImageConverter: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
    const [quality, setQuality] = useState(0.95);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const converted = await batchConvertImages(
                files,
                targetFormat,
                quality,
                (current, total) => {
                    setProgress(Math.round((current / total) * 100));
                }
            );

            if (converted.length === 1) {
                // 單檔直接下載
                saveAs(converted[0], `converted.${targetFormat}`);
            } else {
                // 多檔打包ZIP
                const zip = new JSZip();
                converted.forEach((blob, index) => {
                    const originalName = files[index].name.replace(/\.[^/.]+$/, '');
                    zip.file(`${originalName}.${targetFormat}`, blob);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `converted_images_${Date.now()}.zip`);
            }

            alert('轉換完成！');
        } catch (error) {
            console.error('轉換失敗:', error);
            alert('轉換失敗');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-info to-blue-600 p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">🎨 照片轉換工作站</h1>
                <p className="text-white/90">支援 HEIC/JPG/PNG/WebP 格式互轉</p>
            </div>

            {files.length === 0 ? (
                <DropZone
                    accept="image/*,.heic,.heif"
                    multiple={true}
                    maxSize={50}
                    onDrop={handleFilesAdded}
                    label="拖曳圖片檔案至此（支援 HEIC）"
                />
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <h3 className="font-bold mb-4">已上傳圖片 ({files.length})</h3>

                        <label className="block text-sm font-bold mb-2">目標格式</label>
                        <div className="flex gap-4 mb-4">
                            {['jpeg', 'png', 'webp'].map((format) => (
                                <Button
                                    key={format}
                                    variant={targetFormat === format ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setTargetFormat(format as any)}
                                >
                                    {format.toUpperCase()}
                                </Button>
                            ))}
                        </div>

                        <label className="block text-sm font-bold mb-2">
                            品質：{Math.round(quality * 100)}%
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

                    {isProcessing && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold">處理進度</span>
                                <span className="text-sm">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleConvert}
                        loading={isProcessing}
                        icon={RefreshCw}
                    >
                        {isProcessing ? '轉換中...' : '開始轉換'}
                    </Button>
                </div>
            )}
        </div>
    );
};
