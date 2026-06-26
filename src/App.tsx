import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import VectorTracer from './components/VectorTracer';
import BlobGenerator from './components/BlobGenerator';
import WaveGenerator from './components/WaveGenerator';
import ColorTools from './components/ColorTools';
import ChartGenerator from './components/ChartGenerator';
import CaseConverter from './components/CaseConverter';
import QrGenerator from './components/QrGenerator';

import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('vector');

  const tabLabels: { id: TabType; label: string }[] = [
    { id: 'vector', label: 'Трассировка' },
    { id: 'blob', label: 'Блобы' },
    { id: 'wave', label: 'Волны' },
    { id: 'color', label: 'Цвета' },
    { id: 'chart', label: 'Диаграммы' },
    { id: 'case', label: 'Регистры' },
    { id: 'qr', label: 'QR-коды' },
  ];

  return (
    <div id="paradiz-app-root" className="font-sans antialiased text-[#565C68] bg-[#DBDEE5] h-screen max-h-screen flex flex-col selection:bg-[#30ABE9]/30 overflow-hidden select-none">
      
      {/* 1. Header (Figma white nav bar of exactly 60px height) */}
      <nav id="paradiz-nav" className="h-[60px] flex-shrink-0 bg-white flex items-center select-none z-50">
        <div className="w-full mx-auto pl-0 pr-[15px] lg:pr-[24px] flex items-center justify-between h-full">
          
          {/* Exact Figma Logo with custom logo from google drive */}
          <div className="flex items-center h-full gap-0 select-none">
            {/* Image container handles cropping to perfect edge-to-edge */}
            <div className="relative w-[78px] h-full overflow-hidden shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1Cb8jGwCXUf7IF3VmO8m2FFrXizBMLwn1" 
                className="absolute -left-[50px] -top-[32px] h-[124px] w-auto max-w-none object-contain select-none pointer-events-none" 
                alt="Logo"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Brand Text: Montserrat lowercase "параdiz" */}
            <span className="font-extrabold text-[28px] lg:text-[33px] tracking-tight leading-none text-[#30ABE9] font-sans">
              пара<span className="font-medium text-[#30ABE9]/85">diz</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-[10px] lg:gap-[20px]">
            <div className="hidden md:flex items-center gap-[6px] lg:gap-[10px]">
              {tabLabels.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-[32px] px-4 lg:px-5 rounded-[10px] text-xs lg:text-sm font-bold font-sans transition-all duration-200 cursor-pointer relative flex items-center justify-center ${
                      isActive 
                        ? 'bg-[#30ABE9] text-white shadow-3xs' 
                        : 'text-[#565C68] hover:text-black hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </nav>

      {/* Mobile view subbar */}
      <div className="md:hidden sticky top-[60px] z-45 bg-white overflow-x-auto flex py-2 px-3 gap-1.5 scrollbar-hide select-none flex-shrink-0">
        {tabLabels.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-none py-1.5 px-4 rounded-[10px] text-[11px] font-bold font-sans flex items-center gap-1 transition ${
                isActive ? 'bg-[#30ABE9] text-white shadow-3xs' : 'bg-gray-50 text-[#565C68] hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. Main Workspace (Figma gray workspace board of y: 126px with direct cards) */}
      <main id="working-transaction-board animate-fade-in" className="flex-1 min-h-0 w-full mx-auto p-[15px] lg:p-[24px] flex flex-col overflow-hidden">
        
        {/* Workspace dynamic transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full h-full flex flex-col min-h-0"
          >
            {/* Active Workspace Container Slot */}
            <div className="w-full flex-1 min-h-0">
              {activeTab === 'vector' && <VectorTracer />}
              {activeTab === 'blob' && <BlobGenerator />}
              {activeTab === 'wave' && <WaveGenerator />}
              {activeTab === 'color' && <ColorTools />}
              {activeTab === 'chart' && <ChartGenerator />}
              {activeTab === 'case' && <CaseConverter />}
              {activeTab === 'qr' && <QrGenerator />}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
