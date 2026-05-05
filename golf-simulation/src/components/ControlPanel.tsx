import React from 'react';
import type { PhysicsParams, SimulationResult } from '../physics/engine';

interface ControlPanelProps {
  params: PhysicsParams;
  setParams: React.Dispatch<React.SetStateAction<PhysicsParams>>;
  isPlaying: boolean;
  togglePlay: () => void;
  reset: () => void;
  currentTime: number;
  simulationResult: SimulationResult;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  setParams,
  isPlaying,
  togglePlay,
  reset,
  currentTime,
  simulationResult
}) => {
  const handleChange = (key: keyof PhysicsParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
    reset(); // 當參數改變時重置時間
  };

  return (
    <div className="glass-panel control-panel">
      <div className="panel-header">
        <h1>Golf Ball Physics</h1>
        <p>互動斜拋模擬 (RK4 空氣阻力)</p>
      </div>

      <div className="control-group">
        <div className="control-item">
          <div className="control-item-header">
            <span>初速 (Initial Velocity)</span>
            <span className="control-value">{params.initialVelocity} m/s</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="1"
            value={params.initialVelocity}
            onChange={(e) => handleChange('initialVelocity', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-item-header">
            <span>發射角 (Launch Angle)</span>
            <span className="control-value">{params.launchAngle}°</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="90" 
            step="1"
            value={params.launchAngle}
            onChange={(e) => handleChange('launchAngle', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-item-header">
            <span>凹洞數量 (Dimple Count)</span>
            <span className="control-value">{params.dimpleCount} 洞</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="500" 
            step="10"
            value={params.dimpleCount}
            onChange={(e) => handleChange('dimpleCount', parseFloat(e.target.value))}
          />
          <div style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '4px'}}>
            推算阻力係數 Cd: {(0.5 - 0.25 * (1 - Math.pow((params.dimpleCount - 350) / 350, 2))).toFixed(3)}
          </div>
        </div>

        <div className="control-item">
          <div className="control-item-header">
            <span>風速 X (Wind Speed X)</span>
            <span className="control-value">{params.windSpeedX} m/s</span>
          </div>
          <input 
            type="range" 
            min="-30" 
            max="30" 
            step="1"
            value={params.windSpeedX}
            onChange={(e) => handleChange('windSpeedX', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-item-header">
            <span>轉速 (Spin Rate / Backspin)</span>
            <span className="control-value">{params.spinRate} rpm</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="6000" 
            step="100"
            value={params.spinRate}
            onChange={(e) => handleChange('spinRate', parseFloat(e.target.value))}
          />
          <div style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '4px'}}>
            產生馬格努斯效應 (Magnus Lift)
          </div>
        </div>
      </div>

      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">飛行時間</span>
          <span className="stat-value">{currentTime.toFixed(2)} / {simulationResult.flightTime.toFixed(2)}s</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">最大高度</span>
          <span className="stat-value">{simulationResult.maxHeight.toFixed(1)}m</span>
        </div>
        <div className="stat-item" style={{ gridColumn: 'span 2' }}>
          <span className="stat-label">最遠落點距離 (含阻力)</span>
          <span className="stat-value">{simulationResult.maxDistance.toFixed(1)}m</span>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={togglePlay} className="btn-accent">
          {isPlaying ? '暫停 (Pause)' : '播放 (Play)'}
        </button>
        <button onClick={reset}>
          重設 (Reset)
        </button>
      </div>
    </div>
  );
};
