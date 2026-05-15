import React from 'react';
import styles from './SplitView.module.css';

interface SplitViewProps {
    left: React.ReactNode;
    right: React.ReactNode;
}

export const SplitView: React.FC<SplitViewProps> = ({ left, right }) => {
    return (
        <div className={styles.container}>
            <div className={styles.pane}>{left}</div>
            <div className={styles.divider}></div>
            <div className={styles.pane}>{right}</div>
        </div>
    );
};
