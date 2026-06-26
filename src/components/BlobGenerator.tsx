import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Copy, Download, Sparkles, Dices } from 'lucide-react';
import { rgbToCmyk, hexToRgb } from '../lib/colorUtils';

export default function BlobGenerator() {
  const [edges, setEdges] = useState<number>(8);
  const [contrast, setContrast] = useState<number>(6);
  const [color, setColor] = useState<string>('#A0C4D0');
  const [seed, setSeed] = useState<number>(123456);
  const [svgPath, setSvgPath] = useState<string>('');
  const [svgCode, setSvgCode] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toRad = (deg: number) => deg * (Math.PI / 180);

  const divide = (count: number) => {
    const deg = 360 / count;
    return Array.from({ length: count }, (_, i) => i * deg);
  };

  const randomDoubleGenerator = (s: number) => {
    const mask = 0xffffffff;
    let m_w = (123456789 + s) & mask;
    let m_z = (987654321 - s) & mask;
    return function () {
      m_z = (36969 * (m_z & 65535) + (m_z >>> 16)) & mask;
      m_w = (18000 * (m_w & 65535) + (m_w >>> 16)) & mask;
      let result = ((m_z << 16) + (m_w & 65535)) >>> 0;
      result /= 4294967296;
      return result;
    };
  };

  const magicPoint = (value: number, min: number, max: number) => {
    let radius = min + value * (max - min);
    if (radius > max) radius -= min;
    else if (radius < min) radius += min;
    return radius;
  };

  const fmt = (n: number) => Number(n.toFixed(2));

  const point = (origin: number, radius: number, degree: number): [number, number] => {
    const x = origin + radius * Math.cos(toRad(degree));
    const y = origin + radius * Math.sin(toRad(degree));
    return [x, y];
  };

  const createBlobPoints = (size: number, growth: number, edgesCount: number, seedVal: number) => {
    const outerRad = size / 2;
    const innerRad = growth * (outerRad / 10);
    const center = size / 2;
    const slices = divide(edgesCount);
    const randVal = randomDoubleGenerator(seedVal);
    const destPoints: [number, number][] = [];
    slices.forEach((degree) => {
      const radius = magicPoint(randVal(), innerRad, outerRad);
      destPoints.push(point(center, radius, degree));
    });
    return destPoints;
  };

  const createSvgPath = (points: [number, number][]) => {
    const n = points.length;
    if (n < 3) return '';

    let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${fmt(cp1x)},${fmt(cp1y)},${fmt(cp2x)},${fmt(cp2y)},${fmt(p2[0])},${fmt(p2[1])}`;
    }
    return d + 'Z';
  };

  const generateBlob = () => {
    const size = 400;
    const points = createBlobPoints(size, contrast, edges, seed);
    const path = createSvgPath(points);
    setSvgPath(path);
    const fullSvg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">\n  <path d="${path}" fill="${color}"/>\n</svg>`;
    setSvgCode(fullSvg);
  };

  useEffect(() => {
    generateBlob();
  }, [edges, contrast, color, seed]);

  const randomize = () => {
    setSeed(Math.floor(Math.random() * 999999));
  };

  const downloadSvg = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blob-${seed}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG скачан!');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      showToast('SVG успешно скопирован в буфер!');
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
    <div id="blob-generator-tool" className="grid grid-cols-1 lg:grid-cols-[331px_1fr_331px] gap-[15px] items-stretch w-full h-full min-h-0">
      
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
              onClick={() => document.getElementById('blob-color-picker')?.click()}
            >
              {color}
            </div>
            <input 
              id="blob-color-picker"
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="hidden"
            />
            {/* Color Details values */}
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

          {/* Complexity/Edges slider (labeled "Проще" / "Сложнее" in Figma) */}
          <div className="mb-1">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Сложность (Контур)</span>
              <span className="text-black font-bold">{edges}</span>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={edges}
              onChange={(e) => setEdges(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((edges - 3) / (20 - 3)) * 100}%, #DBDEE5 ${((edges - 3) / (20 - 3)) * 100}%, #DBDEE5 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-[#A2AABD] font-semibold mt-1">
              <span>Проще</span>
              <span>Сложнее</span>
            </div>
          </div>

          {/* Contrast Slider (labeled "Глаже" / "Острее" in Figma) */}
          <div className="mb-1">
            <div className="flex justify-between items-center text-xs font-bold mb-1">
              <span className="text-[#A2AABD] font-sans">Гладкость краёв</span>
              <span className="text-black font-bold">{contrast}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
              style={{
                background: `linear-gradient(to right, #30ABE9 0%, #30ABE9 ${((contrast - 1) / (10 - 1)) * 100}%, #DBDEE5 ${((contrast - 1) / (10 - 1)) * 100}%, #DBDEE5 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-[#A2AABD] font-semibold mt-1">
              <span>Глаже</span>
              <span>Острее</span>
            </div>
          </div>

          {/* Random generator */}
          <div className="mb-2 flex justify-center pt-1.5">
            <button 
              onClick={randomize}
              className="py-2.5 px-6 rounded-full bg-[#A2AABD] hover:bg-[#8d95a5] text-white text-[12px] font-extrabold uppercase tracking-wider transition duration-200 flex items-center justify-center gap-2 select-none shadow-3xs"
            >
              <Dices size={15} /> СЛУЧАЙНАЯ
            </button>
          </div>
        </div>

        {/* Download action button */}
        <div className="flex flex-col gap-2 pt-3 mt-auto border-t border-gray-100 font-semibold text-xs flex-shrink-0">
          <button
            onClick={downloadSvg}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Скачать SVG
          </button>
        </div>
      </div>

      {/* 2. COLUMN: Preview (Figma Rectangle 5) */}
      <div className="bg-white rounded-[20px] p-6 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          просмотр
        </span>

        <div className="w-full flex-1 min-h-0 bg-white border border-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center p-6 select-none">
          <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center hover:scale-[1.03] transition duration-300">
            <svg 
              className="w-full h-full object-contain"
              viewBox="0 0 400 400" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d={svgPath} fill={color} />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. COLUMN: SVG-код (Figma Rectangle 4) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          svg-код
        </span>

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

      {/* Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold z-50 pointer-events-none transition duration-300 shadow-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
