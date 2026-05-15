import React, { useState } from 'react';

interface CellDiff {
    value: string;
    old_value?: string;
    status: 'equal' | 'changed' | 'added' | 'deleted';
}

interface RowDiff {
    cells: CellDiff[];
}

interface SheetDiff {
    name: string;
    rows: RowDiff[];
}

interface ExcelDiffViewerProps {
    data: {
        sheets: SheetDiff[];
    };
}

export const ExcelDiffViewer: React.FC<ExcelDiffViewerProps> = ({ data }) => {
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(50);
    const BATCH_SIZE = 50;

    if (!data || !data.sheets || data.sheets.length === 0) {
        return <div>無需比對資料 (No Excel Data Found)</div>;
    }

    const { sheets } = data;
    const activeSheet = sheets[activeSheetIndex];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 200) {
            if (visibleCount < activeSheet.rows.length) {
                setVisibleCount(prev => Math.min(prev + BATCH_SIZE, activeSheet.rows.length));
            }
        }
    };

    const handleSheetChange = (idx: number) => {
        setActiveSheetIndex(idx);
        setVisibleCount(BATCH_SIZE); // Reset scroll on sheet change
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}>
            {/* Sheet Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '10px', overflowX: 'auto' }}>
                {sheets.map((sheet, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSheetChange(idx)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: activeSheetIndex === idx ? 'var(--color-bg-secondary)' : 'transparent',
                            color: activeSheetIndex === idx ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeSheetIndex === idx ? '2px solid var(--color-earth-gold)' : 'none',
                            cursor: 'pointer',
                            fontWeight: activeSheetIndex === idx ? 'bold' : 'normal'
                        }}
                    >
                        {sheet.name}
                    </button>
                ))}
            </div>

            {/* Table View */}
            <div
                style={{ flex: 1, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}
                onScroll={handleScroll}
            >
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                    <tbody>
                        {activeSheet.rows.slice(0, visibleCount).map((row, rIdx) => (
                            <tr key={rIdx}>
                                {/* Row Index */}
                                <td style={{
                                    background: '#f8f9fa',
                                    border: '1px solid #ddd',
                                    padding: '4px 8px',
                                    width: '30px',
                                    textAlign: 'center',
                                    color: '#999'
                                }}>
                                    {rIdx + 1}
                                </td>

                                {row.cells.map((cell, cIdx) => (
                                    <td
                                        key={cIdx}
                                        title={cell.status === 'changed' ? `Original: ${cell.old_value}` : undefined}
                                        style={{
                                            border: '1px solid #ddd',
                                            padding: '6px',
                                            backgroundColor:
                                                cell.status === 'changed' ? 'rgba(241, 196, 15, 0.2)' :
                                                    cell.status === 'added' ? 'rgba(46, 204, 113, 0.2)' :
                                                        cell.status === 'deleted' ? 'rgba(231, 76, 60, 0.2)' : 'white',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    >
                                        <div style={{
                                            minWidth: '80px',
                                            maxWidth: '300px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {cell.value}
                                        </div>
                                        {cell.status === 'changed' && (
                                            <span style={{
                                                display: 'block',
                                                fontSize: '10px',
                                                color: '#e67e22',
                                                marginTop: '2px'
                                            }}>
                                                (was: {cell.old_value})
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {visibleCount < activeSheet.rows.length && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                        載入更多... (Loading more: {visibleCount} / {activeSheet.rows.length})
                    </div>
                )}
            </div>

            <div style={{ marginTop: '10px', fontSize: '12px', display: 'flex', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, background: 'rgba(241, 196, 15, 0.2)', border: '1px solid #ddd' }}></div>
                    <span>修改 (Modified)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, background: 'rgba(46, 204, 113, 0.2)', border: '1px solid #ddd' }}></div>
                    <span>新增 (Added)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #ddd' }}></div>
                    <span>刪除 (Deleted)</span>
                </div>
            </div>
        </div>
    );
};
