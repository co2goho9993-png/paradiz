import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Sliders, 
  Copy, 
  Download, 
  QrCode, 
  Link, 
  Type, 
  RefreshCw,
  Info,
  Sparkles,
  Palette
} from 'lucide-react';

// @ts-ignore
import telegramLogo from '../assets/telegram-logo.svg?raw';
// @ts-ignore
import vkLogo from '../assets/vk-logo.svg?raw';
// @ts-ignore
import odnoklassnikiLogo from '../assets/odnoklassniki-logo.svg?raw';
// @ts-ignore
import maxLogo from '../assets/Max_logo.svg?raw';
// @ts-ignore
import dzenLogo from '../assets/dzen-logo.svg?raw';

type QrDataType = 'url' | 'text';
type BodyStyle = 'square' | 'dots' | 'rounded' | 'stars';
type OuterEyeStyle = 'square' | 'rounded' | 'circle';
type InnerEyeStyle = 'square' | 'rounded' | 'circle';
type QrLogoType = 'none' | 'telegram' | 'vk' | 'ok' | 'max' | 'zen';

const prepareLogoSvg = (rawSvg: string, x: number, y: number, size: number, color: string) => {
  if (!rawSvg) return '';
  // Strip XML declarations and comments
  let clean = rawSvg
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  // Find the viewBox of the original SVG to preserve it
  const viewBoxMatch = clean.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Find where the first `<svg` ends:
  const firstSvgEnd = clean.indexOf('>');
  if (firstSvgEnd !== -1) {
    let bodyAndClosing = clean.slice(firstSvgEnd + 1);
    
    // Replace dark theme/default colors with QR color for styling flexibility
    bodyAndClosing = bodyAndClosing
      .replace(/#0a0b0b/gi, color)
      .replace(/#202022/gi, color)
      .replace(/#000000/gi, color);

    // Wrap the inner elements in a group with fill color so un-styled paths are colored correctly
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">${bodyAndClosing}</g></svg>`;
  }
  return clean;
};

export default function QrGenerator() {
  const [dataType, setDataType] = useState<QrDataType>('url');
  
  // Fields for URL/Text
  const [textVal, setTextVal] = useState<string>('https://google.com');
  const [simpleText, setSimpleText] = useState<string>('Привет, параdiz!');

  // Customization settings
  const [bodyStyle, setBodyStyle] = useState<BodyStyle>('square');
  const [outerEyeStyle, setOuterEyeStyle] = useState<OuterEyeStyle>('square');
  const [innerEyeStyle, setInnerEyeStyle] = useState<InnerEyeStyle>('square');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [centerLogo, setCenterLogo] = useState<QrLogoType>('none');
  const [fgColor, setFgColor] = useState<string>('#000000'); // Default color is black

  const [svgCode, setSvgCode] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to check if row/col lies within any finder pattern
  const isFinderPattern = (row: number, col: number, size: number) => {
    // Top-left
    if (row >= 0 && row < 7 && col >= 0 && col < 7) return true;
    // Top-right
    if (row >= 0 && row < 7 && col >= size - 7 && col < size) return true;
    // Bottom-left
    if (row >= size - 7 && row < size && col >= 0 && col < 7) return true;
    return false;
  };

  const generateStyledQrSvg = () => {
    const payload = dataType === 'url' ? textVal.trim() : simpleText;
    if (!payload) {
      setSvgCode('');
      return;
    }

    try {
      // Create raw QR code matrix
      const qr = QRCode.create(payload, { errorCorrectionLevel: errorCorrection });
      const size = qr.modules.size;
      
      // Standard always-present border / margin around the code (e.g. 2 modules padding)
      const margin = 2;
      const viewBoxSize = size + margin * 2;

      // Center coordinates and mask check
      const center = Math.floor(size / 2);
      const hasLogo = centerLogo !== 'none';
      const isCenterArea = (row: number, col: number) => {
        if (!hasLogo) return false;
        // 7x7 center mask for clean, larger logos with white safety backing
        return row >= center - 3 && row <= center + 3 && col >= center - 3 && col <= center + 3;
      };

      // Start building SVG elements
      const elements: string[] = [];

      // Loop through matrix for body elements
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isDark = qr.modules.get(r, c);
          if (!isDark) continue;

          // Skip rendering finder pattern area in the body loop (we will custom-draw the 3 eyes)
          if (isFinderPattern(r, c, size)) continue;

          // Skip rendering center area if we have a logo
          if (isCenterArea(r, c)) continue;

          // Adjust position for padding
          const x = c + margin;
          const y = r + margin;

          // Render module based on style choice
          if (bodyStyle === 'square') {
            elements.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fgColor}" />`);
          } else if (bodyStyle === 'dots') {
            elements.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4" fill="${fgColor}" />`);
          } else if (bodyStyle === 'rounded') {
            elements.push(`<rect x="${x + 0.05}" y="${y + 0.05}" width="0.9" height="0.9" rx="0.28" fill="${fgColor}" />`);
          } else if (bodyStyle === 'stars') {
            elements.push(`<path d="M ${x + 0.5} ${y} Q ${x + 0.5} ${y + 0.5} ${x + 1} ${y + 0.5} Q ${x + 0.5} ${y + 0.5} ${x + 0.5} ${y + 1} Q ${x + 0.5} ${y + 0.5} ${x} ${y + 0.5} Q ${x + 0.5} ${y + 0.5} ${x + 0.5} ${y} Z" fill="${fgColor}" />`);
          }
        }
      }

      // Draw the three corner Finder Patterns (Eyes)
      const renderEye = (ex: number, ey: number) => {
        const x = ex + margin;
        const y = ey + margin;

        // 1. Draw Outer Eye Ring (7x7 frame)
        // Draw using SVG stroke inside standard rect dimensions for crisp alignment
        let rxOuter = '0';
        if (outerEyeStyle === 'rounded') rxOuter = '1.6';
        if (outerEyeStyle === 'circle') rxOuter = '3';

        elements.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="${rxOuter}" fill="none" stroke="${fgColor}" stroke-width="1" />`);

        // 2. Draw Inner Eye (3x3 solid block)
        let rxInner = '0';
        if (innerEyeStyle === 'rounded') rxInner = '0.7';
        if (innerEyeStyle === 'circle') rxInner = '1.5';

        elements.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${rxInner}" fill="${fgColor}" />`);
      };

      // Top-Left Eye
      renderEye(0, 0);
      // Top-Right Eye
      renderEye(size - 7, 0);
      // Bottom-Left Eye
      renderEye(0, size - 7);

      // Draw the center logo if specified
      if (hasLogo) {
        // Draw white backing rounded rect with high safety margins for superb contrast and scanning
        const backingSize = 7;
        const backingX = center - 3 + margin;
        const backingY = center - 3 + margin;
        elements.push(`<rect x="${backingX}" y="${backingY}" width="${backingSize}" height="${backingSize}" rx="1.6" fill="#FFFFFF" />`);

        const logoSize = 5.2; // Beautifully larger logo
        const offset = (backingSize - logoSize) / 2;
        const lx = center - 3 + margin + offset;
        const ly = center - 3 + margin + offset;

        let logoRaw = '';
        if (centerLogo === 'telegram') logoRaw = telegramLogo;
        else if (centerLogo === 'vk') logoRaw = vkLogo;
        else if (centerLogo === 'ok') logoRaw = odnoklassnikiLogo;
        else if (centerLogo === 'max') logoRaw = maxLogo;
        else if (centerLogo === 'zen') logoRaw = dzenLogo;

        const logoSvg = prepareLogoSvg(logoRaw, lx, ly, logoSize, fgColor);
        elements.push(logoSvg);
      }

      // Wrap in standard scalable, transparent background SVG
      const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="100%" height="100%">
  <!-- Generated elegantly by параdiz -->
  <g>
    ${elements.join('\n    ')}
  </g>
</svg>`;

      setSvgCode(rawSvg);
    } catch (err: any) {
      console.error(err);
      showToast('Ошибка при генерации стилизованного кода');
    }
  };

  useEffect(() => {
    generateStyledQrSvg();
  }, [dataType, textVal, simpleText, bodyStyle, outerEyeStyle, innerEyeStyle, fgColor, errorCorrection, centerLogo]);

  const downloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paradiz-qr-${dataType}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG скачан!');
  };

  const copyCode = async () => {
    if (!svgCode) return;
    try {
      await navigator.clipboard.writeText(svgCode);
      showToast('SVG успешно скопирован!');
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

  return (
    <div id="qr-generator-tool" className="grid grid-cols-1 lg:grid-cols-[331px_1fr_331px] gap-3 items-stretch w-full h-full min-h-0">
      
      {/* 1. COLUMN: Parameters & Customization */}
      <div className="bg-white rounded-[20px] p-4 pb-3.5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Данные и Стиль
        </span>

        {/* Scrollable parameters area */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-hide">
          
          {/* Tab Switch: Link vs text */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
            <button
              onClick={() => setDataType('url')}
              className={`py-1.5 px-3 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                dataType === 'url' 
                  ? 'bg-[#30ABE9] text-white shadow-3xs' 
                  : 'text-[#565C68] hover:text-black hover:bg-gray-100'
              }`}
            >
              <Link size={12} />
              <span>Ссылка</span>
            </button>
            <button
              onClick={() => setDataType('text')}
              className={`py-1.5 px-3 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                dataType === 'text' 
                  ? 'bg-[#30ABE9] text-white shadow-3xs' 
                  : 'text-[#565C68] hover:text-black hover:bg-gray-100'
              }`}
            >
              <Type size={12} />
              <span>Текст</span>
            </button>
          </div>

          {/* Dynamic input field */}
          <div className="p-2 bg-gray-50/50 border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Содержимое QR-кода
            </span>

            {dataType === 'url' ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-black bg-white focus:border-[#30ABE9] focus:outline-none transition font-medium"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <textarea
                  value={simpleText}
                  onChange={(e) => setSimpleText(e.target.value)}
                  placeholder="Введите любой текст..."
                  className="w-full h-11 p-1.5 rounded-lg border border-gray-200 text-xs text-black bg-white focus:border-[#30ABE9] focus:outline-none transition resize-none font-medium leading-normal"
                />
              </div>
            )}
          </div>

          {/* DOTS / BODY STYLES */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Стиль точек кода
            </span>

            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'square', label: 'Квадраты' },
                { id: 'dots', label: 'Круги' },
                { id: 'rounded', label: 'Сглаженные' },
                { id: 'stars', label: 'Звездочки' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setBodyStyle(style.id as BodyStyle)}
                  className={`py-1 px-1.5 rounded-lg text-center font-bold text-[10px] border transition cursor-pointer ${
                    bodyStyle === style.id
                      ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                      : 'bg-white border-gray-200 text-[#565C68] hover:bg-gray-50'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* EYE FRAME STYLE */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Внешний глазок
            </span>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'square', label: 'Квадратный' },
                { id: 'rounded', label: 'Сглаженный' },
                { id: 'circle', label: 'Круглый' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setOuterEyeStyle(style.id as OuterEyeStyle)}
                  className={`py-1 rounded-md text-center font-bold text-[9.5px] border transition cursor-pointer ${
                    outerEyeStyle === style.id
                      ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                      : 'bg-white border-gray-200 text-[#565C68] hover:bg-gray-50'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* INNER EYE (PUPIL) STYLE */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Внутренний зрачок
            </span>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'square', label: 'Квадратный' },
                { id: 'rounded', label: 'Сглаженный' },
                { id: 'circle', label: 'Круглый' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setInnerEyeStyle(style.id as InnerEyeStyle)}
                  className={`py-1 rounded-md text-center font-bold text-[9.5px] border transition cursor-pointer ${
                    innerEyeStyle === style.id
                      ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                      : 'bg-white border-gray-200 text-[#565C68] hover:bg-gray-50'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* CENTER LOGO */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Логотип в центре
            </span>

            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'none', label: 'Без логотипа' },
                { id: 'telegram', label: 'Telegram' },
                { id: 'vk', label: 'ВКонтакте' },
                { id: 'ok', label: 'Одноклассники' },
                { id: 'max', label: 'Макс' },
                { id: 'zen', label: 'Яндекс.Дзен' }
              ].map((logo) => (
                <button
                  key={logo.id}
                  onClick={() => {
                    setCenterLogo(logo.id as QrLogoType);
                    if (logo.id !== 'none') {
                      // Boost error correction level to Q or H automatically to guarantee flawless reading
                      if (errorCorrection === 'L' || errorCorrection === 'M') {
                        setErrorCorrection('Q');
                      }
                    }
                  }}
                  className={`py-1 px-1 rounded-md text-center font-bold text-[9.5px] border transition cursor-pointer ${
                    centerLogo === logo.id
                      ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                      : 'bg-white border-gray-200 text-[#565C68] hover:bg-gray-50'
                  }`}
                >
                  {logo.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR COMPLEXITY (ERROR CORRECTION LEVEL) */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
              Сложность кода
            </span>

            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'L', label: 'L', title: 'Низкая (7%)' },
                { id: 'M', label: 'M', title: 'Средняя (15%)' },
                { id: 'Q', label: 'Q', title: 'Повышенная (25%)' },
                { id: 'H', label: 'H', title: 'Высокая (30%)' }
              ].map((level) => (
                <button
                  key={level.id}
                  onClick={() => setErrorCorrection(level.id as 'L' | 'M' | 'Q' | 'H')}
                  title={level.title}
                  className={`py-1 rounded-md text-center font-bold text-[10px] border transition cursor-pointer ${
                    errorCorrection === level.id
                      ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                      : 'bg-white border-gray-200 text-[#565C68] hover:bg-gray-50'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* COLOR PICKER */}
          <div className="p-2 bg-white border border-gray-100 rounded-xl flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <Palette size={11} className="text-[#30ABE9]" />
              <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block font-sans">
                Цвет QR-кода
              </span>
            </div>

            {/* Hex Input & Picker */}
            <div className="flex gap-1.5">
              <div 
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shadow-3xs shrink-0"
                style={{ backgroundColor: fgColor }}
                title="Нажмите для выбора цвета"
                onClick={() => document.getElementById('qr-styler-fg-color')?.click()}
              />
              <input 
                id="qr-styler-fg-color"
                type="color" 
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="hidden"
              />
              <input
                type="text"
                maxLength={7}
                value={fgColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('#') && val.length <= 7) {
                    setFgColor(val);
                  } else if (!val.startsWith('#') && val.length <= 6) {
                    setFgColor('#' + val);
                  }
                }}
                className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] text-black font-semibold font-mono focus:border-[#30ABE9] focus:outline-none uppercase"
              />
            </div>
          </div>

        </div>

        {/* Download action button */}
        <div className="flex flex-col gap-2 pt-2.5 mt-auto border-t border-gray-100 font-semibold text-xs flex-shrink-0">
          <button
            onClick={downloadSvg}
            disabled={!svgCode}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={13} /> Скачать SVG
          </button>
        </div>
      </div>

      {/* 2. COLUMN: Modern Center Preview */}
      <div className="bg-white rounded-[20px] p-4 pb-3.5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Окно превью
        </span>

        {/* Dynamic visual canvas with a transparent grid or elegant soft backdrop */}
        <div className="w-full flex-1 min-h-0 bg-gray-50/40 border border-gray-100 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-4 select-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
          {svgCode ? (
            <div className="w-56 h-56 md:w-72 md:h-72 flex flex-col items-center justify-center hover:scale-[1.03] transition duration-300 relative">
              <div 
                className="w-full h-full object-contain flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgCode }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400 font-medium text-xs flex flex-col items-center gap-2">
              <QrCode size={32} className="text-gray-300 stroke-[1.5]" />
              <span>Введите данные для генерации</span>
            </div>
          )}

          {svgCode && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 bg-white/95 rounded-full text-[9px] font-bold text-[#565C68] border border-gray-100 shadow-3xs backdrop-blur-xs select-none">
              <Info size={9} className="text-[#30ABE9]" />
              <span>Модный прозрачный SVG вектор</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. COLUMN: SVG code panel */}
      <div className="bg-white rounded-[20px] p-4 pb-3.5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          svg-код
        </span>

        <div className="flex-1 flex flex-col min-h-0 gap-2.5">
          <div className="flex-1 min-h-[120px] bg-[#565C68] text-white rounded-xl p-2.5 text-[9px] font-mono whitespace-pre-wrap select-all leading-relaxed break-all overflow-y-auto">
            {svgCode || '<!-- Векторный код QR-кода будет отображен здесь -->'}
          </div>

          <button
            onClick={copyCode}
            disabled={!svgCode}
            className="w-full py-2 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Copy size={12} /> Копировать код
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
