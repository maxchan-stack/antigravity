import React from 'react';
import styles from './TextDiffViewer.module.css';

interface TextDiffViewerProps {
    diffs: string[];
}

export const TextDiffViewer: React.FC<TextDiffViewerProps> = ({ diffs }) => {
    // Process diffs to classify lines
    const lines = diffs.map((line, index) => {
        let type: 'added' | 'removed' | 'unchanged' | 'context' = 'unchanged';
        let content = line;

        if (line.startsWith('- ')) {
            type = 'removed';
            content = line.substring(2);
        } else if (line.startsWith('+ ')) {
            type = 'added';
            content = line.substring(2);
        } else if (line.startsWith('? ')) {
            type = 'context'; // Usually ignore or show as hint? 
            // difflib ndiff uses ? for hint lines below + or -
            // Let's hide them for cleaner UI or show them subtly.
            return null;
        } else if (line.startsWith('  ')) {
            content = line.substring(2);
        }

        return { type, content, index };
    }).filter(Boolean); // Remove nulls

    return (
        <div className={`${styles.container} glass`}>
            <div className={styles.scrollArea}>
                {lines.map((item: any, i) => (
                    <div key={i} className={`${styles.line} ${styles[item.type]}`}>
                        <span className={styles.lineNumber}>{i + 1}</span>
                        <pre className={styles.content}>{item.content}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
};
