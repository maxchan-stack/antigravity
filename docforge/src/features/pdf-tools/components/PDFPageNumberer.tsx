import React, { useState } from 'react';
import { Hash } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { DropZone } from '@/shared/components/ui/DropZone';
import { addPageNumbers } from '../utils/pdfPageNumberer';
import { saveAs } from 'file-saver';

export const PDFPageNumberer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left'>('bottom-center');
    const [startNumber, setStartNumber] = useState(1);
    const [format, setFormat] = useState<'number' | 'pageOfTotal'>('number');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileDrop = (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            setFile(files[0]);
        }
    };

    const handleAddNumbers = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const resultBlob = await addPageNumbers(file, {
                position,
                startNumber,
                format,
            });

            saveAs(resultBlob, `${file.name.replace('.pdf', '')}_numbered.pdf`);
            alert('頁碼添加完成！');
        } catch (error) {
            console.error('添加失敗:', error);
            alert('添加失敗');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl text-white">
                <h1 className="text-3xl font-bold mb-2">🔢 PDF 頁碼添加器</h1>
                <p className="text-white/90">為 PDF 文件自動添加頁碼</p>
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
                                <label className="block text-sm font-bold mb-2">頁碼位置</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { value: 'bottom-center', label: '底部置中' },
                                        { value: 'bottom-right', label: '右下角' },
                                        { value: 'bottom-left', label: '左下角' },
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
                                <label className="block text-sm font-bold mb-2">頁碼格式</label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={format === 'number' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFormat('number')}
                                    >
                                        數字（1, 2, 3...）
                                    </Button>
                                    <Button
                                        variant={format === 'pageOfTotal' ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFormat('pageOfTotal')}
                                    >
                                        分數（1/10, 2/10...）
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">
                                    起始頁碼：{startNumber}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={startNumber}
                                    onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                                    className="w-32 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleAddNumbers}
                        loading={isProcessing}
                        icon={Hash}
                    >
                        {isProcessing ? '處理中...' : '添加頁碼'}
                    </Button>

                    <button
                        onClick={() => setFile(null)}
                        className="text-sm text-gray-500 hover:underline w-full"
                    >
                        重新選擇檔案
                    </button>
                </div>
            )}
        </div>
    );
};
