import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Type, Download, Trash2 } from 'lucide-react';

type RegMode = 'upper' | 'lower' | 'title' | 'invert' | 'sentence' | 'kebab' | 'snake' | 'camel';

export default function CaseConverter() {
  const [inputText, setInputText] = useState<string>('представили макеты роботизированной техники в совете федерации');
  const [outputText, setOutputText] = useState<string>('ПРЕДСТАВИЛИ МАКЕТЫ РОБОТИЗИРОВАННОЙ ТЕХНИКИ В СОВЕТЕ ФЕДЕРАЦИИ');
  const [activeReg, setActiveReg] = useState<RegMode>('upper');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const convertText = (mode: RegMode, customInput?: string) => {
    setActiveReg(mode);
    const targetText = customInput !== undefined ? customInput : inputText;
    
    if (!targetText.trim()) {
      setOutputText('');
      return;
    }

    let result = '';
    const trimmed = targetText.trim();

    switch (mode) {
      case 'upper':
        result = targetText.toUpperCase();
        break;
      case 'lower':
        result = targetText.toLowerCase();
        break;
      case 'title':
        result = targetText
          .toLowerCase()
          .replace(/(^\s*|[.!?]\s+|\s+)([a-zа-яё])/gi, (m, p1, p2) => p1 + p2.toUpperCase());
        break;
      case 'sentence':
        result = targetText
          .toLowerCase()
          .replace(/(^\s*|[.!?]\s+)([a-zа-яё])/gi, (m, p1, p2) => p1 + p2.toUpperCase());
        break;
      case 'invert':
        result = targetText
          .split('')
          .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
          .join('');
        break;
      case 'kebab':
        result = trimmed
          .toLowerCase()
          .replace(/[^a-z0-9а-яё\s]/gi, '')
          .split(/\s+/)
          .filter(Boolean)
          .join('-');
        break;
      case 'snake':
        result = trimmed
          .toLowerCase()
          .replace(/[^a-z0-9а-яё\s]/gi, '')
          .split(/\s+/)
          .filter(Boolean)
          .join('_');
        break;
      case 'camel':
        const words = trimmed
          .toLowerCase()
          .replace(/[^a-z0-9а-яё\s]/gi, '')
          .split(/\s+/)
          .filter(Boolean);
        result = words
          .map((word, idx) => (idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
          .join('');
        break;
    }

    setOutputText(result);
  };

  // Convert whenever input text or active mode changes
  useEffect(() => {
    convertText(activeReg);
  }, [inputText, activeReg]);

  const copyToClipboard = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setToast('Текст скопирован!');
    } catch (e) {
      setToast('Ошибка при копировании');
    }
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setToast('Очищено');
  };

  const downloadTextFile = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast('Файл txt скачан!');
  };

  const setToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div id="case-converter-tool" className="w-full max-w-5xl mx-auto flex flex-col select-none">
      
      {/* Title block on top left of the boxes */}
      <div className="mb-2 text-left px-1">
        <span className="text-[12px] font-extrabold text-[#565C68] uppercase tracking-wider block font-sans">
          КОНВЕРТЕР РЕГИСТРОВ
        </span>
      </div>

      {/* Cards Row (Figma Desktop - 2 rectangles side-by-side with fixed height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px] items-stretch w-full mb-6">
        
        {/* Input box card (Figma Rectangle 6) */}
        <div className="bg-white rounded-[20px] p-5 lg:p-6 flex flex-col h-[200px] lg:h-[230px] shadow-sm relative transition duration-200">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans">
              Исходный копирайт (Ввод)
            </span>
            <button 
              onClick={clearAll} 
              className="text-[#A2AABD] hover:text-red-500 transition p-1 rounded-lg hover:bg-gray-50"
              title="Очистить"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Введите или вставьте исходный текст здесь..."
            className="flex-1 w-full bg-transparent resize-none border-none outline-hidden text-[16px] lg:text-[18px] font-sans font-medium text-[#565C68] placeholder-gray-300 leading-relaxed min-h-0"
          />
        </div>

        {/* Output box card (Figma Rectangle 8) */}
        <div className="bg-white rounded-[20px] p-5 lg:p-6 flex flex-col h-[200px] lg:h-[230px] shadow-sm relative transition duration-200">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans">
              Результат конвертации
            </span>
            {outputText && (
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="text-brand-blue hover:text-brand-blue-hover transition p-1.5 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                  title="Копировать"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>
          
          <textarea
            readOnly
            value={outputText}
            placeholder="Результат появится здесь..."
            className="flex-1 w-full bg-transparent resize-none border-none outline-hidden text-[16px] lg:text-[18px] font-sans font-bold text-black placeholder-gray-300 leading-relaxed min-h-0"
          />
        </div>
      </div>

      {/* Case Options ribbon: centered horizontally and vertically, no outer cards, just beautiful link/pill switchers */}
      <div className="w-full flex flex-col items-center justify-center gap-5">
        <div className="flex flex-wrap items-center justify-center gap-x-5 lg:gap-x-7 gap-y-3 text-center px-4 w-full">
          {[
            { id: 'upper', label: 'ВЕРХНИЙ РЕГИСТР' },
            { id: 'lower', label: 'нижний регистр' },
            { id: 'title', label: 'Заглавные Буквы' },
            { id: 'invert', label: 'иНВЕРСИЯ рЕГИСТРА' },
            { id: 'sentence', label: 'По предложениям' },
            { id: 'kebab', label: 'kebab-case' },
            { id: 'snake', label: 'snake_case' },
            { id: 'camel', label: 'camelCase' },
          ].map((reg) => {
            const isActive = activeReg === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => convertText(reg.id as RegMode)}
                className={`text-xs transition duration-200 uppercase font-extrabold select-none px-3.5 py-1.5 rounded-[10px] ${
                  isActive
                    ? 'bg-[#30ABE9] text-white shadow-3xs cursor-default'
                    : 'text-[#30ABE9] hover:text-[#1e9bd9] hover:bg-[#30ABE9]/5 cursor-pointer'
                }`}
              >
                {reg.label}
              </button>
            );
          })}
        </div>

        {/* Action button triggers centered below */}
        {outputText && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 animation-fade-in">
            <button
              onClick={copyToClipboard}
              className="py-2 px-5 rounded-lg bg-[#30ABE9]/15 hover:bg-[#30ABE9]/25 text-[#1a8fcb] text-[11px] font-bold transition flex items-center gap-1.5 select-none cursor-pointer"
            >
              <Copy size={12} /> Копировать
            </button>
            
            <button
              onClick={downloadTextFile}
              className="py-2 px-5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 text-[11px] font-bold text-[#565C68] transition select-none shadow-3xs cursor-pointer"
            >
              Скачать TXT файл
            </button>
          </div>
        )}
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold z-50 pointer-events-none transition duration-300 shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
