import React, { useRef, useEffect, useState } from 'react';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
}

interface ImageViewerProps {
    file: File;
    boxes?: BoundingBox[];
    color?: string;
    imageStyle?: React.CSSProperties;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, boxes = [], color = '#ff0000', imageStyle }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    // Force re-render when image loads to ensure ref dimensions are available if needed
    const [loaded, setLoaded] = useState(false);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {imageUrl && (
                <>
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', ...imageStyle }}
                        onLoad={() => setLoaded(true)}
                    />
                    {loaded && imgRef.current && boxes.length > 0 && (
                        <svg
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                        >
                            {boxes.map((box, i) => (
                                <rect
                                    key={i}
                                    x={box.x}
                                    y={box.y}
                                    width={box.width}
                                    height={box.height}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="2" // This might need scaling relative to image size to be visible on large imgs
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                        </svg>
                    )}
                </>
            )}
        </div>
    );
};
