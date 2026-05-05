import React, { useEffect, useRef, useState } from 'react';
import { calculateCurrentAngle } from '../lib/physics';

interface PendulumCanvasProps {
    length: number;       // 0.1 ~ 3.0 m
    initialAngle: number; // 1 ~ 90 degree
    mass: number;         // 0.1 ~ 5.0 kg
    period: number;       // s
    isRunning: boolean;
}

export const PendulumCanvas: React.FC<PendulumCanvasProps> = ({ length, initialAngle, mass, period, isRunning }) => {
    const [currentAngle, setCurrentAngle] = useState(initialAngle);
    const timeRef = useRef<number>(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());

    useEffect(() => {
        if (!isRunning) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            timeRef.current = 0;
            setCurrentAngle(initialAngle);
            return;
        }

        const animate = (time: number) => {
            const deltaTime = (time - lastTimeRef.current) / 1000; // in seconds
            lastTimeRef.current = time;

            timeRef.current += deltaTime;
            const newAngle = calculateCurrentAngle(timeRef.current, period, initialAngle);
            setCurrentAngle(newAngle);

            animationRef.current = requestAnimationFrame(animate);
        };

        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isRunning, length, initialAngle, period]);

    // 動畫顯示常數
    const originX = 200;
    const originY = 50;
    // 將物理長度 (0.1~3.0) 映射到螢幕像素 (max 250px)
    const pxPerMeter = 100;
    const displayLength = length * pxPerMeter;

    // 繪製位置計算
    const angleRad = currentAngle * (Math.PI / 180);
    const bobX = originX + displayLength * Math.sin(angleRad);
    const bobY = originY + displayLength * Math.cos(angleRad);

    // 質量影響球的半徑 (視覺效果)
    const bobRadius = 10 + Math.sqrt(mass) * 8;

    // 輔助線與軌跡計算
    // 平衡點 (x = originX, y = originY + displayLength)
    const eqY = originY + displayLength;

    // 兩側端點 (最大擺角即 initialAngle)
    const maxAngleRad = initialAngle * (Math.PI / 180);
    const leftEndX = originX - displayLength * Math.sin(maxAngleRad);
    const leftEndY = originY + displayLength * Math.cos(maxAngleRad);
    const rightEndX = originX + displayLength * Math.sin(maxAngleRad);
    const rightEndY = originY + displayLength * Math.cos(maxAngleRad);

    // 軌跡圓弧 (SVG arc path)
    // d="M leftEndX leftEndY A r r 0 0 0 rightEndX rightEndY"
    const arcPath = `M ${leftEndX} ${leftEndY} A ${displayLength} ${displayLength} 0 0 0 ${rightEndX} ${rightEndY}`;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">單擺即時動畫</h3>
            <svg width="400" height="400" className="bg-slate-50 rounded-lg">
                {/* 支點 */}
                <line x1={originX - 50} y1={originY} x2={originX + 50} y2={originY} stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                <circle cx={originX} cy={originY} r="4" fill="#0f172a" />

                {/* 運動軌跡線 (圓弧) */}
                <path d={arcPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

                {/* 平衡點 (鉛垂線) */}
                <line x1={originX} y1={originY} x2={originX} y2={eqY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 5" />
                <circle cx={originX} cy={eqY} r="3" fill="#94a3b8" />
                <text x={originX} y={eqY + 30} fill="#000000" fontSize="22" fontWeight="bold" textAnchor="middle">平衡點</text>

                {/* 左右端點指示線 */}
                <line x1={originX} y1={originY} x2={leftEndX} y2={leftEndY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={leftEndX} cy={leftEndY} r="3" fill="#cbd5e1" />
                <text x={leftEndX - 15} y={leftEndY + 25} fill="#000000" fontSize="22" fontWeight="bold" textAnchor="end">端點</text>

                <line x1={originX} y1={originY} x2={rightEndX} y2={rightEndY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={rightEndX} cy={rightEndY} r="3" fill="#cbd5e1" />
                <text x={rightEndX + 15} y={rightEndY + 25} fill="#000000" fontSize="22" fontWeight="bold" textAnchor="start">端點</text>

                {/* 擺線 */}
                <line x1={originX} y1={originY} x2={bobX} y2={bobY} stroke="#475569" strokeWidth="2" />

                {/* 擺錘 */}
                <circle cx={bobX} cy={bobY} r={bobRadius} fill="#3b82f6" stroke="#2563eb" strokeWidth="2" className="shadow-lg" />

                {/* 資訊顯示 */}
                <text x="10" y="20" fill="#64748b" fontSize="12">角度: {currentAngle.toFixed(1)}°</text>
                <text x="10" y="40" fill="#64748b" fontSize="12">週期: {period.toFixed(3)} s</text>
            </svg>
        </div>
    );
};
