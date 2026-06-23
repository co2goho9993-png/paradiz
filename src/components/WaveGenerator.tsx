import React, { useState, useEffect } from 'react';
import { Sliders, Download, Copy, Sparkles, Compass, Dices } from 'lucide-react';
import { rgbToCmyk, hexToRgb } from '../lib/colorUtils';
import SaveToDriveButton from './SaveToDriveButton';

export default function WaveGenerator() {
  const [curveType, setCurveType] = useState<'wave' | 'step' | 'peak'>('wave');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [color, setColor] = useState<string>('#A0C4D0');
  const [complexity, setComplexity] = useState<number>(6);
  const [heightAmp, setHeightAmp] = useState<number>(80);
  const [opacity, setOpacity] = useState<number>(89);
  const [waveData, setWaveData] = useState<number[]>([]);
  const [svgPath, setSvgPath] = useState<string>('');
  const [svgCode, setSvgCode] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const WAVE_W = 1198;
  const WAVE_H = 320;

  const randomWaveData = (count: number) => {
    return Array.from({ length: count }, () => Math.random() * 10);
  };

  const generateWavePoints = (data: number[]) => {
    const getX = (i: number) => complexity <= 1 ? 0 : (i / (complexity - 1)) * WAVE_W;
    const amp = heightAmp / 100;
    const baseline = direction === 'up' ? WAVE_H : 0;
    const getY = (v: number) => {
      const offset = (v / 10) * WAVE_H * amp;
      return direction === 'up' ? baseline - offset : baseline + offset;
    };
    return data.map((v, i) => [getX(i), getY(v)]);
  };

  const fmt = (n: number) => Number(n.toFixed(2));

  const smoothTop = (points: number[][]) => {
    if (points.length < 2) {
      const y = points[0] ? points[0][1] : 0;
      return `M0,${fmt(y)}L${WAVE_W},${fmt(y)}`;
    }
    let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const cx = (x1 + x2) / 2;
      d += `C${fmt(cx)},${fmt(y1)} ${fmt(cx)},${fmt(y2)} ${fmt(x2)},${fmt(y2)}`;
    }
    return d;
  };

  const peakTop = (points: number[][]) => {
    if (points.length === 0) return '';
    let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
    for (let i = 1; i < points.length; i++) {
      d += `L${fmt(points[i][0])},${fmt(points[i][1])}`;
    }
    return d;
  };

  const stepTop = (points: number[][]) => {
    if (points.length === 0) return '';
    let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
    for (let i = 1; i < points.length; i++) {
      d += `H${fmt(points[i][0])}V${fmt(points[i][1])}`;
    }
    return d;
  };

  const buildWavePath = () => {
    const pts = generateWavePoints(waveData);
    if (pts.length === 0) return '';
    const baseline = direction === 'up' ? WAVE_H : 0;
    
    let top = '';
    if (curveType === 'wave') top = smoothTop(pts);
    else if (curveType === 'step') top = stepTop(pts);
    else top = peakTop(pts);

    const close = `L${WAVE_W},${baseline}L0,${baseline}Z`;
    return top + close;
  };

  useEffect(() => {
    setWaveData(randomWaveData(complexity));
  }, [complexity]);

  useEffect(() => {
    if (waveData.length === 0) return;
    const path = buildWavePath();
    setSvgPath(path);
    const op = opacity / 100;
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WAVE_W} ${WAVE_H}" shape-rendering="geometricPrecision">\n  <path fill="${color}" fill-opacity="${op}" d="${path}"/>\n</svg>`;
    setSvgCode(fullSvg);
  }, [waveData, curveType, direction, color, heightAmp, opacity]);

  const randomize = () => {
    setWaveData(randomWaveData(complexity));
  };

  const downloadSvg = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave-${direction}-${complexity}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG скачан!');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      showToast('SVG скопирован в буфер!');
    } catch (e) {
      showToast('Ошибка копирования');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const rgb = hexToRgb(color) || { r: 160, g: 196, b: 208 };
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

  return (
    <div id="wave-generator-tool" className="grid grid-cols-1 lg:grid-cols-[331px_1fr_331px] gap-[15px] items-stretch w-full h-full min-h-0">
      
      {/* 1. COLUMN: Parameters (Figma Rectangle 3) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Параметры
        </span>

        {/* Scrollable area for controls */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          {/* Color Selector (Group 4) */}
          <div className="mb-1 bg-white p-3 rounded-xl border border-gray-100">
            <div 
              className="w-full h-[39px] rounded-lg cursor-pointer flex items-center justify-center text-white text-[17px] font-bold transition duration-200 shadow-2xs select-none uppercase"
              style={{ backgroundColor: color }}
              onClick={() => document.getElementById('wave-color-picker')?.click()}
            >
              {color}
            </div>
            <input 
              id="wave-color-picker"
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="hidden"
            />
            {/* Readouts exactly matching Figma coordinates */}
            <div className="mt-3 flex flex-col gap-1.5 text-[12px] font-sans text-[#565C68]">
              <div className="flex font-semibold justify-between">
                <span>RGB</span>
                <span className="font-mono tracking-wide">{`${rgb.r}  ${rgb.g}  ${rgb.b}`}</span>
              </div>
              <div className="flex font-semibold justify-between">
                <span>CMYK</span>
                <span className="font-mono tracking-wide">{`${cmyk.c}  ${cmyk.m}  ${cmyk.y}  ${cmyk.k}`}</span>
              </div>
            </div>
          </div>

          {/* Curve Type Selector (Group 11) */}
          <div className="mb-1">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans">Форма кривой</span>
            <div className="grid grid-cols-3 gap-1.5 bg-white border border-gray-100 p-1 rounded-xl">
              {[
                { id: 'wave', label: 'Волна' },
                { id: 'step', label: 'Ступени' },
                { id: 'peak', label: 'Пики' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCurveType(style.id as any)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                    curveType === style.id 
                       ? 'bg-[#30ABE9] text-white shadow-3xs' 
                       : 'text-[#565C68] hover:text-black'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction toggle */}
          <div className="mb-1">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans">Направление волны</span>
            <div className="grid grid-cols-2 gap-1.5 bg-white border border-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setDirection('up')}
                className={`py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                  direction === 'up' 
                    ? 'bg-[#30ABE9] text-white shadow-3xs' 
                    : 'text-[#565C68] hover:text-black'
                }`}
              >
                Вверх
              </button>
              <button
                onClick={() => setDirection('down')}
                className={`py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                  direction === 'down' 
                    ? 'bg-[#30ABE9] text-white shadow-3xs' 
                    : 'text-[#565C68] hover:text-black'
                }`}
              >
                Вниз
              </button>
            </div>
          </div>

          {/* Frequency Slider */}
          <div className="mb-1">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Частота (Сложность)</span>
              <span className="text-black font-bold">{complexity}</span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              value={complexity}
              onChange={(e) => setComplexity(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((complexity - 3) / (15 - 3)) * 100}%, #DBDEE5 ${((complexity - 3) / (15 - 3)) * 100}%, #DBDEE5 100%)`
              }}
            />
            <div className="flex justify-between text-[9px] text-[#A2AABD] font-semibold mt-1">
              <span>Реже</span>
              <span>Чаще</span>
            </div>
          </div>

          {/* Height amplitude slider */}
          <div className="mb-1">
            <div className="flex justify-between items-center text-[12px] font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Амплитуда высоты</span>
              <span className="text-black font-bold">{heightAmp}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              value={heightAmp}
              onChange={(e) => setHeightAmp(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((heightAmp - 15) / (100 - 15)) * 100}%, #DBDEE5 ${((heightAmp - 15) / (100 - 15)) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          {/* Opacity Slider */}
          <div className="mb-1">
            <div className="flex justify-between items-center text-[12px] font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Прозрачность</span>
              <span className="text-black font-bold">{opacity} %</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((opacity - 10) / (100 - 10)) * 100}%, #DBDEE5 ${((opacity - 10) / (100 - 10)) * 100}%, #DBDEE5 100%)`
              }}
            />
          </div>

          <div className="mb-2 flex justify-center pt-1.5">
            <button 
              onClick={randomize}
              className="py-2.5 px-6 rounded-full bg-[#A2AABD] hover:bg-[#8d95a5] text-white text-[12px] font-extrabold uppercase tracking-wider transition duration-200 flex items-center justify-center gap-2 select-none shadow-3xs"
            >
              <Dices size={15} /> СЛУЧАЙНАЯ
            </button>
          </div>
        </div>

        {/* Action download buttons exactly as Figma Group */}
        <div className="flex flex-col gap-2 pt-3 mt-auto border-t border-gray-100 flex-shrink-0">
          <button
            onClick={downloadSvg}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Скачать SVG
          </button>
          <SaveToDriveButton 
            filename={`wave-${curveType}-${complexity}.svg`}
            content={svgCode}
            mimeType="image/svg+xml"
            className="w-full py-2.5 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* 2. COLUMN: Preview Window (Figma Rectangle 5) */}
      <div className="bg-white rounded-[20px] p-6 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          просмотр
        </span>

        {/* Interactive display box */}
        <div className="w-full flex-1 min-h-0 bg-white border border-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center p-6 select-none">
          <svg 
            className="w-full h-full object-contain transition duration-300 transform hover:scale-[1.01]"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
          >
            <path 
              fill={color} 
              fillOpacity={opacity / 100} 
              d={svgPath}
              shapeRendering="geometricPrecision"
            />
          </svg>
        </div>
      </div>

      {/* 3. COLUMN: SVG Code (Figma Rectangle 4) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          svg-код
        </span>

        {/* High contrast SVG Code block matching Figma exact style */}
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 min-h-[140px] bg-[#565C68] text-white rounded-xl p-3 text-[10px] font-mono whitespace-pre-wrap select-all leading-relaxed break-all overflow-y-auto">
            {svgCode}
          </div>

          <button
            onClick={copyCode}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <Copy size={13} /> Копировать код
          </button>
        </div>
      </div>

      {/* Toast alert overlays */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold z-50 pointer-events-none transition duration-300 shadow-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
