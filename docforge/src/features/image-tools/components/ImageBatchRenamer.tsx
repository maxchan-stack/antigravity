import React, { useState } from 'react';
import { Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DropZone } from '@/shared/components/ui/DropZone';
import { Button } from '@/shared/components/ui/Button';

interface NamingConfig {
    prefix: string;
    startNumber: number;
    numberPadding: number;
    suffix: string;
}

/**
 * 圖片批次命名工具
 */
export const ImageBatchRenamer: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [config, setConfig] = useState<NamingConfig>({
        prefix: '圖片',
        startNumber: 1,
        numberPadding: 3,
        suffix: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileDrop = (droppedFiles: File[]) => {
        const imageFiles = droppedFiles.filter(f => f.type.startsWith('image/'));
        setFiles(imageFiles);
    };

    const generateNewFilename = (originalFile: File, index: number): string => {
        const ext = originalFile.name.split('.').pop() || 'jpg';
        const number = (config.startNumber + index).toString().padStart(config.numberPadding, '0');
        return `${config.prefix}${number}${config.suffix}.${ext}`;
    };

    const handleDownload = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        try {
            const zip = new JSZip();

            files.forEach((file, index) => {
                const newName = generateNewFilename(file, index);
                zip.file(newName, file);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, '批次重命名圖片.zip');

            alert(`成功重命名 ${files.length} 個檔案！`);
        } catch (error) {
            console.error('打包失敗:', error);
            alert('打包失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold p-6 rounded-xl text-white">
                <h1 className="text-3xl font-rufina font-bold mb-2">📝 圖片批次命名</h1>
                <p className="text-white/90">快速重新命名多個圖片檔案</p>
            </div>

            {!files.length ? (
                <DropZone
                    accept="image/*"
                    multiple={true}
                    maxSize={50}
                    onDrop={handleFileDrop}
                    label="拖曳圖片至此"
                />
            ) : (
                <div className="space-y-6">
                    {/* 命名規則設定 */}
                    <div className="bg-starlux-bg-card rounded-xl p-6 border border-white/10">
                        <h3 className="font-bold text-white mb-4">命名規則設定</h3>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    前綴
                                </label>
                                <input
                                    type="text"
                                    value={config.prefix}
                                    onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                                    className="w-full px-4 py-2 bg-starlux-bg-elevated border border-white/10 rounded-xl text-white focus:border-starlux-earth-gold focus:outline-none"
                                    placeholder="圖片"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    後綴
                                </label>
                                <input
                                    type="text"
                                    value={config.suffix}
                                    onChange={(e) => setConfig({ ...config, suffix: e.target.value })}
                                    className="w-full px-4 py-2 bg-starlux-bg-elevated border border-white/10 rounded-xl text-white focus:border-starlux-earth-gold focus:outline-none"
                                    placeholder="（選填）"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    起始編號
                                </label>
                                <input
                                    type="number"
                                    value={config.startNumber}
                                    onChange={(e) => setConfig({ ...config, startNumber: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-2 bg-starlux-bg-elevated border border-white/10 rounded-xl text-white focus:border-starlux-earth-gold focus:outline-none"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">
                                    編號位數
                                </label>
                                <select
                                    value={config.numberPadding}
                                    onChange={(e) => setConfig({ ...config, numberPadding: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 bg-starlux-bg-elevated border border-white/10 rounded-xl text-white focus:border-starlux-earth-gold focus:outline-none"
                                >
                                    <option value="1">1 位 (1, 2, 3...)</option>
                                    <option value="2">2 位 (01, 02, 03...)</option>
                                    <option value="3">3 位 (001, 002, 003...)</option>
                                    <option value="4">4 位 (0001, 0002, 0003...)</option>
                                </select>
                            </div>
                        </div>

                        {/* 預覽範例 */}
                        <div className="bg-starlux-bg-elevated rounded-xl p-4 border border-white/10">
                            <p className="text-sm text-starlux-text-secondary mb-2">命名預覽：</p>
                            <p className="text-starlux-earth-gold font-mono">
                                {generateNewFilename(files[0], 0)}
                            </p>
                            {files.length > 1 && (
                                <p className="text-starlux-earth-gold font-mono mt-1">
                                    {generateNewFilename(files[1], 1)}
                                </p>
                            )}
                            {files.length > 2 && (
                                <p className="text-starlux-text-secondary font-mono mt-1">
                                    ...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 檔案列表預覽 */}
                    <div className="bg-starlux-bg-card rounded-xl p-6 border border-white/10">
                        <h3 className="font-bold text-white mb-4">
                            檔案列表 ({files.length} 個檔案)
                        </h3>

                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-starlux-bg-elevated rounded-xl border border-white/10"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-starlux-text-secondary truncate">
                                            {file.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className="text-xl">→</span>
                                        <p className="text-sm text-starlux-earth-gold font-mono">
                                            {generateNewFilename(file, index)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="flex-1"
                            onClick={handleDownload}
                            loading={isProcessing}
                            icon={Download}
                        >
                            {isProcessing ? '處理中...' : '下載重命名檔案'}
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setFiles([])}
                        >
                            重新選擇
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
