import React, { useState, useEffect, useRef } from 'react';
import { Palette, Eye, Copy, Code, Sliders, ShieldCheck } from 'lucide-react';
import {
  hexToRgb,
  rgbToHex,
  rgbToCmyk,
  rgbToHsv,
  hsvToRgb,
  rgbToHsl,
  hslToRgb,
  contrastRatio
} from '../lib/colorUtils';

export default function ColorTools() {
  const [hexVal, setHexVal] = useState<string>('#A0C4D0');
  const [rgbVal, setRgbVal] = useState<string>('rgb(160, 196, 208)');
  const [hslVal, setHslVal] = useState<string>('hsl(195, 37%, 72%)');
  const [hsvVal, setHsvVal] = useState<string>('hsv(195, 23%, 82%)');
  const [cmykVal, setCmykVal] = useState<string>('cmyk(23%, 6%, 0%, 18%)');

  const [pickerH, setPickerH] = useState<number>(195);
  const [pickerS, setPickerS] = useState<number>(23);
  const [pickerV, setPickerV] = useState<number>(82);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const svContainerRef = useRef<HTMLDivElement>(null);
  const hueContainerRef = useRef<HTMLDivElement>(null);
  const dragMode = useRef<'sv' | 'hue' | null>(null);

  // Sync calculations from HSV
  const updateFromHsv = (h: number, s: number, v: number, excludeField?: string) => {
    const rgb = hsvToRgb(h, s, v);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    setPickerH(h);
    setPickerS(s);
    setPickerV(v);

    if (excludeField !== 'hex') setHexVal(hex);
    if (excludeField !== 'rgb') setRgbVal(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    if (excludeField !== 'hsl') setHslVal(`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`);
    if (excludeField !== 'hsv') setHsvVal(`hsv(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(v)}%)`);
    
    setCmykVal(`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`);
  };

  // Draw Saturation/Value Canvas
  useEffect(() => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    const hueRgb = hsvToRgb(pickerH, 100, 100);

    // White to Hue gradient
    const gradWhite = ctx.createLinearGradient(0, 0, w, 0);
    gradWhite.addColorStop(0, '#fff');
    gradWhite.addColorStop(1, `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`);
    ctx.fillStyle = gradWhite;
    ctx.fillRect(0, 0, w, h);

    // Black overlay gradient
    const gradBlack = ctx.createLinearGradient(0, 0, 0, h);
    gradBlack.addColorStop(0, 'rgba(0,0,0,0)');
    gradBlack.addColorStop(1, '#000');
    ctx.fillStyle = gradBlack;
    ctx.fillRect(0, 0, w, h);
  }, [pickerH]);

  // Color inputs
  const handleHexInput = (val: string) => {
    setHexVal(val);
    const rgb = hexToRgb(val);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      updateFromHsv(hsv.h, hsv.s, hsv.v, 'hex');
    }
  };

  const handleRgbInput = (val: string) => {
    setRgbVal(val);
    const m = val.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      const hsv = rgbToHsv(Number(m[1]), Number(m[2]), Number(m[3]));
      updateFromHsv(hsv.h, hsv.s, hsv.v, 'rgb');
    }
  };

  const handleSwatchSelection = (hex: string) => {
    copyToClipboard(hex.toUpperCase(), `Цвет ${hex.toUpperCase()} скопирован!`);
  };

  // SV Canvas dragging events
  const handleSvEvent = (clientX: number, clientY: number) => {
    const container = svContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    updateFromHsv(pickerH, x * 100, (1 - y) * 100);
  };

  const handleHueEvent = (clientX: number) => {
    const container = hueContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    updateFromHsv(x * 360, pickerS, pickerV);
  };

  // Drag listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragMode.current === 'sv') handleSvEvent(e.clientX, e.clientY);
      if (dragMode.current === 'hue') handleHueEvent(e.clientX);
    };

    const handleMouseUp = () => {
      dragMode.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragMode.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (dragMode.current === 'sv') handleSvEvent(touch.clientX, touch.clientY);
      if (dragMode.current === 'hue') handleHueEvent(touch.clientX);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [pickerH, pickerS, pickerV]);

  // Mix tones shards helper
  const mixRgb = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, ratio: number) => {
    return {
      r: Math.round(r1 + (r2 - r1) * ratio),
      g: Math.round(g1 + (g2 - g1) * ratio),
      b: Math.round(b1 + (b2 - b1) * ratio)
    };
  };

  const getScaleScale = (r2: number, g2: number, b2: number) => {
    const rgb = hsvToRgb(pickerH, pickerS, pickerV);
    const ratios = [0, 0.2, 0.4, 0.6, 0.8, 1];
    return ratios.map((ratio) => {
      const mixed = mixRgb(rgb.r, rgb.g, rgb.b, r2, g2, b2, ratio);
      return rgbToHex(mixed.r, mixed.g, mixed.b);
    });
  };

  const shades = getScaleScale(0, 0, 0);
  const tints = getScaleScale(255, 255, 255);
  const tones = getScaleScale(128, 128, 128);

  const getHarmonyHexes = (offsets: number[]) => {
    return offsets.map((offset) => {
      const h = (pickerH + offset + 360) % 360;
      const rgb = hsvToRgb(h, pickerS, pickerV);
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    });
  };

  const complementary = getHarmonyHexes([0, 180]);
  const analogous = getHarmonyHexes([-30, 0, 30]);
  const triadic = getHarmonyHexes([0, 120, 240]);
  const tetradic = getHarmonyHexes([0, 90, 180, 270]);

  // WCAG Evaluations
  const currentRgb = hsvToRgb(pickerH, pickerS, pickerV);
  const wcagEntries = [
    { fg: currentRgb, bg: { r: 255, g: 255, b: 255 }, label: 'На белом' },
    { fg: { r: 255, g: 255, b: 255 }, bg: currentRgb, label: 'Белый текст' },
    { fg: currentRgb, bg: { r: 0, g: 0, b: 0 }, label: 'На чёрном' },
    { fg: { r: 0, g: 0, b: 0 }, bg: currentRgb, label: 'Чёрный текст' }
  ];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} скопирован в буфер!`);
    } catch (e) {
      setToast('Ошибка при копировании');
    }
  };

  const setToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Generate color vector SVG
  const generatedSvg = `<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">\n  <rect width="100" height="100" fill="${hexVal}" />\n</svg>`;

  return (
    <div id="color-tools-tool" className="grid grid-cols-1 lg:grid-cols-[331px_1fr_331px] gap-[15px] items-stretch w-full h-full min-h-0">
      
      {/* 1. COLUMN: Parameters (Figma Rectangle 3) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Параметры
        </span>

        {/* Scrollable area for controls */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          {/* Figma Custom Swatch Display (Group 4) */}
          <div className="mb-1 bg-white p-3 rounded-xl border border-gray-100 flex-shrink-0">
            {/* Swatch color rect (Rectangle 7) */}
            <div 
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="w-full h-[39px] rounded-lg cursor-pointer flex items-center justify-center text-white text-[17px] font-bold transition duration-200 shadow-2xs select-none uppercase"
              style={{ backgroundColor: hexVal }}
            >
              {hexVal}
            </div>
            {/* Color Readouts in Montserrat exact layout */}
            <div className="mt-3 flex flex-col gap-1.5 text-[12px] font-sans text-[#565C68]">
              <div className="flex font-semibold justify-between">
                <span>RGB</span>
                <span className="font-mono tracking-wide">{`${currentRgb.r}  ${currentRgb.g}  ${currentRgb.b}`}</span>
              </div>
              <div className="flex font-semibold justify-between">
                <span>CMYK</span>
                <span className="font-mono tracking-wide">{`${cmykVal.replace('cmyk(', '').replace(')', '')}`}</span>
              </div>
            </div>
          </div>

          {/* Embedding Custom Color Picker picker */}
          {isPickerOpen && (
            <div className="flex flex-col gap-4">
              {/* SV Gradient Canvas Box */}
              <div 
                ref={svContainerRef}
                className="picker-sv relative w-full aspect-square bg-gray-100 cursor-crosshair overflow-hidden rounded-xl border border-gray-100"
                onMouseDown={(e) => { dragMode.current = 'sv'; handleSvEvent(e.clientX, e.clientY); }}
                onTouchStart={(e) => { dragMode.current = 'sv'; handleSvEvent(e.touches[0].clientX, e.touches[0].clientY); }}
              >
                <canvas ref={svCanvasRef} width="240" height="240" className="w-full h-full block" />
                <div 
                  className="picker-cursor absolute w-[18px] h-[18px] rounded-full border-2 border-white pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm"
                  style={{ left: `${pickerS}%`, top: `${100 - pickerV}%`, backgroundColor: hexVal }}
                />
              </div>

              {/* Hue Linear Slider */}
              <div 
                ref={hueContainerRef}
                className="picker-hue relative w-full h-[10px] rounded-full cursor-pointer"
                style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
                onMouseDown={(e) => { dragMode.current = 'hue'; handleHueEvent(e.clientX); }}
                onTouchStart={(e) => { dragMode.current = 'hue'; handleHueEvent(e.touches[0].clientX); }}
              >
                <div 
                  className="picker-hue-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full border-2 border-white pointer-events-none z-10 shadow-sm"
                  style={{ left: `${(pickerH / 360) * 100}%`, backgroundColor: `hsl(${pickerH}, 100%, 50%)` }}
                />
              </div>

              {/* Text Input entries */}
              <div className="flex flex-col gap-2 mt-2">
                {[
                  { label: 'HEX', val: hexVal.toUpperCase(), onChange: handleHexInput },
                  { label: 'RGB', val: rgbVal, onChange: handleRgbInput }
                ].map((item) => (
                  <div key={item.label} className="flex gap-2 items-center">
                    <span className="text-[10px] font-bold text-[#A2AABD] w-10 uppercase tracking-widest leading-none font-sans">{item.label}</span>
                    <input
                      type="text"
                      value={item.val}
                      onChange={(e) => item.onChange(e.target.value)}
                      className="flex-1 bg-white border border-gray-100 rounded-lg py-1 px-2.5 text-xs font-mono font-medium text-[#565C68] outline-hidden focus:border-brand-blue"
                    />
                    <button 
                      onClick={() => copyToClipboard(item.val, item.label)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-[#A2AABD] hover:text-brand-blue transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. COLUMN: Preview Window (Figma Rectangle 5) */}
      <div className="bg-white rounded-[20px] p-6 flex flex-col h-full min-h-0 overflow-y-auto scrollbar-hide shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          просмотр
        </span>

        {/* Color Harmonies Grid container */}
        <div className="mb-6">
          <h3 className="text-xs font-bold tracking-wider text-[#A2AABD] uppercase mb-4 flex items-center gap-2">
            <Palette size={14} className="text-brand-blue" /> Цветовые Гармонии (Клик копирует цвет)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Комплиментарная', code: complementary, key: 'complementary' },
              { label: 'Аналоговая', code: analogous, key: 'analogous' },
              { label: 'Цветовая Триада', code: triadic, key: 'triadic' },
              { label: 'Тетрада форм', code: tetradic, key: 'tetradic' }
            ].map((item) => (
              <div key={item.key} className="bg-white p-3 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-widest block mb-2 font-sans">{item.label}</span>
                <div className="flex gap-1.5">
                  {item.code.map((swCode) => (
                    <div 
                      key={swCode}
                      onClick={() => handleSwatchSelection(swCode)}
                      className="flex-1 h-12 rounded-lg cursor-pointer hover:scale-[1.05] active:scale-[0.98] transition shadow-3xs group relative flex items-end justify-center pb-1 text-[9px] font-semibold text-white/0 hover:text-white/100 border border-black/5"
                      style={{ backgroundColor: swCode }}
                    >
                      <span className="bg-black/40 px-1 rounded-xs backdrop-blur-xs text-white uppercase text-[8px] tracking-wide pointer-events-none">
                        {swCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contrast testing WCAG rows */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-xs font-semibold tracking-wider text-[#A2AABD] uppercase mb-4 flex items-center gap-2 font-sans">
            <Eye size={14} className="text-brand-blue" /> Контраст текста WCAG
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {wcagEntries.map((item, idx) => {
              const ratio = contrastRatio(item.fg.r, item.fg.g, item.fg.b, item.bg.r, item.bg.g, item.bg.b);
              const pass = ratio >= 4.5 ? 'AA ✓' : ratio >= 3 ? 'AA Large' : '✗ Высокий риск';
              const isPassing = ratio >= 3;
              const fgHex = rgbToHex(item.fg.r, item.fg.g, item.fg.b);
              const bgHex = rgbToHex(item.bg.r, item.bg.g, item.bg.b);

              return (
                <div 
                  key={idx}
                  className="rounded-xl p-3 border border-gray-100 flex flex-col justify-between select-none"
                  style={{ color: fgHex, backgroundColor: bgHex }}
                >
                  <span className="text-sm font-bold block">{ratio.toFixed(2)}:1</span>
                  <div className="flex flex-col mt-2">
                    <span className="text-[10px] font-normal opacity-85 leading-none mb-1 font-sans">{item.label}</span>
                    <span className={`text-[9px] font-bold inline-block px-1 rounded-sm w-fit ${isPassing ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                      {pass}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. COLUMN: SVG Code (Figma Rectangle 4) */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 overflow-y-auto scrollbar-hide shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          svg-код
        </span>

        {/* Color shades sliders */}
        <div className="mb-5 flex-shrink-0">
          <h3 className="text-xs font-bold tracking-wider text-[#A2AABD] uppercase mb-3 flex items-center gap-2">
            <Palette size={13} className="text-brand-blue" /> Смешения Цветов (Клик копирует)
          </h3>

          {[
            { label: 'Шейды (+черный)', list: shades },
            { label: 'Тинты (+белый)', list: tints },
            { label: 'Тона (+серый)', list: tones }
          ].map((item, idx) => (
            <div key={idx} className="mb-3.5 last:mb-0">
              <span className="text-[9px] font-bold text-[#A2AABD] uppercase tracking-widest block mb-1 font-sans">{item.label}</span>
              <div className="flex gap-1">
                {item.list.map((swCode) => (
                  <div
                    key={swCode}
                    onClick={() => handleSwatchSelection(swCode)}
                    className="flex-1 h-8 rounded-md border border-black/5 cursor-pointer hover:scale-105 active:scale-95 transition"
                    style={{ backgroundColor: swCode }}
                    title={swCode}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* SVG Code display panel exactly replicating Figma block */}
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3 flex-1 min-h-[220px]">
          <h3 className="text-xs font-bold tracking-wider text-[#A2AABD] uppercase flex items-center gap-2">
            <Code size={14} className="text-brand-blue" /> Сгенерированный код
          </h3>

          {/* Figma-like high-contrast mockup codebox */}
          <div className="flex-1 min-h-[80px] bg-[#565C68] text-white rounded-xl p-3 text-[10px] font-mono break-all whitespace-pre-wrap select-all leading-relaxed overflow-y-auto">
            {generatedSvg}
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={() => copyToClipboard(generatedSvg, 'SVG-код')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Копировать SVG
            </button>
            
            <button
              onClick={() => copyToClipboard(`color: ${hexVal};\nbackground-color: ${hexVal};\nborder-color: ${hexVal};`, 'CSS-код')}
              className="w-full py-2 px-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 text-xs font-semibold text-[#565C68] transition cursor-pointer"
            >
              Копировать CSS токены
            </button>
          </div>
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
