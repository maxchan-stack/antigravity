import React, { useRef, useState } from 'react';
import styles from './SideBySideDiff.module.css';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DiffLineContent {
    line: number | null;
    content: string;
}

interface DiffRow {
    type: 'equal' | 'replace' | 'delete' | 'insert';
    left: DiffLineContent;
    right: DiffLineContent;
    highlights?: [string, number, number, number, number][]; // Tuple from python
}

interface SideBySideDiffProps {
    diffs: DiffRow[];
}

export const SideBySideDiff: React.FC<SideBySideDiffProps> = ({ diffs }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [currentDiffIndex, setCurrentDiffIndex] = useState(-1);
    const [visibleCount, setVisibleCount] = useState(100);
    const BATCH_SIZE = 100;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // If scrolled near bottom (within 200px), load more
        if (scrollHeight - scrollTop - clientHeight < 200) {
            if (visibleCount < diffs.length) {
                setVisibleCount(prev => Math.min(prev + BATCH_SIZE, diffs.length));
            }
        }
    };

    // Find all indices of rows that are not 'equal'
    const diffIndices = diffs.map((row, index) => row.type !== 'equal' ? index : -1).filter(i => i !== -1);

    const scrollToDiff = (index: number) => {
        if (!scrollContainerRef.current) return;

        // Ensure the target row is rendered
        if (index >= visibleCount) {
            setVisibleCount(Math.min(index + BATCH_SIZE, diffs.length));
            // Wait for render cycle? React state updates are async.
            // We might need useEffect or setTimeout to scroll after render.
            setTimeout(() => doScroll(index), 100);
        } else {
            doScroll(index);
        }
    };

    const doScroll = (index: number) => {
        if (!scrollContainerRef.current) return;
        const wrapper = scrollContainerRef.current.children[0]?.children[0];
        if (!wrapper) return;

        const rowElement = wrapper.children[index] as HTMLElement;
        if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setCurrentDiffIndex(index);
        }
    };

    // ... navigation handlers ...

    const handleNextDiff = () => {
        if (diffIndices.length === 0) return;
        let nextIndex = diffIndices.find(i => i > currentDiffIndex);
        if (nextIndex === undefined) return;
        scrollToDiff(nextIndex);
    };

    const handlePrevDiff = () => {
        if (diffIndices.length === 0) return;
        let prevIndex = [...diffIndices].reverse().find(i => i < currentDiffIndex);
        if (prevIndex === undefined) return;
        scrollToDiff(prevIndex);
    };

    // ... renderHighlightedText ...

    const renderHighlightedText = (content: string, highlights: [string, number, number, number, number][], side: 'left' | 'right') => {
        // ... same implementation ...
        if (!highlights || highlights.length === 0) return content;
        // ... (truncated for brevity, ensure you keep the original logic)
        const fragments = [];
        let lastIndex = 0;
        const sortedHighlights = [...highlights].sort((h1, h2) => {
            const idx1 = side === 'left' ? h1[1] : h1[3];
            const idx2 = side === 'left' ? h2[1] : h2[3];
            return idx1 - idx2;
        });
        sortedHighlights.forEach((h, i) => {
            const [op, a, b, c, d] = h;
            const start = side === 'left' ? a : c;
            const end = side === 'left' ? b : d;
            if (start > lastIndex) {
                fragments.push(<span key={`text-${i}`}>{content.substring(lastIndex, start)}</span>);
            }
            if (op === 'replace' || (op === 'delete' && side === 'left') || (op === 'insert' && side === 'right')) {
                const className = side === 'left' ? styles.highlightRemoved : styles.highlightAdded;
                fragments.push(<span key={`hl-${i}`} className={className}>{content.substring(start, end)}</span>);
            } else {
                fragments.push(<span key={`eq-${i}`}>{content.substring(start, end)}</span>);
            }
            lastIndex = end;
        });
        if (lastIndex < content.length) {
            fragments.push(<span key="text-end">{content.substring(lastIndex)}</span>);
        }
        return fragments;
    };

    return (
        <div className={styles.container} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', right: '20px', zIndex: 10, display: 'flex', gap: '5px' }}>
                <button
                    onClick={handlePrevDiff}
                    className={styles.navButton}
                    title="上一個差異"
                    disabled={diffIndices.length === 0}
                >
                    <ChevronUp size={16} />
                </button>
                <button
                    onClick={handleNextDiff}
                    className={styles.navButton}
                    title="下一個差異"
                    disabled={diffIndices.length === 0}
                >
                    <ChevronDown size={16} />
                </button>
                <span style={{ fontSize: '12px', color: '#666', alignSelf: 'center', marginLeft: '10px' }}>

                </span>
            </div>

            <div className={styles.diffHeader}>
                <div className={styles.columnHeader}>原始文件 (Original)</div>
                <div className={styles.columnHeader}>比對文件 (Target)</div>
            </div>

            <div className={styles.scrollContainer} ref={scrollContainerRef} onScroll={handleScroll}>
                <div className={styles.diffContent}>
                    <div style={{ width: '100%' }}>
                        {diffs.slice(0, visibleCount).map((row, index) => (
                            <div key={index} className={`${styles.row} ${styles[row.type]}`}
                                style={currentDiffIndex === index ? { border: '2px solid var(--color-earth-gold)' } : {}}>
                                {/* Left Pane */}
                                <div className={styles.rowLeft}>
                                    <div className={styles.lineNumber}>
                                        {row.left.line || ''}
                                    </div>
                                    <div className={styles.codeContent}>
                                        {row.type === 'replace' && row.highlights
                                            ? renderHighlightedText(row.left.content, row.highlights, 'left')
                                            : row.left.content
                                        }
                                    </div>
                                </div>

                                {/* Right Pane */}
                                <div className={styles.rowRight}>
                                    <div className={styles.lineNumber}>
                                        {row.right.line || ''}
                                    </div>
                                    <div className={styles.codeContent}>
                                        {row.type === 'replace' && row.highlights
                                            ? renderHighlightedText(row.right.content, row.highlights, 'right')
                                            : row.right.content
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                        {visibleCount < diffs.length && (
                            <div style={{ padding: '10px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                                載入更多... (Loading more)
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
