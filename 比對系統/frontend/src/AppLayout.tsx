import React from 'react';
import './styles/figma-theme.css';
import { Play, Layout } from 'lucide-react';
import { useComparison } from './hooks/useComparison';
import { UploadZone } from './components/UploadZone';
import { AdvancedSettings } from './components/AdvancedSettings';
import { ResultDashboard } from './components/ResultDashboard';
import { ComparisonModeSelector } from './components/ComparisonModeSelector';
import { ImageViewer } from './components/ImageViewer';

const isImage = (file: File) => file.type.startsWith('image/');

export default function AppLayout() {
    const {
        file1, setFile1,
        file2, setFile2,
        mode, setMode,
        apiKey, setApiKey,
        result,
        loading,
        handleCompare,
        comparisonType,
        ignoreOptions,
        setIgnoreOptions
    } = useComparison();

    const [leftPanelOpen] = React.useState(true);
    const [rightPanelOpen] = React.useState(true);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {/* 1. Top Bar (Toolbar) */}
            <div className="figma-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Layout size={20} color="#bfa46f" />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>智慧比對系統 | Smart Comparison</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif' }}>
                        Design by MAXCHAN
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Panel Toggles Removed */}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--figma-bg-canvas)' }}>

                {/* 2. Left Sidebar (Assets/Inputs) */}
                {leftPanelOpen && (
                    <div className="figma-panel" style={{ width: 'var(--figma-sidebar-width)', minWidth: 'var(--figma-sidebar-width)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid var(--figma-border)', fontWeight: 600, fontSize: '13px' }}>
                            檔案與資源 (Assets)
                        </div>

                        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                            {/* Supported Types Info */}
                            <div style={{ marginBottom: '16px', padding: '8px 12px', background: 'rgba(191, 164, 111, 0.1)', borderRadius: '4px', fontSize: '12px', color: '#886a34', border: '1px solid rgba(191, 164, 111, 0.2)' }}>
                                <span style={{ fontWeight: 600 }}>支援格式 (Supported):</span>
                                <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    <span>• 圖片 (PNG, JPG)</span>
                                    <span>• 文件 (PDF, Word)</span>
                                    <span>• 表格 (Excel)</span>
                                    <span>• 程式碼/文字 (Text, Code)</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: mode === 'web' ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                {/* Source Column */}
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--figma-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                        {mode === 'web' ? '待檢查檔案 (SOURCE FILE)' : '原始檔案 (SOURCE)'}
                                    </div>
                                    <UploadZone onFileSelected={setFile1} label={file1 ? file1.name : "選擇檔案"} />
                                    {file1 && isImage(file1) && (
                                        <div style={{ height: 300, marginTop: 8, overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--figma-border)', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ImageViewer file={file1} boxes={[]} color="transparent" imageStyle={{ objectFit: 'contain' }} />
                                        </div>
                                    )}
                                </div>

                                {/* Target Column */}
                                {mode !== 'web' && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--figma-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>比對檔案 (TARGET)</div>
                                        <UploadZone onFileSelected={setFile2} label={file2 ? file2.name : "選擇檔案"} />
                                        {file2 && isImage(file2) && (
                                            <div style={{ height: 300, marginTop: 8, overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--figma-border)', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ImageViewer file={file2} boxes={[]} color="transparent" imageStyle={{ objectFit: 'contain' }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Recent History Removed from here */}
                        </div>

                        {/* Bottom Action Area */}
                        <div style={{ padding: '16px', borderTop: '1px solid var(--figma-border)', background: 'var(--figma-bg-panel)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Mode Selector & API Key */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                <ComparisonModeSelector mode={mode} onChange={setMode} />
                                {mode === 'llm' && (
                                    <input
                                        className="figma-input"
                                        type="password"
                                        placeholder="OpenAI API Key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        style={{ height: '32px', flex: 1, minWidth: 0, fontSize: '12px' }}
                                    />
                                )}
                            </div>

                            <button
                                className="figma-btn primary"
                                onClick={handleCompare}
                                disabled={!file1 || (mode !== 'web' && !file2) || loading}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    width: '100%', height: '40px', fontSize: '14px', fontWeight: 600
                                }}
                            >
                                <Play size={16} fill="currentColor" />
                                {loading ? '處理中...' : mode === 'web' ? '開始網路比對 (Run Web Check)' : '開始比對 (Run Comparison)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Center Canvas (Work Area) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e5e5e5', padding: '16px' }}>
                    {/* The Canvas Card */}
                    <div style={{
                        flex: 1,
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: 'var(--figma-shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <ResultDashboard
                            result={result}
                            mode={mode}
                            isImageComparison={comparisonType === 'image'}
                            file1={file1}
                            file2={file2}
                        />
                    </div>
                </div>

                {/* 4. Right Sidebar (Properties/Settings) */}
                {rightPanelOpen && (
                    <div className="figma-panel" style={{ width: 'var(--figma-properties-width)', minWidth: 'var(--figma-properties-width)', borderLeft: '1px solid var(--figma-border)', borderRight: 'none' }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid var(--figma-border)', fontWeight: 600, fontSize: '13px' }}>
                            屬性與設定 (Properties)
                        </div>

                        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                            {/* Comparison Settings */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--figma-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>比對設定 (CONFIG)</div>
                                <AdvancedSettings options={ignoreOptions} onChange={setIgnoreOptions} />
                            </div>

                            {/* Metadata / Stats */}
                            {result && (
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--figma-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>統計數據 (STATS)</div>
                                    <div style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '8px' }}>
                                        <span>相似度 (Similarity)</span>
                                        <span style={{ fontWeight: 600 }}>{result.similarity_score}%</span>

                                        <span>差異項目 (Diffs)</span>
                                        <span>{result.differences?.length || 0}</span>

                                        <span>模式 (Method)</span>
                                        <span style={{ textTransform: 'uppercase' }}>{mode}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recent History Removed */}
                    </div>
                )}
            </div>
        </div>
    );
}
