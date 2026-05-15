import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageSlider.module.css';

interface ImageSliderProps {
    image1: File | string; // Original (Before)
    image2: File | string; // Target (After)
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ image1, image2 }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [img1Url, setImg1Url] = useState<string | null>(null);
    const [img2Url, setImg2Url] = useState<string | null>(null);

    // Create object URLs for files or use string directly
    useEffect(() => {
        if (!image1) return;
        if (typeof image1 === 'string') {
            setImg1Url(image1);
        } else {
            const url = URL.createObjectURL(image1);
            setImg1Url(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [image1]);

    useEffect(() => {
        if (!image2) return;
        if (typeof image2 === 'string') {
            setImg2Url(image2);
        } else {
            const url = URL.createObjectURL(image2);
            setImg2Url(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [image2]);

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let clientX;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as React.MouseEvent).clientX;
        }

        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;

        setSliderPosition(percentage);
    };

    // Global event listeners for drag end/move to handle dragging outside container
    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;
            setSliderPosition(percentage);
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('touchend', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, [isDragging]);

    if (!img1Url || !img2Url) return <div>Loading images...</div>;

    return (
        <div
            className={styles.container}
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            {/* Background Image (Target/After) */}
            <div className={styles.imageWrapper}>
                <img src={img2Url} alt="Target" className={styles.image} />
            </div>

            {/* Foreground Image (Original/Before) - Clipped */}
            <div
                className={styles.overlay}
                style={{ width: `${sliderPosition}%` }}
            >
                {/* 
                   IMPORTANT: The image inside the clipped overlay must have the same width 
                   as the container to align pixels perfectly. 
                */}
                <img
                    src={img1Url}
                    alt="Original"
                    className={styles.overlayImage}
                    style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
                />
            </div>

            {/* Slider Handle */}
            <div
                className={styles.sliderHandle}
                style={{ left: `${sliderPosition}%` }}
            >
                <div className={styles.sliderButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-obsidian-grey)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                        <polyline points="9 18 3 12 9 6" style={{ display: 'none' }}></polyline> {/* Simplified icon */}
                        <path d="M18 12H6" style={{ display: 'none' }}></path>
                        <path d="M8 9l-4 3 4 3" fill="none"></path>
                        <path d="M16 9l4 3-4 3" fill="none"></path>
                    </svg>
                </div>
            </div>

            {/* Labels */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                pointerEvents: 'none'
            }}>原始 (Original)</div>

            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                pointerEvents: 'none'
            }}>比對 (Target)</div>
        </div>
    );
};
