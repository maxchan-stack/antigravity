import React from 'react';
import type { Point } from '../physics/engine';

interface ChartsOverlayProps {
  realTrajectory: Point[];
  currentTime: number;
}

export const ChartsOverlay: React.FC<ChartsOverlayProps> = ({ realTrajectory, currentTime }) => {
  if (!realTrajectory || realTrajectory.length === 0) return null;

  const width = 280;
  const height = 120;
  const padding = 20;

  const maxTime = Math.max(...realTrajectory.map(p => p.t), 1);
  const maxSpin = Math.max(...realTrajectory.map(p => p.spin), 1000);
  const maxDist = Math.max(...realTrajectory.map(p => p.x), 10);

  // Helper points 
  const currentData = realTrajectory.filter(p => p.t <= currentTime);
  
  // Transform helpers
  const toX = (t: number) => padding + (t / maxTime) * (width - padding * 2);
  const toYSpin = (spin: number) => height - padding - (spin / maxSpin) * (height - padding * 2);
  const toYDist = (dist: number) => height - padding - (dist / maxDist) * (height - padding * 2);

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      background: 'rgba(0, 0, 0, 0.4)',
      padding: '16px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>飛行過程數據散佈圖</span>

      {/* Chart 1: Spin vs Time */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '4px' }}>轉速 (RPM) vs 時間 (s)</span>
        <svg width={width} height={height} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          {/* Axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="2" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#334155" strokeWidth="2" />
          
          {/* Scatter Points / Line */}
          <polyline 
            fill="none" 
            stroke="#10b981" 
            strokeWidth="2" 
            points={currentData.map(p => `${toX(p.t)},${toYSpin(p.spin)}`).join(' ')} 
          />
          {currentData.length > 0 && (
            <circle 
              cx={toX(currentData[currentData.length - 1].t)} 
              cy={toYSpin(currentData[currentData.length - 1].spin)} 
              r="4" 
              fill="#fff" 
            />
          )}

          {/* Labels */}
          <text x={padding} y={padding - 5} fill="#94a3b8" fontSize="10">{Math.round(maxSpin)}</text>
          <text x={width - padding} y={height - 5} fill="#94a3b8" fontSize="10">{maxTime.toFixed(1)}s</text>
        </svg>
      </div>

      {/* Chart 2: Dist vs Time */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.75rem', color: '#06b6d4', marginBottom: '4px' }}>水平距離 (m) vs 時間 (s)</span>
        <svg width={width} height={height} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          {/* Axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="2" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#334155" strokeWidth="2" />
          
          {/* Scatter Points / Line */}
          <polyline 
            fill="none" 
            stroke="#06b6d4" 
            strokeWidth="2" 
            points={currentData.map(p => `${toX(p.t)},${toYDist(p.x)}`).join(' ')} 
          />
          {currentData.length > 0 && (
            <circle 
              cx={toX(currentData[currentData.length - 1].t)} 
              cy={toYDist(currentData[currentData.length - 1].x)} 
              r="4" 
              fill="#fff" 
            />
          )}

          {/* Labels */}
          <text x={padding} y={padding - 5} fill="#94a3b8" fontSize="10">{Math.round(maxDist)}m</text>
          <text x={width - padding} y={height - 5} fill="#94a3b8" fontSize="10">{maxTime.toFixed(1)}s</text>
        </svg>
      </div>
    </div>
  );
};
