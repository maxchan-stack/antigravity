export const GRAVITY = 9.81; // m/s^2

/**
 * 計算單擺週期，考慮大角度修正。
 * @param length 擺長 (m)
 * @param initialAngle 初始角度 (degree)
 * @returns 週期 (s)
 */
export function calculatePeriod(length: number, initialAngle: number): number {
    if (length <= 0) return 0;

    const theta0 = initialAngle * (Math.PI / 180);
    const T0 = 2 * Math.PI * Math.sqrt(length / GRAVITY);

    // 大角度泰勒展開修正公式
    const correction = 1 + (1 / 16) * Math.pow(theta0, 2) + (11 / 3072) * Math.pow(theta0, 4);

    return T0 * correction;
}

/**
 * 計算當下時間 t 的擺角。
 * 此處為簡化設計，採用帶有大角度修正週期的諧和運動方程式。
 * @param time 經過時間 (s)
 * @param period 修正後週期 (s)
 * @param initialAngle 初始角度 (degree)
 * @returns 當下的角度 (degree)
 */
export function calculateCurrentAngle(time: number, period: number, initialAngle: number): number {
    if (period <= 0) return 0;
    const angularFrequency = (2 * Math.PI) / period;
    return initialAngle * Math.cos(angularFrequency * time);
}

/**
 * 產生角度與週期關係圖的數據
 */
export function generateAngleVsPeriodData(length: number): Array<{ angle: number; period: number }> {
    const data = [];
    for (let angle = 1; angle <= 90; angle += 1) {
        data.push({
            angle,
            period: Number(calculatePeriod(length, angle).toFixed(4))
        });
    }
    return data;
}

/**
 * 產生擺長與週期關係圖的數據
 */
export function generateLengthVsPeriodData(initialAngle: number): Array<{ length: number; period: number }> {
    const data = [];
    for (let length = 0.1; length <= 3.0; length += 0.1) {
        data.push({
            length: Number(length.toFixed(1)),
            period: Number(calculatePeriod(length, initialAngle).toFixed(4))
        });
    }
    return data;
}

/**
 * 產生質量與週期關係圖的數據
 */
export function generateMassVsPeriodData(length: number, initialAngle: number): Array<{ mass: number; period: number }> {
    const data = [];
    const period = Number(calculatePeriod(length, initialAngle).toFixed(4));
    // 物理上質量不影響週期，所以是一條水平線
    for (let mass = 0.1; mass <= 5.0; mass += 0.1) {
        data.push({
            mass: Number(mass.toFixed(1)),
            period
        });
    }
    return data;
}
