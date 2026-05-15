import React, { useCallback } from 'react';
import styles from './UploadZone.module.css';

interface UploadZoneProps {
    onFileSelected: (file: File) => void;
    label?: string;
    accept?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, label = "上傳檔案", accept }) => {
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelected(e.dataTransfer.files[0]);
        }
    }, [onFileSelected]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelected(e.target.files[0]);
        }
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                border: '1px dashed var(--figma-border-strong)',
                borderRadius: '6px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
                backgroundColor: 'var(--figma-bg-app)',
                color: 'var(--figma-text-secondary)',
                fontSize: '13px'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--figma-accent)';
                e.currentTarget.style.backgroundColor = 'var(--figma-bg-hover)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--figma-border-strong)';
                e.currentTarget.style.backgroundColor = 'var(--figma-bg-app)';
            }}
        >
            <input
                type="file"
                className={styles.input}
                onChange={handleChange}
                accept={accept}
                id={`file-upload-${label}`}
                style={{ display: 'none' }}
            />
            <label htmlFor={`file-upload-${label}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '20px', color: 'var(--figma-text-primary)' }}>+</div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {label}
                </span>
            </label>
        </div>
    );
};
