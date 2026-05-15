import React, { useRef } from 'react';
import { SideBySideDiff } from './SideBySideDiff';
import { ExcelDiffViewer } from './ExcelDiffViewer';
// import { TextDiffViewer } from './TextDiffViewer'; // Replaced by SideBySideDiff in Level 4
import styles from '../App.module.css'; // Reusing App styles for now, can refactor later
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '../context/ToastContext';

interface ResultDashboardProps {
    result: any;
    mode: 'local' | 'llm' | 'web';
    isImageComparison: boolean;
    file1: File | null;
    file2: File | null;
}

export const ResultDashboard: React.FC<ResultDashboardProps> = ({ result, mode, isImageComparison, file1, file2 }) => {
    const { showToast } = useToast();
    const dashboardRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;

        try {
            showToast('正在生成 PDF 報告...', 'info');
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // First page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Multi-page handling
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`comparison-report-${Date.now()}.pdf`);
            showToast('PDF 下載成功', 'success');
        } catch (error) {
            console.error(error);
            showToast('PDF 生成失敗', 'error');
        }
    };

    if (!result) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
                請上傳檔案並點擊開始比對以檢視結果
            </div>
        );
    }

    return (
        <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}>
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-earth-gold)' }}>相似度分析結果: {result.similarity_score}%</h3>
                    {file1 && file2 && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {file1.name} <span style={{ margin: '0 5px' }}>vs</span> {file2.name}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '200px', height: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${result.similarity_score}%`,
                            height: '100%',
                            background: result.similarity_score > 80 ? '#2ecc71' : result.similarity_score > 30 ? '#f1c40f' : '#e74c3c',
                            transition: 'width 1s ease-out'
                        }}></div>
                    </div>
                    <button
                        onClick={handleExportPDF}
                        title="匯出 PDF 報告"
                        style={{
                            background: 'none',
                            border: '1px solid var(--color-earth-gold)',
                            color: 'var(--color-earth-gold)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            gap: '4px',
                            fontSize: '12px'
                        }}
                    >
                        <Download size={14} />
                        匯出
                    </button>
                </div>
            </div>
            <p style={{ marginBottom: '20px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>{result.summary}</p>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
                {(result.differences && result.differences.length > 0 && result.differences[0].sheets) ? (
                    <ExcelDiffViewer data={result.differences[0]} />
                ) : (result.differences && result.differences.length > 0 && result.differences[0].web_matches) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {result.differences[0].web_matches.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-success)', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px' }}>
                                未發現相似的網路內容 (No plagiarism detected)
                            </div>
                        ) : (
                            result.differences[0].web_matches.map((match: any, idx: number) => (
                                <div key={idx} className="glass" style={{ padding: '15px', borderLeft: match.similarity > 50 ? '4px solid #e74c3c' : '4px solid #f1c40f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <a href={match.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-earth-gold)', fontWeight: 600, textDecoration: 'none' }}>
                                            {match.title}
                                        </a>
                                        <span style={{ fontWeight: 'bold', color: match.similarity > 50 ? '#e74c3c' : '#f1c40f' }}>
                                            {match.similarity}% 相似
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                        {match.url}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                                        {match.snippet}...
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (mode === 'llm' || !isImageComparison) ? (
                    <SideBySideDiff diffs={result.differences} /> // Level 4: Use SideBySideDiff
                ) : (
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px' }}>
                        {result.differences.map((diff: any, idx: number) => (
                            <div key={idx} style={{ fontFamily: 'monospace', marginBottom: '4px' }}>
                                {typeof diff === 'string' ? diff : JSON.stringify(diff)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confidence Legend */}
            <div className={styles.legend}>
                <h4>可信度與相似度判斷標準</h4>
                <div className={styles.legendItem}>
                    <div className={styles.dot} style={{ background: '#e74c3c' }}></div>
                    <span>&lt; 5%：完全不相關（背景雜訊）</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.dot} style={{ background: '#f1c40f' }}></div>
                    <span>&gt; 30%：部分內容重疊或引用</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.dot} style={{ background: '#2ecc71' }}></div>
                    <span>&gt; 80%：高度相似或僅做微幅修改</span>
                </div>
            </div>
        </div>
    );
};
