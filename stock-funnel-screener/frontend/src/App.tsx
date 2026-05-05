import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

interface Stock {
  symbol: string;
  name: string;
  industry: string;
  roic: number | null;
  fcf_yield: number | null;
}

interface Analysis {
  report: string;
  metrics: any;
  tech_summary: any;
}

const API_BASE = "http://localhost:8000";

// TradingView Widget 組件
const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    container.current.innerHTML = '';
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js"; // 使用標準 tv.js 優化相容性
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && container.current) {
        // 台股判斷邏輯：6 開頭通常是 OTC (上櫃)，其餘多為 TWSE (上市)
        const pureCode = symbol.split('.')[0];
        const exchange = pureCode.startsWith('6') || pureCode.startsWith('5') ? 'OTC' : 'TWSE';
        
        new (window as any).TradingView.widget({
          "autosize": true,
          "symbol": `${exchange}:${pureCode}`,
          "interval": "D",
          "timezone": "Asia/Taipei",
          "theme": "dark",
          "style": "1",
          "locale": "zh_TW",
          "toolbar_bg": "rgba(0, 0, 0, 0)",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "save_image": false,
          "container_id": "tv_chart_inner",
          "studies": [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies"
          ]
        });
      }
    };
    
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
      <div id="tv_chart_inner" style={{ height: "100%", width: "100%" }} ref={container}></div>
    </div>
  );
};

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ progress: 0, current_ticker: "" });

  // 漏斗篩選條件
  const [minRoic, setMinRoic] = useState(0.15);
  const [minFcf, setMinFcf] = useState(0.05);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchProgress, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stocks`);
      setStocks(res.data);
    } catch (e) {
      console.error("無法取得股票清單", e);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks/progress`);
      setSyncStatus(res.data);
    } catch (e) {}
  };

  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return stocks.filter(s => 
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.includes(searchTerm)
    ).slice(0, 8);
  }, [searchTerm, stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      const matchesSearch = searchTerm ? 
        (s.symbol.includes(searchTerm.split(' ')[0]) || s.name.includes(searchTerm)) : true;
      const meetsFunnel = (s.roic || 0) >= minRoic && (s.fcf_yield || 0) >= minFcf;
      return matchesSearch && meetsFunnel;
    });
  }, [stocks, searchTerm, minRoic, minFcf]);

  const runAnalysis = async (stock: Stock) => {
    setSelectedStock(stock);
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await axios.get(`${API_BASE}/stocks/${stock.symbol}/analysis`);
      setAnalysis(res.data);
    } catch (e) {
      alert("分析失敗，請稍後再試。");
    }
    setLoading(false);
  };

  const handleSync = async () => {
    await axios.post(`${API_BASE}/tasks/sync-market`);
  };

  return (
    <div style={{ padding: '20px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '2px', background: 'var(--starlux-gold)' }}></div>
          <h1 style={{ color: 'var(--starlux-gold)', fontSize: '2.5rem', margin: 0, letterSpacing: '4px' }}>
            STARLUX AI ANALYST
          </h1>
          <div style={{ width: '40px', height: '2px', background: 'var(--starlux-gold)' }}></div>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontSize: '0.9rem', letterSpacing: '2px' }}>
          PREMIUM STOCK SELECTION SYSTEM
        </p>
      </header>

      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="搜尋星宇嚴選標的 (例如: 2330 台積電)..." 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestion-dropdown glass-card">
            {suggestions.map(s => (
              <div 
                key={s.symbol} 
                className="suggestion-item"
                onClick={() => {
                  setSearchTerm(`${s.symbol.split('.')[0]} ${s.name}`);
                  setShowSuggestions(false);
                  runAnalysis(s);
                }}
              >
                <div>
                  <span className="symbol">{s.symbol.split('.')[0]}</span>
                  <span className="name">{s.name}</span>
                </div>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{s.industry}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: '24px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          <div style={{ width: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--starlux-gold)', fontWeight: 600, marginBottom: '8px' }}>MIN ROIC %</label>
            <input 
              type="range" min="0" max="0.5" step="0.01" 
              style={{ width: '100%', accentColor: 'var(--starlux-gold)' }}
              value={minRoic} onChange={(e) => setMinRoic(parseFloat(e.target.value))} 
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{(minRoic * 100).toFixed(0)}%</div>
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--starlux-gold)', fontWeight: 600, marginBottom: '8px' }}>MIN FCF YIELD %</label>
            <input 
              type="range" min="0" max="0.2" step="0.01" 
              style={{ width: '100%', accentColor: 'var(--starlux-gold)' }}
              value={minFcf} onChange={(e) => setMinFcf(parseFloat(e.target.value))} 
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{(minFcf * 100).toFixed(0)}%</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          {syncStatus.progress > 0 && syncStatus.progress < 100 ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--starlux-gold)' }}>SYCHRONIZING: {syncStatus.current_ticker}</div>
              <div style={{ width: '200px', height: '2px', background: 'rgba(255,255,255,0.1)', marginTop: '8px' }}>
                <div style={{ width: `${syncStatus.progress}%`, height: '100%', background: 'var(--starlux-gold)' }}></div>
              </div>
            </div>
          ) : (
            <button className="starlux-button" onClick={handleSync}>同步市場數據</button>
          )}
        </div>
      </div>

      <div className="stock-grid">
        {filteredStocks.map(s => (
          <div key={s.symbol} className="glass-card stock-card" onClick={() => runAnalysis(s)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ color: 'var(--starlux-gold)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>{s.symbol.split('.')[0]}</span>
              <span className="glass-card" style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.industry}</span>
            </div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4rem' }}>{s.name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ROIC</div>
                <div style={{ color: (s.roic || 0) > 0.2 ? '#48BB78' : 'white', fontWeight: 600 }}>{(s.roic || 0).toLocaleString(undefined, {style:'percent'})}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>FCF YIELD</div>
                <div style={{ color: (s.fcf_yield || 0) > 0.08 ? '#48BB78' : 'white', fontWeight: 600 }}>{(s.fcf_yield || 0).toLocaleString(undefined, {style:'percent'})}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 大型分析視窗 */}
      {selectedStock && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 10, 20, 0.95)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--starlux-glass-border)' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--starlux-gold)' }}>{selectedStock.name} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>({selectedStock.symbol.split('.')[0]})</span></h2>
              </div>
              <button onClick={() => setSelectedStock(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* 左側：大型圖表區 */}
              <div style={{ flex: 2, borderRight: '1px solid var(--starlux-glass-border)', padding: '10px', background: '#131722' }}>
                <TradingViewWidget symbol={selectedStock.symbol} />
              </div>

              {/* 右側：AI 報告與指標 */}
              <div style={{ flex: 1, padding: '30px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', marginTop: '100px' }}>
                    <div className="starlux-gold" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>🔍 AI 正在處理全球市場大數據...</div>
                    <div style={{ color: 'var(--text-secondary)' }}>預想星空的深度，為您找出投資的光芒</div>
                  </div>
                ) : analysis && (
                  <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="glass-card" style={{ padding: '20px', marginBottom: '25px', borderLeft: '4px solid var(--starlux-gold)' }}>
                      <h4 style={{ color: 'var(--starlux-gold)', marginTop: 0, letterSpacing: '2px' }}>💠 AI STRATEGIC ANALYSIS</h4>
                      <p style={{ lineHeight: 1.8, fontSize: '1.05rem', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>{analysis.report}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="glass-card" style={{ padding: '15px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--starlux-gold)' }}>ROIC RANK</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{analysis.metrics.roic_percentile ? (analysis.metrics.roic_percentile * 100).toFixed(0) : "N/A"} %</div>
                      </div>
                      <div className="glass-card" style={{ padding: '15px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--starlux-gold)' }}>FCF YIELD</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{(analysis.metrics.fcf_yield * 100).toFixed(1)} %</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
