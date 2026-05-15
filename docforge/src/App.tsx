import { Home, FileText, Image, Combine, Scissors, RotateCw, FileImage, Percent, RefreshCw, ImageIcon, Trash2, Hash, FileEdit, Sun, Moon } from 'lucide-react';
import { Button } from './shared/components/ui/Button';
import { LoadingSpinner } from './shared/components/ui/LoadingSpinner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useState, useEffect, lazy, Suspense } from 'react';
import './index.css';

// Code Splitting: 動態載入工具元件
const PDFMerger = lazy(() => import('./features/pdf-tools/components/PDFMerger').then(m => ({ default: m.PDFMerger })));
const PDFSplitter = lazy(() => import('./features/pdf-tools/components/PDFSplitter').then(m => ({ default: m.PDFSplitter })));
const PDFRotator = lazy(() => import('./features/pdf-tools/components/PDFRotator').then(m => ({ default: m.PDFRotator })));
const PDFPageRemover = lazy(() => import('./features/pdf-tools/components/PDFPageRemover').then(m => ({ default: m.PDFPageRemover })));
const PDFPageNumberer = lazy(() => import('./features/pdf-tools/components/PDFPageNumberer').then(m => ({ default: m.PDFPageNumberer })));
const ImageToPDF = lazy(() => import('./features/pdf-tools/components/ImageToPDF').then(m => ({ default: m.ImageToPDF })));
const PDFToImage = lazy(() => import('./features/pdf-tools/components/PDFToImage').then(m => ({ default: m.PDFToImage })));
const ImageCompressor = lazy(() => import('./features/image-tools/components/ImageCompressor').then(m => ({ default: m.ImageCompressor })));
const ImageConverter = lazy(() => import('./features/image-tools/components/ImageConverter').then(m => ({ default: m.ImageConverter })));
const ImageWatermark = lazy(() => import('./features/image-tools/components/ImageWatermark').then(m => ({ default: m.ImageWatermark })));
const ImageBatchRenamer = lazy(() => import('./features/image-tools/components/ImageBatchRenamer').then(m => ({ default: m.ImageBatchRenamer })));


type ActiveTool =
  | 'home'
  | 'pdf-toolbox'
  | 'image-toolbox'
  | 'pdf-merger'
  | 'pdf-splitter'
  | 'pdf-rotator'
  | 'pdf-page-remover'
  | 'pdf-page-numberer'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'image-compressor'
  | 'image-converter'
  | 'image-watermark'
  | 'image-batch-renamer';

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  icon: any;
  component?: React.FC;
}

const PDF_TOOLS: ToolInfo[] = [
  { id: 'pdf-merger', name: 'PDF 合併器', description: '批次合併多個 PDF', icon: Combine },
  { id: 'pdf-splitter', name: 'PDF 拆分器', description: '拆分 PDF 成單頁', icon: Scissors },
  { id: 'pdf-rotator', name: 'PDF 旋轉器', description: '旋轉 PDF 頁面', icon: RotateCw },
  { id: 'pdf-page-remover', name: 'PDF 頁面移除器', description: '移除特定頁面', icon: Trash2 },
  { id: 'pdf-page-numberer', name: 'PDF 頁碼添加器', description: '自動添加頁碼', icon: Hash },
  { id: 'image-to-pdf', name: '圖片轉 PDF', description: '將圖片合併成 PDF', icon: FileImage },
  { id: 'pdf-to-image', name: 'PDF 轉 JPG', description: '將 PDF 轉為圖片', icon: ImageIcon },
];

const IMAGE_TOOLS: ToolInfo[] = [
  { id: 'image-converter', name: '照片轉換工作站', description: '支援 HEIC 格式轉換', icon: RefreshCw },
  { id: 'image-compressor', name: '圖片壓縮機', description: '智慧壓縮圖片', icon: Percent },
  { id: 'image-watermark', name: '圖片浮水印', description: '批次添加文字浮水印', icon: Hash },
  { id: 'image-batch-renamer', name: '批次檔案命名', description: '快速重命名多個圖片', icon: FileEdit },
];

