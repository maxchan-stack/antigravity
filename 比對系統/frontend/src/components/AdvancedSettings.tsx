import React from 'react';

interface AdvancedSettingsProps {
    options: {
        whitespace: boolean;
        case: boolean;
        timestamps: boolean;
    };
    onChange: (options: { whitespace: boolean; case: boolean; timestamps: boolean; }) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ options, onChange }) => {
    const handleChange = (key: keyof typeof options) => {
        onChange({ ...options, [key]: !options[key] });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--figma-text-primary)' }}>
                <input
                    type="checkbox"
                    checked={options.whitespace}
                    onChange={() => handleChange('whitespace')}
                    style={{ accentColor: 'var(--figma-accent)' }}
                />
                Ignore Whitespace (忽略空白)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--figma-text-primary)' }}>
                <input
                    type="checkbox"
                    checked={options.case}
                    onChange={() => handleChange('case')}
                    style={{ accentColor: 'var(--figma-accent)' }}
                />
                Ignore Case (忽略大小寫)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--figma-text-primary)' }}>
                <input
                    type="checkbox"
                    checked={options.timestamps}
                    onChange={() => handleChange('timestamps')}
                    style={{ accentColor: 'var(--figma-accent)' }}
                />
                Ignore Timestamps (忽略時間戳記)
            </label>
        </div>
    );
};
