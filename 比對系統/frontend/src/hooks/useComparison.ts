import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export type ComparisonMode = 'local' | 'llm' | 'web';

export const useComparison = () => {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [mode, setMode] = useState<'local' | 'llm' | 'web'>('local');
    const [apiKey, setApiKey] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [comparisonType, setComparisonType] = useState<'text' | 'image'>('text');
    const [ignoreOptions, setIgnoreOptions] = useState({
        whitespace: false,
        case: false,
        timestamps: false
    });
    const { showToast } = useToast();

    return {
        file1, setFile1,
        file2, setFile2,
        mode, setMode,
        apiKey, setApiKey,
        result,
        loading,
        comparisonType,
        ignoreOptions,
        setIgnoreOptions,
        handleCompare: async () => {
            if (!file1) {
                showToast("請上傳原始檔案", 'error');
                return;
            }

            if (mode !== 'web' && !file2) {
                showToast("請上傳兩個檔案以進行比對", 'error');
                return;
            }

            if (mode === 'llm' && !apiKey) {
                showToast("請輸入 OpenAI API Key 才能使用 LLM 比對功能", 'error');
                return;
            }

            setLoading(true);
            const formData = new FormData();
            formData.append('file1', file1);
            if (file2) {
                formData.append('file2', file2);
            } else if (mode === 'web') {
                // Backend expects file2 but for web check we can send dummy or optional?
                // Actually backend compare_files expects file2_path, but compare_web only uses file1.
                // But the endpoint /compare/files uses UploadFile.
                // Let's modify backend endpoint or send dummy file.
                // Sending dummy empty file to satisfy FastAPI requirement if needed, 
                // BUT let's check backend `main.py` first.
                // Assuming I should send a dummy file blob.
                formData.append('file2', new Blob([""], { type: 'text/plain' }), "dummy.txt");
            }
            formData.append('mode', mode);
            if (apiKey) {
                formData.append('api_key', apiKey);
            }

            // Append ignore options
            formData.append('ignore_whitespace', ignoreOptions.whitespace.toString());
            formData.append('ignore_case', ignoreOptions.case.toString());
            formData.append('ignore_timestamps', ignoreOptions.timestamps.toString());

            try {
                const response = await fetch(`${API_URL}/compare/files`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "比對請求失敗");
                }

                setResult(data);
                // Set type for current comparison
                setComparisonType(file1.type.startsWith('image/') ? 'image' : 'text');
                showToast("比對完成", 'success');
            } catch (error: any) {
                console.error("Comparison failed", error);
                showToast(error.message || "比對失敗，請確認後端服務是否已啟動。", 'error');
            } finally {
                setLoading(false);
            }
        },
        reset: () => {
            setFile1(null);
            setFile2(null);
            setResult(null);
            setApiKey('');
        }
    };
};