function AppContent() {
  const [activeTool, setActiveTool] = useState<ActiveTool>('home');
  const { theme, toggleTheme } = useTheme();

  // 快捷鍵支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + H: 返回首頁
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setActiveTool('home');
      }
      // Escape: 返回上一層
      if (e.key === 'Escape' && activeTool !== 'home') {
        e.preventDefault();
        if (activeTool === 'pdf-toolbox' || activeTool === 'image-toolbox') {
          setActiveTool('home');
        } else {
          // 如果在工具頁面，返回工具箱
          const isPDFTool = ['pdf-merger', 'pdf-splitter', 'pdf-rotator', 'pdf-page-remover', 'pdf-page-numberer', 'image-to-pdf', 'pdf-to-image'].includes(activeTool);
          setActiveTool(isPDFTool ? 'pdf-toolbox' : 'image-toolbox');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  const renderToolContent = () => {
    const toolElement = (() => {
      switch (activeTool) {
        case 'pdf-merger':
          return <PDFMerger />;
        case 'pdf-splitter':
          return <PDFSplitter />;
        case 'pdf-rotator':
          return <PDFRotator />;
        case 'pdf-page-remover':
          return <PDFPageRemover />;
        case 'pdf-page-numberer':
          return <PDFPageNumberer />;
        case 'image-to-pdf':
          return <ImageToPDF />;
        case 'pdf-to-image':
          return <PDFToImage />;
        case 'image-compressor':
          return <ImageCompressor />;
        case 'image-converter':
          return <ImageConverter />;
        case 'image-watermark':
          return <ImageWatermark />;
        case 'image-batch-renamer':
          return <ImageBatchRenamer />;
        case 'pdf-toolbox':
          return renderPDFToolbox();
        case 'image-toolbox':
          return renderImageToolbox();
        default:
          return renderHomepage();
      }
    })();

    // 只在渲染工具元件時使用 Suspense
    const needsSuspense = !['home', 'pdf-toolbox', 'image-toolbox'].includes(activeTool);
    return needsSuspense ? (
      <Suspense fallback={<LoadingSpinner />}>
        {toolElement}
      </Suspense>
    ) : toolElement;
  };

  // 渲染 PDF 工具箱
  const renderPDFToolbox = () => (
    <div className="space-y-6">
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-white mb-2">📄 PDF 工具箱</h2>
        <p className="text-starlux-text-secondary">選擇您需要的 PDF 處理工具</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {PDF_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ActiveTool)}
            className="bg-starlux-bg-card p-6 rounded-xl border border-white/10 hover:border-starlux-earth-gold hover:bg-starlux-bg-elevated transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-starlux-earth-gold/20 to-starlux-rose-gold/20 rounded-lg flex items-center justify-center group-hover:from-starlux-earth-gold/30 group-hover:to-starlux-rose-gold/30 transition-colors">
                <tool.icon className="w-6 h-6 text-starlux-earth-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-rufina font-bold text-white mb-1 group-hover:text-starlux-earth-gold transition-colors">{tool.name}</h3>
                <p className="text-sm text-starlux-text-secondary">{tool.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  //渲染圖片工具箱
  const renderImageToolbox = () => (
    <div className="space-y-6">
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-white mb-2">🖼️ 圖片工具箱</h2>
        <p className="text-starlux-text-secondary">選擇您需要的圖片處理工具</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {IMAGE_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ActiveTool)}
            className="bg-starlux-bg-card p-6 rounded-lg border border-white/10 hover:border-starlux-earth-gold hover:bg-starlux-bg-elevated transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold group-hover:bg-opacity-20 transition-colors">
                <tool.icon className="w-6 h-6 text-starlux-earth-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1 group-hover:text-starlux-earth-gold transition-colors">{tool.name}</h3>
                <p className="text-sm text-starlux-text-secondary">{tool.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // 渲染首頁
  const renderHomepage = () => (
    <>
      {/* Tool Categories */}
      <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
        {/* PDF Tools */}
        <div className="bg-starlux-bg-card rounded-xl p-8 border border-white/10 hover:border-starlux-earth-gold transition-all cursor-pointer group" onClick={() => setActiveTool('pdf-toolbox')}>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-starlux-earth-gold to-starlux-rose-gold rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow-gold">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-rufina font-bold text-white mb-2 group-hover:text-starlux-earth-gold transition-colors">📄 PDF 工具箱</h2>
              <p className="text-sm text-starlux-text-secondary">{PDF_TOOLS.length} 種專業 PDF 處理功能</p>
            </div>
            <div className="mt-6 space-y-2 w-full">
              {PDF_TOOLS.slice(0, 3).map((tool) => (
                <li key={tool.id} className="flex items-center gap-2 text-starlux-text-secondary hover:text-starlux-earth-gold transition-colors">
                  <span className="w-2 h-2 bg-gradient-to-r from-starlux-earth-gold to-starlux-rose-gold rounded-full"></span>
                  {tool.name}
                </li>
              ))}
            </div>

            <Button
              variant="primary"
              className="w-full mt-8"
              onClick={() => setActiveTool('pdf-toolbox')}
            >
              進入 PDF 工具箱
            </Button>
          </div>
        </div>

        {/* Image Tools */}
        <div className="bg-starlux-bg-card rounded-xl p-8 border border-white/10 hover:border-starlux-rose-gold transition-all cursor-pointer group" onClick={() => setActiveTool('image-toolbox')}>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-starlux-rose-gold to-starlux-earth-gold rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow-rose">
              <Image className="w-8 h-8 text-white" />
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-rufina font-bold text-white mb-2 group-hover:text-starlux-rose-gold transition-colors">🖼️ 圖片工具箱</h2>
              <p className="text-sm text-starlux-text-secondary">{IMAGE_TOOLS.length} 種進階圖片處理功能</p>
            </div>
            <div className="mt-6 space-y-2 w-full">
              {IMAGE_TOOLS.slice(0, 3).map((tool) => (
                <li key={tool.id} className="flex items-center gap-2 text-starlux-text-secondary hover:text-starlux-rose-gold transition-colors">
                  <span className="w-2 h-2 bg-gradient-to-r from-starlux-rose-gold to-starlux-earth-gold rounded-full"></span>
                  {tool.name}
                </li>
              ))}
            </div>

            <Button
              variant="primary"
              className="w-full mt-8"
              onClick={() => setActiveTool('image-toolbox')}
            >
              進入圖片工具箱
            </Button>
          </div>
        </div>
      </div>

    </>
  );

  const showHomeButton = activeTool !== 'home';

  return (
    <div className="min-h-screen bg-starlux-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-glass bg-starlux-bg-card/90 border-b border-white/10 shadow-glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTool('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-starlux-earth-gold to-starlux-rose-gold rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-glow-gold">
              <FileText className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-rufina font-bold text-starlux-text-primary tracking-tight hover:text-starlux-earth-gold transition-colors">圖片文件編輯</h1>
          </div>

          <div className="flex items-center gap-3">
            {showHomeButton && (
              <Button
                variant="outline"
                size="sm"
                icon={Home}
                onClick={() => setActiveTool('home')}
              >
                首頁
              </Button>
            )}

            {/* 主題切換按鈕 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-starlux-bg-elevated transition-colors"
              title={theme === 'dark' ? '切換到淺色模式' : '切換到深色模式'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-starlux-text-secondary hover:text-starlux-text-primary transition-colors" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {renderToolContent()}
      </main>

      {/* Footer */}
      <footer className="bg-starlux-bg-card border-t border-white/10 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-starlux-text-secondary">
            Design by MaxChan
          </p>
        </div>
      </footer>
    </div>
  );
}

// 包裹 ThemeProvider
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
