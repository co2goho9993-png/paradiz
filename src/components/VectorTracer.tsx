import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Copy, Download, Upload, Eye, Sparkles, RefreshCw } from 'lucide-react';

// Import the local Javascript ImageTracer to execute on the client side
import ImageTracerLib from '../lib/imagetracer.js';

export default function VectorTracer() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('image');
  const [tracedSvg, setTracedSvg] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Загрузите изображение для начала...');
  
  // Controls
  const [mode, setMode] = useState<'color' | 'mono'>('mono');
  const [colorsCount, setColorsCount] = useState<number>(12); // "Colors"
  const [detail, setDetail] = useState<number>(8); // "Paths"
  const [corners, setCorners] = useState<number>(5); // "Corners" 
  const [noise, setNoise] = useState<number>(6); // "Noise"
  const [threshold, setThreshold] = useState<number>(128); // "Threshold"
  const [smoothing, setSmoothing] = useState<number>(2.5); // "Smoothing / Blur" (default 2.5 to smooth out stairs)
  const [maxRes, setMaxRes] = useState<number>(2600); // Tracing resolution (maxSide)

  const [viewMode, setViewMode] = useState<'compare' | 'pixels' | 'vector'>('compare');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage
  const [scale, setScale] = useState<number>(1);

  const getClipPercent = () => {
    const s = scale;
    const pRange = sliderPos / 100;
    let p = (pRange - 0.5) / s + 0.5;
    p = Math.max(0, Math.min(1, p));
    return p * 100;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Handle mouse wheel zoom
  useEffect(() => {
    const element = viewportContainerRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      setScale((prev) => {
        let newScale = prev + (delta > 0 ? 0.15 : -0.15) * prev;
        newScale = Math.max(0.4, Math.min(newScale, 8));
        return parseFloat(newScale.toFixed(2));
      });
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [sourceUrl, viewMode]);

  // Reset zoom on document/source/viewMode switches
  useEffect(() => {
    setScale(1);
  }, [sourceUrl, viewMode]);

  // Convert raw image data to SVG using window.ImageTracer
  const runVectorize = () => {
    if (!sourceUrl || busy) return;
    const tracerInstance = (window as any).ImageTracer || ImageTracerLib;
    if (!tracerInstance) {
      setStatus('Ошибка: библиотека трассировки не готова.');
      return;
    }

    setBusy(true);
    setStatus('Обработка...');

    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = maxRes;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.drawImage(img, 0, 0, w, h);

        // If smoothing is enabled, we relax ltres and qtres slightly so the vectorizer creates smooth curves instead of micro-steps.
        const ltres = Math.max(0.01, 1.15 - detail * 0.11) * (1 + smoothing * 0.25);
        const qtres = Math.max(0.01, 1.15 - corners * 0.11) * (1 + smoothing * 0.25);

        const options = {
          numberofcolors: mode === 'mono' ? 2 : colorsCount,
          colorsampling: mode === 'mono' ? 0 : 3,
          mincolorratio: 0.01,
          colorquantcycles: 4,
          ltres,
          qtres,
          pathomit: noise,
          blurradius: 0, // 0 because we perform a much higher quality GPU-accelerated blur on the canvas ourselves!
          blurdelta: 10,
          strokewidth: 0,
          linefilter: true,
          scale: 1,
          lcpr: 0,
          qcpr: 0,
          viewbox: true,
          desc: false,
          roundcoords: 3,
          rightangleenhance: false
        };

        let imageData = ctx.getImageData(0, 0, w, h);
        
        if (mode === 'mono') {
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Handle transparency
            if (a < 15) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
              continue;
            }
            
            // Gray calculation
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (gray < threshold) {
              data[i] = 0;
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 255;
            } else {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
            }
          }
          ctx.putImageData(imageData, 0, 0);

          // SUB-PIXEL EDGE SMOOTHING (SDF Blur & Threshold process)
          if (smoothing > 0) {
            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = w;
            blurCanvas.height = h;
            const blurCtx = blurCanvas.getContext('2d');
            if (blurCtx) {
              // Apply hardware-accelerated CSS blur filter
              blurCtx.filter = `blur(${smoothing * 0.7}px)`;
              blurCtx.drawImage(canvas, 0, 0);

              // Draw blurred image back
              ctx.clearRect(0, 0, w, h);
              ctx.filter = 'none';
              ctx.drawImage(blurCanvas, 0, 0);

              // Extract blurred pixels & threshold again to establish clean sub-pixel organic boundaries
              const blurredImageData = ctx.getImageData(0, 0, w, h);
              const bData = blurredImageData.data;

              for (let j = 0; j < bData.length; j += 4) {
                if (bData[j + 3] < 15) {
                  bData[j] = 255;
                  bData[j + 1] = 255;
                  bData[j + 2] = 255;
                  bData[j + 3] = 255;
                  continue;
                }

                const val = bData[j]; // since it's B&W, r=g=b
                if (val < 128) {
                  bData[j] = 0;
                  bData[j + 1] = 0;
                  bData[j + 2] = 0;
                  bData[j + 3] = 255;
                } else {
                  bData[j] = 255;
                  bData[j + 1] = 255;
                  bData[j + 2] = 255;
                  bData[j + 3] = 255;
                }
              }
              ctx.putImageData(blurredImageData, 0, 0);
              imageData = blurredImageData; // update the imageData reference passed to imagetracer
            }
          }
        }

        let svgString = tracerInstance.imagedataToSVG(imageData, options);
        svgString = svgString.replace('<svg ', '<svg shape-rendering="geometricPrecision" style="width: 100%; height: 100%; max-height: 100%; object-contain: fill;" ');
        
        setTracedSvg(svgString);
        setStatus(`Векторизовано ${w}×${h}px · ${mode === 'mono' ? 'ЧБ' : colorsCount + ' цв.'}`);
      } catch (err) {
        console.error(err);
        setStatus('Ошибка обработки');
      } finally {
        setBusy(false);
      }
    };
    img.onerror = () => {
      setBusy(false);
      setStatus('Ошибка загрузки оригинала');
    };
    img.src = sourceUrl;
  };

  // Run automatically when image or parameters change
  useEffect(() => {
    if (sourceUrl) {
      const timer = setTimeout(() => {
        runVectorize();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sourceUrl, colorsCount, detail, corners, noise, mode, threshold, smoothing, maxRes]);

  // Handle uploaded files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setStatus('Неподдерживаемый формат файла');
        return;
      }
      setFileName(file.name.replace(/\.[^.]+$/, ''));
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-brand-blue', 'bg-brand-blue/5');
    }
  };

  const handleDragLeave = () => {
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-brand-blue', 'bg-brand-blue/5');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      setFileName(file.name.replace(/\.[^.]+$/, ''));
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
    }
  };

  // Clipboard Paste support trigger
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setFileName('ctrl-v-image');
            const url = URL.createObjectURL(file);
            setSourceUrl(url);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const copySvgCode = async () => {
    if (!tracedSvg) return;
    try {
      await navigator.clipboard.writeText(tracedSvg);
      setStatus('Код скопирован!');
    } catch (e) {
      setStatus('Ошибка копирования');
    }
  };

  const downloadSvgFile = () => {
    if (!tracedSvg) return;
    const blob = new Blob([tracedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-tracer.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[331px_1fr_331px] gap-[15px] items-stretch w-full h-full min-h-0">
      
      {/* 1. COLUMN: Parameters (Figma Rectangle 3) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Параметры
        </span>

        {/* Scrollable area for controls */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          {/* Interactive Drag Drop Box (Rectangle 6) */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border border-gray-100 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-50/10 transition flex flex-col items-center justify-center min-h-[110px] mb-4 select-none"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload size={18} className="text-[#30ABE9] mb-1.5" />
            <h4 className="text-[11px] font-bold text-gray-800 leading-tight">
              Загрузить фото
            </h4>
            <p className="text-[9px] text-[#A2AABD] leading-normal mt-1">
              PNG, JPG, WebP · перетащите · Ctrl+V
            </p>
          </div>

          {/* Thumbnail preview slot (Figma Rectangle 7) */}
          {sourceUrl && (
            <div className="border border-gray-100 p-2 bg-white rounded-xl max-h-[140px] flex items-center justify-center overflow-hidden mb-4 select-none">
              <img src={sourceUrl} className="max-h-full max-w-full object-contain rounded-md" alt="Source Preview" />
            </div>
          )}

          {/* Threshold (порог): slider for color counting or black transparency (Figma Sliders) */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Порог (Threshold)</span>
              <span className="text-black font-bold">{threshold}</span>
            </div>
            <input
              type="range"
              min={20}
              max={230}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((threshold - 20) / 210) * 100}%, #DBDEE5 ${((threshold - 20) / 210) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Paths Detail (детализация) */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Пути (Paths)</span>
              <span className="text-black font-bold">{detail} / 10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={detail}
              onChange={(e) => setDetail(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((detail - 1) / 9) * 100}%, #DBDEE5 ${((detail - 1) / 9) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Corners (углы) */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Углы (Corners)</span>
              <span className="text-black font-bold">{corners} / 10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={corners}
              onChange={(e) => setCorners(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((corners - 1) / 9) * 100}%, #DBDEE5 ${((corners - 1) / 9) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Noise filter */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Шум (Noise)</span>
              <span className="text-black font-bold">{noise} px</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={noise}
              onChange={(e) => setNoise(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((noise - 1) / 24) * 100}%, #DBDEE5 ${((noise - 1) / 24) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Smoothing (Сглаживание) slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Сглаживание (Blur)</span>
              <span className="text-black font-bold">{smoothing.toFixed(1)} px</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={0.1}
              value={smoothing}
              onChange={(e) => setSmoothing(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${(smoothing / 8) * 100}%, #DBDEE5 ${(smoothing / 8) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Status box display */}
          {sourceUrl && (
            <div className={`mt-2 mb-2 p-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-2 select-none flex-shrink-0 ${busy ? 'bg-amber-500/10 border-amber-500/10 text-amber-500' : 'bg-white border-gray-100 text-[#565C68]'}`}>
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
              <span>{status}</span>
            </div>
          )}
        </div>

        {/* Action Button: "скачать svg" (Group 9) at the very bottom */}
        <div className="flex flex-col gap-2 pt-1 mt-auto font-semibold text-xs flex-shrink-0">
          <button
            onClick={downloadSvgFile}
            disabled={!tracedSvg || busy}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Скачать SVG
          </button>
        </div>
      </div>

      {/* 2. COLUMN: Preview Window (Figma Rectangle 5) */}
      <div className="bg-white rounded-[20px] p-6 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          просмотр
        </span>

        {/* Switcher bar on top of live viewport preview */}
        {sourceUrl && (
          <div className="flex justify-between items-center bg-white p-1 rounded-xl mb-3 border border-gray-100 flex-shrink-0">
            <span className="text-[9px] font-bold text-[#A2AABD] px-2 uppercase tracking-wide">
              Режимы просмотра
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewMode('compare')}
                className={`py-1 px-3 text-[10px] font-bold rounded-lg transition ${viewMode === 'compare' ? 'bg-[#30ABE9] text-white' : 'text-gray-500 hover:text-black'}`}
              >
                Сравнение
              </button>
              <button
                onClick={() => setViewMode('pixels')}
                className={`py-1 px-3 text-[10px] font-bold rounded-lg transition ${viewMode === 'pixels' ? 'bg-[#30ABE9] text-white' : 'text-gray-500 hover:text-black'}`}
              >
                Оригинал
              </button>
              <button
                onClick={() => setViewMode('vector')}
                className={`py-1 px-3 text-[10px] font-bold rounded-lg transition ${viewMode === 'vector' ? 'bg-[#30ABE9] text-white' : 'text-gray-500 hover:text-black'}`}
              >
                Вектор
              </button>
            </div>
          </div>
        )}

        {/* Viewport content */}
        <div 
          ref={viewportContainerRef} 
          className="w-full flex-1 min-h-0 bg-white border border-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center p-6 select-none shadow-2xs"
        >
          {sourceUrl && scale !== 1 && (
            <button
              onClick={() => setScale(1)}
              className="absolute top-3 right-3 z-40 bg-white/95 backdrop-blur-xs py-1 px-2.5 rounded-lg border border-gray-100 shadow-3xs hover:bg-[#30ABE9] hover:text-white transition group flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase select-none tracking-wider font-sans"
              title="Сбросить масштаб до 100%"
            >
              <span>Масштаб: {Math.round(scale * 100)}%</span>
              <span className="text-gray-300 group-hover:text-white font-bold">✕</span>
            </button>
          )}

          {!sourceUrl ? (
            <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
              <div className="h-12 w-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-4">
                <Upload size={20} />
              </div>
              <h4 className="text-xs font-bold text-gray-800 mb-1">
                Импортируйте изображение
              </h4>
              <p className="text-[10px] text-[#A2AABD] leading-normal">
                Перетащите файл в левую панель, выберите на диске или просто вставьте изображение из буфера обмена (Ctrl+V)
              </p>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              
              {/* 1. View Pixels mode */}
              {viewMode === 'pixels' && (
                <div 
                  className="w-full h-full flex items-center justify-center transform-gpu"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                >
                  <img src={sourceUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" alt="Original visual" />
                </div>
              )}

              {/* 2. View vector mode */}
              {viewMode === 'vector' && (
                tracedSvg ? (
                  <div 
                    className="w-full h-full flex items-center justify-center transform-gpu"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                  >
                    <div 
                      className="max-w-full max-h-full flex items-center justify-center svg-vector-canvas"
                      dangerouslySetInnerHTML={{ __html: tracedSvg }} 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-400 gap-2">
                    <RefreshCw size={20} className="animate-spin text-[#30ABE9]" />
                    <span className="text-[9px] font-bold">Отрисовка векторов...</span>
                  </div>
                )
              )}

              {/* 3. View comparison slider mode */}
              {viewMode === 'compare' && (
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                  
                  {/* Scaling container wrapper for graphics */}
                  <div 
                    className="w-full h-full relative flex items-center justify-center transform-gpu"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                  >
                    {/* Behind layer - Original Pixels */}
                    <img src={sourceUrl} className="absolute w-auto max-w-full h-auto max-h-full object-contain pointer-events-none select-none" alt="Behind original" />
                    
                    {/* Front clipping layer - Vector result */}
                    <div 
                      className="absolute inset-y-0 right-0 overflow-hidden flex items-center justify-center w-full h-full"
                      style={{ clipPath: `inset(0 0 0 ${getClipPercent()}%)` }}
                    >
                      <div 
                        className="w-full h-full flex items-center justify-center svg-compare-canvas"
                        dangerouslySetInnerHTML={{ __html: tracedSvg || '<div/>' }}
                      />
                    </div>
                  </div>

                  {/* Blue Slider split line handle bar - OUTSIDE scaling wrapper so it stays normal width & size */}
                  <div 
                    className="absolute inset-y-0 w-0.5 bg-[#30ABE9] z-20 pointer-events-none shadow-[0_0_8px_rgba(48,171,233,0.5)]"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#30ABE9] text-white shadow-md flex items-center justify-center font-bold text-xs pointer-events-none">
                      ↔
                    </div>
                  </div>

                  {/* Interactive range transparent overlay forced to 100% width and height */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize z-30"
                    style={{
                      height: '100%',
                      width: '100%',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      background: 'transparent',
                      margin: 0,
                      padding: 0
                    }}
                  />

                  {/* Figma Labels */}
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-[#565C68]/90 text-[8px] font-bold text-white tracking-widest uppercase pointer-events-none z-10 font-sans">
                    Оригинал
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-[#30ABE9]/95 text-[8px] font-bold text-white tracking-widest uppercase pointer-events-none z-10 font-sans font-semibold">
                    вектор
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. COLUMN: SVG-код (Figma Rectangle 4) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          svg-код
        </span>

        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 min-h-[140px] bg-[#565C68] text-white rounded-xl p-3 text-[10px] font-mono whitespace-pre-wrap select-all leading-relaxed break-all overflow-y-auto">
            {tracedSvg ? tracedSvg : 'Код SVG появится после загрузки изображения'}
          </div>

          <button
            onClick={copySvgCode}
            disabled={!tracedSvg}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] disabled:opacity-40 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <Copy size={13} /> Копировать код
          </button>
        </div>
      </div>
    </div>
  );
}
