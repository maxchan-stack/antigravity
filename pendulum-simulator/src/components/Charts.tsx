import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot
} from 'recharts';
import {
    generateAngleVsPeriodData,
    generateLengthVsPeriodData,
    generateMassVsPeriodData
} from '../lib/physics';

interface ChartsProps {
    length: number;
    initialAngle: number;
    mass: number;
    period: number;
    showAngleChart: boolean;
    showLengthChart: boolean;
    showMassChart: boolean;
}

export const Charts: React.FC<ChartsProps> = ({
    length,
    initialAngle,
    mass,
    period,
    showAngleChart,
    showLengthChart,
    showMassChart
}) => {

    const angleData = useMemo(() => generateAngleVsPeriodData(length), [length]);
    const lengthData = useMemo(() => generateLengthVsPeriodData(initialAngle), [initialAngle]);
    const massData = useMemo(() => generateMassVsPeriodData(length, initialAngle), [length, initialAngle]);

    const ChartContainer = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full h-72 flex flex-col">
            <h3 className="text-md font-semibold text-slate-700 mb-4 text-center">{title}</h3>
            <div className="flex-grow w-full">
                {children}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            {/* 角度與週期關係圖 */}
            {showAngleChart && (
                <ChartContainer title="初始角度對應週期關係圖 (θ vs T)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={angleData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="angle" type="number" domain={[0, 90]} tick={{ fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => [Number(value).toFixed(4) + ' s', '週期 (T)']} labelFormatter={(l) => `角度: ${l}°`} />
                            <Line type="monotone" dataKey="period" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <ReferenceDot x={initialAngle} y={period} r={5} fill="#7c3aed" stroke="white" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            )}

            {/* 擺長與週期關係圖 */}
            {showLengthChart && (
                <ChartContainer title="擺長對應週期關係圖 (L vs T)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lengthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="length" type="number" domain={[0, 3]} tick={{ fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => [Number(value).toFixed(4) + ' s', '週期 (T)']} labelFormatter={(l) => `擺長: ${l}m`} />
                            <Line type="monotone" dataKey="period" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <ReferenceDot x={length} y={period} r={5} fill="#059669" stroke="white" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            )}

            {/* 質量與週期關係圖 */}
            {showMassChart && (
                <ChartContainer title="擺錘質量對應週期關係圖 (m vs T)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={massData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="mass" type="number" domain={[0.1, 5.0]} tick={{ fontSize: 12 }} />
                            <YAxis domain={[period * 0.9, period * 1.1]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => [Number(value).toFixed(4) + ' s', '週期 (T)']} labelFormatter={(l) => `質量: ${l}kg`} />
                            <Line type="monotone" dataKey="period" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <ReferenceDot x={mass} y={period} r={5} fill="#d97706" stroke="white" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            )}
        </div>
    );
};
