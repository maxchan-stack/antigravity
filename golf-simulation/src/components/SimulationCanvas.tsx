import React, { useEffect, useRef, useState } from 'react';
import type { SimulationResult, Point } from '../physics/engine';
import { useSimulation } from '../hooks/useSimulation'; 
import { ChartsOverlay } from './ChartsOverlay';

interface SimulationCanvasProps {
  simulationResult: SimulationResult;
  currentRealPoint: Point;
  currentIdealPoint: Point;
  isPlaying: boolean;
  spinRate: number;
  currentTime: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  simulationResult,
  currentRealPoint,
  currentIdealPoint,
  isPlaying,
  spinRate,
  currentTime
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 監聽容器大小調整 Responsive
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 實際揮灑繪圖
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    
    // 設置高解析度繪圖 (對應 Retina 螢幕等)
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // 清空背景
    ctx.clearRect(0, 0, width, height);

    // 計算顯示的物理座標範圍
    const maxDist = Math.max(
      simulationResult.idealTrajectory[simulationResult.idealTrajectory.length - 1]?.x || 10,
      10
    );
    const maxH = Math.max(
      simulationResult.maxHeight,
      simulationResult.idealTrajectory.reduce((max, p) => Math.max(max, p.y), 0),
      10
    );

    // 留邊距 10%
    const margin = 50; 
    const viewWidth = width - margin * 2;
    const viewHeight = height - margin * 2;
    
    // 讓 X 軸與 Y 軸使用相同的縮放比例，以保持真實的幾何角度
    const scaleFactor = Math.min(viewWidth / maxDist, viewHeight / maxH);

    // 偏移量
    const offsetX = margin;
    const offsetY = height - margin;

    // 定義 helper function：物理座標轉換為螢幕 Pixels 座標
    const toScreen = (x: number, y: number) => {
      return {
        px: offsetX + x * scaleFactor,
        py: offsetY - y * scaleFactor
      };
    };

    // 1. 繪製底部草地/地面線
    ctx.beginPath();
    ctx.moveTo(offsetX - 20, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 標示物理距離刻度 (每 50m 一個刻度)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let x = 0; x <= maxDist; x += 50) {
      const { px, py } = toScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 5);
      ctx.stroke();
      if (x > 0) {
        ctx.fillText(`${x}m`, px, py + 20);
      }
    }

    // 標示高度刻度 (每 20m)
    ctx.textAlign = 'right';
    for (let y = 20; y <= maxH; y += 20) {
      const { px, py } = toScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(px - 5, py);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillText(`${y}m`, px - 10, py + 4);
    }

    // 2. 繪製理想軌跡 (虛線)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    simulationResult.idealTrajectory.forEach((p, idx) => {
      const { px, py } = toScreen(p.x, p.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 3. 繪製真實軌跡 (含空氣阻力)
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#06b6d4'; // Cyan
    ctx.lineWidth = 3;
    // 畫出陰影發光特效
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    simulationResult.realTrajectory.forEach((p, idx) => {
      const { px, py } = toScreen(p.x, p.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // 重置陰影

    // 4. 繪製當前動態位置點 (Ideal Point)
    const idealPos = toScreen(currentIdealPoint.x, currentIdealPoint.y);
    ctx.beginPath();
    ctx.arc(idealPos.px, idealPos.py, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    // 5. 繪製當前動態位置點 (Real Point) - The Golf Ball
    const realPos = toScreen(currentRealPoint.x, currentRealPoint.y);
    ctx.beginPath();
    ctx.arc(realPos.px, realPos.py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [simulationResult, currentRealPoint, currentIdealPoint, dimensions]);

  return (
    <div ref={containerRef} className="glass-panel canvas-container">
      <div className="canvas-legend">
        <div className="legend-item">
          <div className="color-box" style={{ background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }}></div>
          <span>真實軌跡 (含空氣阻力與馬格努斯效應)</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ border: '2px dashed rgba(255,255,255,0.5)', background: 'transparent' }}></div>
          <span>理想軌跡 (無阻力)</span>
        </div>
      </div>

      {/* Spinning Ball Visualizer */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: '0.875rem', color: '#94a3b8', letterSpacing: '0.05em' }}>
          轉動狀態 (Backspin)
        </span>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.5), inset -4px -4px 10px rgba(0,0,0,0.3)',
            position: 'relative',
            // CCW rotation for backspin. Speed scaled down visually.
            // If spinRate is 2500, it spins once every 0.24s.
            animation: (isPlaying && spinRate > 0) 
              ? `spin ${Math.max(0.1, 600 / spinRate)}s linear infinite reverse` 
              : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Add some dimple markings to show rotation */}
          <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', top: '15px', left: '20px' }}></div>
          <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', top: '35px', left: '10px' }}></div>
          <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', top: '40px', left: '40px' }}></div>
          <div style={{ position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', top: '20px', left: '40px' }}></div>
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>
          {spinRate} <span style={{ fontSize: '0.75rem' }}>RPM</span>
        </span>
      </div>

      <style>
        {`
          @keyframes spin {
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      {/* 散佈圖區域 */}
      <ChartsOverlay 
        realTrajectory={simulationResult.realTrajectory} 
        currentTime={currentTime} 
      />

      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />
    </div>
  );
};
