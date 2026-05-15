import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { compressImage } from '../utils/imageCompressor';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const ImageCompressor: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [quality, setQuality] = useState(0.8);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleCompress = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        try {
            const zip = new JSZip();

            for (let i = 0; i < files.length; i++) {
                const compressed = await compressImage(files[i], quality);
                const filename = files[i].name.replace(/\.[^/.]+$/, '') + '_compressed' + files[i].name.match(/\.[^/.]+$/)?.[0];
                zip.file(filename, compressed);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `compressed_images_${Date.now()}.zip`);

            alert('壓縮完成！');
        } catch (error) {
            console.error('壓縮失敗:', error);
            alert('壓縮失敗');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-info to-blue-600 p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">🗜️ 圖片壓縮機</h1>
                <p className="text-white/90">智慧壓縮圖片大小，保持視覺品質</p>
            </div>

            {files.length === 0 ? (
                <DropZone
                    accept="image/*"
                    multiple={true}
                    maxSize={50}
                    onDrop={handleFilesAdded}
                    label="拖曳圖片檔案至此"
                />
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <h3 className="font-bold mb-4">已上傳圖片 ({files.length})</h3>

                        <label className="block text-sm font-bold mb-2">
                            壓縮品質：{Math.round(quality * 100)}%
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={quality * 100}
                            onChange={(e) => setQuality(parseInt(e.target.value) / 100)}
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            品質越低，檔案越小但畫質越差
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleCompress}
                        loading={isProcessing}
                        icon={Download}
                    >
                        {isProcessing ? '壓縮中...' : '壓縮並下載 ZIP'}
                    </Button>
                </div>
            )}
        </div>
    );
};
