import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { rotatePDF } from '../utils/pdfRotator';
import { getPDFPageCount } from '../utils/pdfPreview';
import { PDFPagePreview } from './PDFPagePreview';
import { saveAs } from 'file-saver';

export const PDFRotator: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [pageRotations, setPageRotations] = useState<Map<number, 90 | 180 | 270>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileDrop = async (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            const pdfFile = files[0];
            setFile(pdfFile);

            try {
                const count = await getPDFPageCount(pdfFile);
                setPageCount(count);
                setPageRotations(new Map()); // 重置旋轉設定
            } catch (error) {
                console.error('讀取 PDF 失敗:', error);
                alert('讀取 PDF 失敗');
            }
        }
    };

    const setPageRotation = (pageNum: number, rotation: 90 | 180 | 270) => {
        const newRotations = new Map(pageRotations);
        if (newRotations.get(pageNum) === rotation) {
            // 如果已經是該角度，則移除（回到 0°）
            newRotations.delete(pageNum);
        } else {
            newRotations.set(pageNum, rotation);
        }
        setPageRotations(newRotations);
    };

    const handleRotate = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            // 如果沒有任何旋轉設定，使用預設 90° 旋轉所有頁面
            const rotationsToApply = pageRotations.size === 0
                ? new Map([[1, 90 as 90 | 180 | 270]])
                : pageRotations;

            const rotatedBlob = await rotatePDF(file, Array.from(rotationsToApply.entries()));
            saveAs(rotatedBlob, `${file.name.replace('.pdf', '')}_rotated.pdf`);
            alert('旋轉完成！');
        } catch (error) {
            console.error('旋轉失敗:', error);
            alert('旋轉失敗');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold p-6 rounded-xl text-white shadow-glow-gold">
                <h1 className="text-3xl font-rufina font-bold mb-2">🔄 PDF 旋轉器</h1>
                <p className="text-white/90">快速旋轉 PDF 頁面方向</p>
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
                        <h3 className="font-rufina font-bold text-white mb-2">📄 {file.name}</h3>
                        <p className="text-sm text-starlux-text-secondary mb-4">
                            總頁數：{pageCount} 頁 | 已設定 {pageRotations.size} 頁旋轉
                        </p>

                        {/* 頁面預覽網格 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: pageCount }, (_, i) => {
                                const pageNum = i + 1;
                                const currentRotation = pageRotations.get(pageNum);

                                return (
                                    <div key={pageNum} className="space-y-2">
                                        <PDFPagePreview
                                            file={file}
                                            pageNum={pageNum}
                                            scale={0.3}
                                            selected={currentRotation !== undefined}
                                        />

                                        {/* 旋轉角度選擇 */}
                                        <div className="flex gap-1">
                                            {[90, 180, 270].map((deg) => (
                                                <button
                                                    key={deg}
                                                    onClick={() => setPageRotation(pageNum, deg as 90 | 180 | 270)}
                                                    className={`
                                                        flex-1 px-2 py-1 text-xs font-bold rounded transition-all
                                                        ${currentRotation === deg
                                                            ? 'bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold text-white shadow-glow-gold'
                                                            : 'bg-starlux-bg-elevated text-starlux-text-secondary hover:bg-starlux-bg-card'
                                                        }
                                                    `}
                                                >
                                                    {deg}°
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="flex-1"
                            onClick={handleRotate}
                            loading={isProcessing}
                            icon={RotateCw}
                        >
                            {isProcessing ? '旋轉中...' : '旋轉 PDF'}
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                setFile(null);
                                setPageCount(0);
                                setPageRotations(new Map());
                            }}
                        >
                            重新選擇
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
