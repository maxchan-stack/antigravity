import { useState, useEffect, useMemo, useRef } from 'react';
import type { PhysicsParams, SimulationResult, Point } from '../physics/engine';

import { calculateTrajectory } from '../physics/engine';

export function useSimulation() {
  // 預設高爾夫球參數
  const defaultParams: PhysicsParams = {
    initialVelocity: 50,    // 大約 110 mph 左右
    launchAngle: 15,        // 度
    dimpleCount: 350,       // 高爾夫球常見凹洞數 (帶來最佳 Cd ~ 0.25)
    windSpeedX: 0,          // 無風
    spinRate: 2500,         // rpm (常見起手轉速)
    mass: 0.04593,          // 高爾夫球標準質量 kg
    area: 0.001432,         // 截面積 m^2
    airDensity: 1.225,      // db 海平面空氣密度 kg/m^3
  };

  const [params, setParams] = useState<PhysicsParams>(defaultParams);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // 當參數改變時，重新計算軌跡。由於資料量不大，每次參數改變都重算可達即時回饋效果。
  const simulationResult = useMemo<SimulationResult>(() => {
    return calculateTrajectory(params);
  }, [params]);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const dt = (time - lastTimeRef.current) / 1000;
        // 加速播放，或是維持 1:1，這邊選擇 1:1，但高爾夫球通常飛 6~7 秒，1:1 會覺得稍微有點慢
        // 這邊我們讓時間跑快一點，比如 2 倍速
        setCurrentTime((prev) => {
          const nextTime = prev + dt * 1.5;
          if (nextTime >= simulationResult.flightTime) {
            setIsPlaying(false);
            return simulationResult.flightTime;
          }
          return nextTime;
        });
      }
      lastTimeRef.current = time;
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, simulationResult.flightTime]);

  // 當使用者暫停並手動拉扯時間軸，或重新播放時重置時間
  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    lastTimeRef.current = null;
  };

  const togglePlay = () => {
    if (!isPlaying && currentTime >= simulationResult.flightTime) {
      setCurrentTime(0); // 如果已經到底了就從頭
    }
    setIsPlaying(!isPlaying);
    lastTimeRef.current = performance.now();
  };

  // 給定當前時間，內插計算目前球的精確位置
  const getCurrentPoint = (trajectory: Point[], t: number): Point => {
    if (trajectory.length === 0) return { x: 0, y: 0, t: 0 };
    if (t >= trajectory[trajectory.length - 1].t) return trajectory[trajectory.length - 1];

    // 尋找最近的點
    let low = 0;
    let high = trajectory.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (trajectory[mid].t === t) return trajectory[mid];
      if (trajectory[mid].t < t) low = mid + 1;
      else high = mid - 1;
    }

    const p1 = trajectory[high];
    const p2 = trajectory[low];
    if (!p1 || !p2) return trajectory[0];

    // 線性內插
    const fraction = (t - p1.t) / (p2.t - p1.t);
    return {
      x: p1.x + fraction * (p2.x - p1.x),
      y: p1.y + fraction * (p2.y - p1.y),
      t,
    };
  };

  const currentRealPoint = useMemo(() => getCurrentPoint(simulationResult.realTrajectory, currentTime), [simulationResult.realTrajectory, currentTime]);
  const currentIdealPoint = useMemo(() => getCurrentPoint(simulationResult.idealTrajectory, currentTime), [simulationResult.idealTrajectory, currentTime]);

  return {
    params,
    setParams,
    simulationResult,
    isPlaying,
    togglePlay,
    reset,
    currentTime,
    setCurrentTime,
    currentRealPoint,
    currentIdealPoint,
  };
}
