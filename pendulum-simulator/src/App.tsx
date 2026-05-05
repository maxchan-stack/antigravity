import { useState, useMemo } from 'react'
import { Settings2, Play, Square, LineChart, Activity } from 'lucide-react'
import { calculatePeriod } from './lib/physics'
import { PendulumCanvas } from './components/PendulumCanvas'
import { Charts } from './components/Charts'

function App() {
  // 物理參數狀態
  const [length, setLength] = useState<number>(1.0)
  const [initialAngle, setInitialAngle] = useState<number>(45)
  const [mass, setMass] = useState<number>(1.0)

  // 顯示狀態
  const [showAngleChart, setShowAngleChart] = useState<boolean>(true)
  const [showLengthChart, setShowLengthChart] = useState<boolean>(true)
  const [showMassChart, setShowMassChart] = useState<boolean>(true)

  // 模擬狀態
  const [isRunning, setIsRunning] = useState<boolean>(false)

  // 計算週期 (依據擺長與初始角度，考慮大角度修正)
  const period = useMemo(() => calculatePeriod(length, initialAngle), [length, initialAngle])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">單擺實驗模擬器</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">物理教育虛擬實驗室</div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 左側：控制面板 */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2 text-lg font-semibold text-slate-700">
              <Settings2 className="w-5 h-5 text-slate-500" />
              <span>實驗參數設定</span>
            </div>

            {/* 控制拉桿 */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">擺長 (L)</label>
                  <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{length.toFixed(2)} m</span>
                </div>
                <input
                  type="range" min="0.1" max="3.0" step="0.1"
                  value={length} onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">初始角度 (θ₀)</label>
                  <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{initialAngle.toFixed(0)}°</span>
                </div>
                <input
                  type="range" min="1" max="90" step="1"
                  value={initialAngle} onChange={(e) => setInitialAngle(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">擺錘質量 (m)</label>
                  <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{mass.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min="0.1" max="5.0" step="0.1"
                  value={mass} onChange={(e) => setMass(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 my-2"></div>

            {/* 圖表顯示開關 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <LineChart className="w-4 h-4 text-slate-500" />
                <span>圖表顯示控制</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={showAngleChart} onChange={(e) => setShowAngleChart(e.target.checked)} className="w-4 h-4 accent-purple-600 rounded" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">θ 對應週期關係圖</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={showLengthChart} onChange={(e) => setShowLengthChart(e.target.checked)} className="w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">L 對應週期關係圖</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={showMassChart} onChange={(e) => setShowMassChart(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">m 對應週期關係圖</span>
              </label>
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all
                  ${isRunning
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  }`}
              >
                {isRunning ? (
                  <><Square className="w-5 h-5" /> 停止模擬</>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> 開始模擬</>
                )}
              </button>
            </div>
          </div>

          {/* 右側：單擺動畫 */}
          <div className="lg:col-span-2 flex justify-center items-center">
            <PendulumCanvas
              length={length}
              initialAngle={initialAngle}
              mass={mass}
              period={period}
              isRunning={isRunning}
            />
          </div>

        </div>

        {/* 底部：關係圖表 */}
        <div className="pt-6 border-t border-slate-200">
          <Charts
            length={length}
            initialAngle={initialAngle}
            mass={mass}
            period={period}
            showAngleChart={showAngleChart}
            showLengthChart={showLengthChart}
            showMassChart={showMassChart}
          />
        </div>

      </div>
    </div>
  )
}

export default App
