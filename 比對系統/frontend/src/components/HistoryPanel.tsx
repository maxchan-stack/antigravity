import React from 'react';
import { Clock, Trash2, FileText, ImageIcon, X } from 'lucide-react';
import styles from './HistoryPanel.module.css';

interface HistoryItem {
    id: string;
    timestamp: string;
    fileName1: string;
    fileName2: string;
    mode: string;
    result: any;
    type: 'image' | 'text';
}

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
    isOpen,
    onClose,
    history,
    onSelect,
    onClear
}) => {
    return (
        <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} />
                    <h3>最近比對紀錄</h3>
                </div>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className={styles.content}>
                {history.length === 0 ? (
                    <div className={styles.empty}>
                        尚無紀錄
                    </div>
                ) : (
                    <>
                        <div className={styles.list}>
                            {history.map(item => (
                                <div
                                    key={item.id}
                                    className={styles.item}
                                    onClick={() => onSelect(item)}
                                >
                                    <div className={styles.itemHeader}>
                                        <span className={styles.timestamp}>{item.timestamp}</span>
                                        {item.type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    </div>
                                    <div className={styles.filenames}>
                                        <div className={styles.file}>{item.fileName1}</div>
                                        <div className={styles.vs}>vs</div>
                                        <div className={styles.file}>{item.fileName2}</div>
                                    </div>
                                    <div className={styles.score}>
                                        相似度: {item.result.similarity_score}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className={styles.clearButton} onClick={onClear}>
                            <Trash2 size={16} />
                            清除所有紀錄
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
