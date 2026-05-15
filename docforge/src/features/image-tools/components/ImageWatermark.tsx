import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { batchAddWatermark } from '../utils/imageWatermark';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const ImageWatermark: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [watermarkText, setWatermarkText] = useState('© 2026');
    const [position, setPosition] = useState<'center' | 'bottom-right' | 'bottom-left'>('bottom-right');
    const [fontSize, setFontSize] = useState(24);
    const [opacity, setOpacity] = useState(0.5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleProcess = async () => {
        if (files.length === 0 || !watermarkText) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const processed = await batchAddWatermark(
                files,
                watermarkText,
                { position, fontSize, opacity, color: '#FFFFFF' },
                (current, total) => {
                    setProgress(Math.round((current / total) * 100));
                }
            );

            if (processed.length === 1) {
                // 單檔直接下載
                const filename = files[0].name.replace(/\.[^/.]+$/, '') + '_watermarked' + files[0].name.match(/\.[^/.]+$/)?.[0];
                saveAs(processed[0], filename);
            } else {
                // 多檔打包ZIP
                const zip = new JSZip();
                processed.forEach((blob, index) => {
                    const originalName = files[index].name.replace(/\.[^/.]+$/, '');
                    const ext = files[index].name.match(/\.[^/.]+$/)?.[0];
                    zip.file(`${originalName}_watermarked${ext}`, blob);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `watermarked_images_${Date.now()}.zip`);
            }

            alert('浮水印添加完成！');
        } catch (error) {
            console.error('處理失敗:', error);
            alert('處理失敗');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-info to-blue-600 p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">💧 圖片浮水印</h1>
                <p className="text-white/90">批次為圖片添加文字浮水印</p>
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

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">浮水印文字</label>
                                <input
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
                                    placeholder="輸入浮水印文字"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">位置</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { value: 'center', label: '置中' },
                                        { value: 'bottom-right', label: '右下' },
                                        { value: 'bottom-left', label: '左下' },
                                    ].map((pos) => (
                                        <Button
                                            key={pos.value}
                                            variant={position === pos.value ? 'primary' : 'outline'}
                                            size="sm"
                                            onClick={() => setPosition(pos.value as any)}
                                        >
                                            {pos.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    字體大小：{fontSize}px
                                </label>
                                <input
                                    type="range"
                                    min="12"
                                    max="72"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    透明度：{Math.round(opacity * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={opacity * 100}
                                    onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
                                    className="w-full"
                                />
                            </div>
                        </div>
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
                        onClick={handleProcess}
                        loading={isProcessing}
                        icon={Download}
                        disabled={!watermarkText}
                    >
                        {isProcessing ? '處理中...' : '添加浮水印並下載'}
                    </Button>
                </div>
            )}
        </div>
    );
};
