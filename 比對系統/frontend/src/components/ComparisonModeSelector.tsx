import React from 'react';
import styles from './ComparisonModeSelector.module.css';

interface ComparisonModeSelectorProps {
    mode: 'local' | 'llm' | 'web';
    onChange: (mode: 'local' | 'llm' | 'web') => void;
}

export const ComparisonModeSelector: React.FC<ComparisonModeSelectorProps> = ({ mode, onChange }) => {
    return (
        <div className={`${styles.container} glass`}>
            <button
                className={`${styles.button} ${mode === 'local' ? styles.active : ''}`}
                onClick={() => onChange('local')}
            >
                快速比對 (Local)
            </button>
            <button
                className={`${styles.button} ${mode === 'llm' ? styles.active : ''}`}
                onClick={() => onChange('llm')}
            >
                精準分析 (LLM)
            </button>
            <button
                className={`${styles.button} ${mode === 'web' ? styles.active : ''}`}
                onClick={() => onChange('web')}
            >
                網路爬蟲 (Web)
            </button>
        </div>
    );
};
