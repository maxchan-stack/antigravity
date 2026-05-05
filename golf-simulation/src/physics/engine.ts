export interface PhysicsParams {
  initialVelocity: number; // m/s
  launchAngle: number; // degrees
  dimpleCount: number; // 0 (smooth) to 500
  windSpeedX: number; // m/s
  spinRate: number; // rpm (轉速，正值代表下旋 backspin)
  mass: number; // kg
  area: number; // m^2
  airDensity: number; // kg/m^3
}

export interface StateVector {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number; // rpm
}

export interface Point {
  x: number;
  y: number;
  t: number;
  spin: number;
}

const g = 9.81; // Gravity (m/s^2)

/**
 * 計算狀態導數 d(state)/dt
 */
function getDerivatives(state: StateVector, params: PhysicsParams): StateVector {
  const { vx, vy, spin } = state;
  const { dimpleCount, windSpeedX, mass, area, airDensity } = params;

  // 轉速衰減導數
  const decayRate = 0.05; // 每秒 5%
  const dSpin = -decayRate * spin;

  // 動態計算阻力係數 Cd：0 個凹洞為 0.5 (光滑球體)，約 350 個凹洞最佳化 (Cd=0.25)
  const dimpleFactor = Math.pow((dimpleCount - 350) / 350, 2);
  const dragCoefficient = 0.5 - 0.25 * (1 - dimpleFactor);

  // 相對空氣的速度 (風向向右為正值的話，球相對於風的速度是球速 - 風速)
  const relVx = vx - windSpeedX;
  const relVy = vy; // 暫不考慮垂直風速
  
  const v = Math.sqrt(relVx * relVx + relVy * relVy);
  
  // 阻力 F_d = 1/2 * rho * Cd * A * v^2
  // 方向與相對速度相反
  const dragFactor = (0.5 * airDensity * dragCoefficient * area) / mass;
  
  // 計算馬格努斯效應 (Magnus Lift Force)
  // 角速度 omega = rpm * 2 * pi / 60
  const omega = (spin * 2 * Math.PI) / 60;
  const radius = Math.sqrt(area / Math.PI);
  
  let liftAx = 0;
  let liftAy = 0;
  
  if (v > 0.1) {
    const spinRatio = (radius * omega) / v;
    // 粗略的升力係數模型 Cl ~ 0.31 * S (針對高爾夫球的經驗法則)
    const Cl = 0.31 * spinRatio;
    const liftFactor = (0.5 * airDensity * Cl * area) / mass;
    
    // 升力方向與速度垂直 (在 2D 中，逆時針旋轉 90 度，即 (-Vy, Vx))
    // 假設為下旋 (Backspin)，所以會產生向上的升力
    liftAx = liftFactor * v * (-relVy);
    liftAy = liftFactor * v * relVx;
  }

  const ax = -dragFactor * v * relVx + liftAx;
  const ay = -g - dragFactor * v * relVy + liftAy;

  return {
    x: vx,
    y: vy,
    vx: ax,
    vy: ay,
    spin: dSpin,
  };
}

/**
 * 使用四階龍格-庫塔法 (RK4) 計算下一個狀態
 */
function rk4Step(state: StateVector, params: PhysicsParams, dt: number): StateVector {
  const k1 = getDerivatives(state, params);
  
  const stateK2 = {
    x: state.x + 0.5 * dt * k1.x,
    y: state.y + 0.5 * dt * k1.y,
    vx: state.vx + 0.5 * dt * k1.vx,
    vy: state.vy + 0.5 * dt * k1.vy,
    spin: state.spin + 0.5 * dt * k1.spin,
  };
  const k2 = getDerivatives(stateK2, params);
  
  const stateK3 = {
    x: state.x + 0.5 * dt * k2.x,
    y: state.y + 0.5 * dt * k2.y,
    vx: state.vx + 0.5 * dt * k2.vx,
    vy: state.vy + 0.5 * dt * k2.vy,
    spin: state.spin + 0.5 * dt * k2.spin,
  };
  const k3 = getDerivatives(stateK3, params);
  
  const stateK4 = {
    x: state.x + dt * k3.x,
    y: state.y + dt * k3.y,
    vx: state.vx + dt * k3.vx,
    vy: state.vy + dt * k3.vy,
    spin: state.spin + dt * k3.spin,
  };
  const k4 = getDerivatives(stateK4, params);

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    vx: state.vx + (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: state.vy + (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
    spin: state.spin + (dt / 6) * (k1.spin + 2 * k2.spin + 2 * k3.spin + k4.spin),
  };
}

export interface SimulationResult {
  realTrajectory: Point[];
  idealTrajectory: Point[];
  maxHeight: number;
  maxDistance: number;
  flightTime: number;
}

/**
 * 完整計算給定參數的飛行軌跡
 */
export function calculateTrajectory(params: PhysicsParams, dt: number = 0.01): SimulationResult {
  const angleRad = (params.launchAngle * Math.PI) / 180;
  
  // 初始狀態
  let state: StateVector = {
    x: 0,
    y: 0,
    vx: params.initialVelocity * Math.cos(angleRad),
    vy: params.initialVelocity * Math.sin(angleRad),
    spin: params.spinRate,
  };

  const realTrajectory: Point[] = [{ x: 0, y: 0, t: 0, spin: params.spinRate }];
  let t = 0;
  let maxHeight = 0;
  
  // 迴圈計算直到落地 (y < 0)
  // 設定防呆機制，避免無限迴圈（最多計算 30 秒）
  while (state.y >= 0 && t < 30) {
    state = rk4Step(state, params, dt);
    t += dt;
    
    if (state.y > maxHeight) {
      maxHeight = state.y;
    }
    
    // 只在 y > 0 紀錄點 (如果因 dt 跑到地下，做簡單線性插值找地面點)
    if (state.y < 0) {
      const prev = realTrajectory[realTrajectory.length - 1];
      const fraction = prev.y / (prev.y - state.y);
      const groundX = prev.x + fraction * (state.x - prev.x);
      const groundT = prev.t + fraction * dt;
      realTrajectory.push({ x: groundX, y: 0, t: groundT, spin: state.spin });
      break;
    }
    
    realTrajectory.push({ x: state.x, y: state.y, t, spin: state.spin });
  }

  const maxDistance = realTrajectory[realTrajectory.length - 1].x;
  const flightTime = realTrajectory[realTrajectory.length - 1].t;

  // 計算理想軌跡 (無空氣阻力)
  const idealTrajectory: Point[] = [];
  const v0x = params.initialVelocity * Math.cos(angleRad);
  const v0y = params.initialVelocity * Math.sin(angleRad);
  // 理想落地時間 t_end = 2 * v0y / g
  const tEndIdeal = (2 * v0y) / g;
  const idealSteps = Math.ceil(tEndIdeal / dt);
  
  for (let i = 0; i <= idealSteps; i++) {
    const ti = Math.min(i * dt, tEndIdeal);
    const xi = v0x * ti;
    const yi = v0y * ti - 0.5 * g * ti * ti;
    if (yi < 0 && i > 0) {
      idealTrajectory.push({ x: v0x * tEndIdeal, y: 0, t: tEndIdeal, spin: 0 });
      break;
    }
    idealTrajectory.push({ x: xi, y: Math.max(0, yi), t: ti, spin: 0 });
  }

  return {
    realTrajectory,
    idealTrajectory,
    maxHeight,
    maxDistance,
    flightTime,
  };
}
