import React, { useState } from 'react';
import { Scissors } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { splitPDFToSinglePages } from '../utils/pdfSplitter';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const PDFSplitter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [splitMode, setSplitMode] = useState<'single' | 'custom'>('single');

    const handleFileDrop = (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            setFile(files[0]);
        }
    };

    const handleSplit = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const pages = await splitPDFToSinglePages(file);

            // 打包成 ZIP
            const zip = new JSZip();
            pages.forEach((blob, index) => {
                zip.file(`page_${index + 1}.pdf`, blob);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${file.name.replace('.pdf', '')}_split.zip`);

            alert(`成功拆分成 ${pages.length} 個檔案！`);
        } catch (error) {
            console.error('拆分失敗:', error);
            alert('拆分失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">✂️ PDF 拆分器</h1>
                <p className="text-white/90">將 PDF 拆分成單頁檔案或自訂範圍</p>
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
                        <h3 className="font-bold mb-2">📄 {file.name}</h3>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                        <div className="mt-4">
                            <label className="block text-sm font-bold mb-2">拆分模式</label>
                            <div className="flex gap-4">
                                <Button
                                    variant={splitMode === 'single' ? 'primary' : 'outline'}
                                    onClick={() => setSplitMode('single')}
                                >
                                    每頁單獨拆分
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleSplit}
                        loading={isProcessing}
                        icon={Scissors}
                    >
                        {isProcessing ? '拆分中...' : '開始拆分'}
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
