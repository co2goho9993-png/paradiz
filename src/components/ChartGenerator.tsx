import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Copy, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  ArrowRightLeft,
  Settings,
  Grid,
  ChevronDown
} from 'lucide-react';

interface ChartCategory {
  id: string;
  label: string;
}

interface ChartSeries {
  id: string;
  name: string;
  color: string;
}

type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'donut';
type OrientationType = 'vertical' | 'horizontal';
type GroupModeType = 'normal' | 'stacked';

export default function ChartGenerator() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [orientation, setOrientation] = useState<OrientationType>('vertical');
  const [groupMode, setGroupMode] = useState<GroupModeType>('normal');
  const [chartTitle, setChartTitle] = useState<string>('Продажи по кварталам');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canvasW, setCanvasW] = useState<number>(600);
  const [canvasH, setCanvasH] = useState<number>(420);
  
  // Selected series for Pie / Donut if there are multiple series
  const [activePieSeries, setActivePieSeries] = useState<string>('s1');

  // Palette settings
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('paradiz');
  const [isPaletteDropdownOpen, setIsPaletteDropdownOpen] = useState<boolean>(false);
  
  const palettes = [
    {
      id: 'paradiz',
      name: 'Яркий Параdiz',
      colors: ['#30ABE9', '#FF9F43', '#4CD137', '#9B59B6', '#FF4D4D', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E', '#E84393']
    },
    {
      id: 'pastel',
      name: 'Нежный пастельный',
      colors: ['#7DA4D9', '#EBA487', '#A0D8A9', '#CDA6E6', '#F5CA87', '#79D2D2', '#E78CA3', '#D6C5A0', '#C2C9D6', '#EAD5C3']
    },
    {
      id: 'monochrome-blue',
      name: 'Монохромный синий (Контраст)',
      colors: ['#1E3A8A', '#60A5FA', '#172554', '#3B82F6', '#93C5FD', '#2563EB', '#0284C7', '#BFDBFE', '#1D4ED8', '#06B6D4']
    },
    {
      id: 'monochrome-slate',
      name: 'Монохромный пепел (Контраст)',
      colors: ['#0F172A', '#94A3B8', '#1E293B', '#64748B', '#CBD5E1', '#334155', '#E2E8F0', '#475569', '#F1F5F9', '#565C68']
    },
    {
      id: 'organic',
      name: 'Теплая органика',
      colors: ['#8FBC8F', '#A3B18A', '#588157', '#BC6C25', '#DDA15E', '#E07A5F', '#9E2A2B', '#E5A93C', '#4F772D', '#31572C']
    }
  ];

  const colorPalette = palettes.find(p => p.id === selectedPaletteId)?.colors || palettes[0].colors;

  // Sizing of indicators scale (10 to 100)
  const [elementSize, setElementSize] = useState<number>(50);

  // Font size of value labels (6px to 18px)
  const [valueFontSize, setValueFontSize] = useState<number>(10);

  // Axis categories (bars/points)
  const [categories, setCategories] = useState<ChartCategory[]>([
    { id: 'c1', label: 'Q1' },
    { id: 'c2', label: 'Q2' },
    { id: 'c3', label: 'Q3' },
    { id: 'c4', label: 'Q4' }
  ]);

  // Groups / Series
  const [seriesList, setSeriesList] = useState<ChartSeries[]>([
    { id: 's1', name: 'Параdiz', color: '#30ABE9' },
    { id: 's2', name: 'Партнеры', color: '#FF9F43' }
  ]);

  // Matrix values: values[categoryId][seriesId] = number
  const [values, setValues] = useState<Record<string, Record<string, number>>>({
    'c1': { 's1': 65, 's2': 45 },
    'c2': { 's1': 80, 's2': 55 },
    'c3': { 's1': 95, 's2': 75 },
    'c4': { 's1': 70, 's2': 50 }
  });

  const [svgCode, setSvgCode] = useState<string>('');

  // Auto ensure newly initialized states when adding/removing category or series
  useEffect(() => {
    setValues(prev => {
      const updated = { ...prev };
      categories.forEach(cat => {
        if (!updated[cat.id]) {
          updated[cat.id] = {};
        }
        seriesList.forEach(ser => {
          if (updated[cat.id][ser.id] === undefined) {
            updated[cat.id][ser.id] = Math.floor(Math.random() * 60) + 20;
          }
        });
      });
      return updated;
    });

    if (seriesList.length > 0 && !seriesList.find(s => s.id === activePieSeries)) {
      setActivePieSeries(seriesList[0].id);
    }
  }, [categories, seriesList]);

  // Synchronize series colors dynamically when selected palette changes
  useEffect(() => {
    setSeriesList(prev => prev.map((ser, index) => ({
      ...ser,
      color: colorPalette[index % colorPalette.length]
    })));
  }, [selectedPaletteId]);

  // Randomize all values
  const randomizeValues = () => {
    setValues(prev => {
      const updated = { ...prev };
      categories.forEach(cat => {
        updated[cat.id] = {};
        seriesList.forEach(ser => {
          updated[cat.id][ser.id] = Math.floor(Math.random() * 85) + 15;
        });
      });
      return updated;
    });
    showToast('Показатели случайно обновлены!');
  };

  // Add category (new point/label)
  const addCategory = () => {
    if (categories.length >= 10) {
      showToast('Достигнут предел категорий (макс. 10)');
      return;
    }
    const nextIdx = categories.length + 1;
    const nextId = `c_${Date.now()}`;
    setCategories([...categories, { id: nextId, label: `Месяц ${nextIdx}` }]);
    showToast('Добавлен новый столбец / период!');
  };

  // Remove category
  const removeCategory = (id: string) => {
    if (categories.length <= 1) {
      showToast('Меньше одной категории нельзя!');
      return;
    }
    setCategories(categories.filter(c => c.id !== id));
    showToast('Категория убрана');
  };

  // Add series group
  const addSeries = () => {
    if (seriesList.length >= 6) {
      showToast('Достигнут предел групп (макс. 6)');
      return;
    }
    const nextIdx = seriesList.length + 1;
    const nextId = `s_${Date.now()}`;
    const nextColor = colorPalette[seriesList.length % colorPalette.length];
    setSeriesList([...seriesList, { id: nextId, name: `Группа ${nextIdx}`, color: nextColor }]);
    showToast('Добавлена новая группа показателей!');
  };

  // Remove series group
  const removeSeries = (id: string) => {
    if (seriesList.length <= 1) {
      showToast('Должна оставаться хотя бы одна группа!');
      return;
    }
    setSeriesList(seriesList.filter(s => s.id !== id));
    showToast('Группа показателей убрана');
  };

  // Edit category label
  const updateCategoryLabel = (id: string, label: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label } : c));
  };

  // Edit series state (name/color)
  const updateSeriesParam = (id: string, key: keyof ChartSeries, val: string) => {
    setSeriesList(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));
  };

  // Edit cell value
  const updateValueCell = (catId: string, serId: string, val: number) => {
    setValues(prev => ({
      ...prev,
      [catId]: {
        ...(prev[catId] || {}),
        [serId]: val
      }
    }));
  };

  // Dimensions
  const pLeft = 65;
  const pRight = 35;
  const pTop = 40;
  const pBottom = 55;

  const graphW = canvasW - pLeft - pRight;
  const graphH = canvasH - pTop - pBottom;

  // SVG drawing logic in effect
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find numeric limits
    let maxSingleValue = 10;
    let maxStackedValue = 10;

    categories.forEach(cat => {
      let stackSum = 0;
      seriesList.forEach(ser => {
        const val = values[cat.id]?.[ser.id] || 0;
        if (val > maxSingleValue) maxSingleValue = val;
        stackSum += val;
      });
      if (stackSum > maxStackedValue) maxStackedValue = stackSum;
    });

    const currentMax = groupMode === 'stacked' && chartType === 'bar' ? maxStackedValue : maxSingleValue;
    // Round to top convenient scale
    const roundLimit = Math.ceil(currentMax / 10) * 10 || 10;

    let segments = '';
    let gridCode = '';
    let legendCode = '';

    // Draw Legend Code
    const legendY = 20;
    const legendXStart = pLeft;
    let accumulatedX = legendXStart;
    legendCode = `<g id="chart-legend" transform="translate(0, 0)">\n`;
    seriesList.forEach((ser, sIdx) => {
      legendCode += `    <rect x="${accumulatedX}" y="${legendY - 8}" width="12" height="12" rx="3" fill="${ser.color}" />\n`;
      legendCode += `    <text x="${accumulatedX + 16}" y="${legendY + 2}" fill="#565C68" font-size="10" font-family="system-ui, sans-serif" font-weight="600">${ser.name}</text>\n`;
      accumulatedX += ser.name.length * 6 + 42;
    });
    legendCode += `  </g>`;

    if (chartType === 'bar') {
      if (orientation === 'vertical') {
        const categoryWidth = graphW / categories.length;

        // Draw Guide Grids
        if (showGrid) {
          for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const y = pTop + graphH * (1 - ratio);
            const gridVal = Math.round(roundLimit * ratio);
            gridCode += `  <line x1="${pLeft}" y1="${y}" x2="${canvasW - pRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,3" />\n`;
            gridCode += `  <text x="${pLeft - 10}" y="${y + 4}" fill="#A2AABD" font-size="10" font-family="system-ui, sans-serif" font-weight="700" text-anchor="end">${gridVal}</text>\n`;
          }
        }

        // Generate Bars
        categories.forEach((cat, cIdx) => {
          const catCenterX = pLeft + cIdx * categoryWidth + categoryWidth / 2;
          
          if (groupMode === 'normal') {
            const totalGroupWidth = Math.min(categoryWidth * 0.95, categoryWidth * 0.75 * (elementSize / 50));
            const singleBarWidth = totalGroupWidth / seriesList.length;
            const startX = pLeft + cIdx * categoryWidth + (categoryWidth - totalGroupWidth) / 2;

            seriesList.forEach((ser, sIdx) => {
              const val = values[cat.id]?.[ser.id] || 0;
              const barH = graphH * (val / roundLimit);
              const xPos = startX + sIdx * singleBarWidth;
              const yPos = pTop + graphH - barH;
              const innerW = singleBarWidth * 0.82;

              segments += `  <!-- Category ${cat.label} - Series ${ser.name} -->
  <rect x="${xPos.toFixed(1)}" y="${yPos.toFixed(1)}" width="${innerW.toFixed(1)}" height="${Math.max(1, barH).toFixed(1)}" rx="4" fill="${ser.color}" />\n`;
              if (showValues && val > 0) {
                segments += `  <text x="${(xPos + innerW / 2).toFixed(1)}" y="${(yPos - 6).toFixed(1)}" fill="#2D3748" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">${val}</text>\n`;
              }
            });

          } else {
            // STACKED vertical
            const barWidth = Math.min(categoryWidth * 0.85, categoryWidth * 0.55 * (elementSize / 50));
            const xPos = pLeft + cIdx * categoryWidth + (categoryWidth - barWidth) / 2;
            let currentYAccum = 0;

            seriesList.forEach((ser) => {
              const val = values[cat.id]?.[ser.id] || 0;
              if (val <= 0) return;
              const segmentHeight = graphH * (val / roundLimit);
              const yPos = pTop + graphH - currentYAccum - segmentHeight;

              segments += `  <!-- Stacked ${cat.label} - ${ser.name} -->
  <rect x="${xPos.toFixed(1)}" y="${yPos.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${segmentHeight.toFixed(1)}" rx="2" fill="${ser.color}" />\n`;
              if (showValues && segmentHeight > 16) {
                segments += `  <text x="${(xPos + barWidth / 2).toFixed(1)}" y="${(yPos + segmentHeight / 2 + 3).toFixed(1)}" fill="#ffffff" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">${val}</text>\n`;
              }
              currentYAccum += segmentHeight;
            });
          }

          // Category label
          segments += `  <text x="${catCenterX.toFixed(1)}" y="${pTop + graphH + 20}" fill="#565C68" font-size="11" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">${cat.label}</text>\n`;
        });

      } else {
        // HORIZONTAL BARS
        const categoryHeight = graphH / categories.length;

        // Draw Guide Grids X Axis
        if (showGrid) {
          for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const x = pLeft + graphW * ratio;
            const gridVal = Math.round(roundLimit * ratio);
            gridCode += `  <line x1="${x}" y1="${pTop}" x2="${x}" y2="${pTop + graphH}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,3" />\n`;
            gridCode += `  <text x="${x}" y="${pTop + graphH + 16}" fill="#A2AABD" font-size="10" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">${gridVal}</text>\n`;
          }
        }

        // Generate bars
        categories.forEach((cat, cIdx) => {
          const catCenterY = pTop + cIdx * categoryHeight + categoryHeight / 2;

          if (groupMode === 'normal') {
            const totalGroupHeight = Math.min(categoryHeight * 0.95, categoryHeight * 0.75 * (elementSize / 50));
            const singleBarHeight = totalGroupHeight / seriesList.length;
            const startY = pTop + cIdx * categoryHeight + (categoryHeight - totalGroupHeight) / 2;

            seriesList.forEach((ser, sIdx) => {
              const val = values[cat.id]?.[ser.id] || 0;
              const barLen = graphW * (val / roundLimit);
              const yPos = startY + sIdx * singleBarHeight;
              const innerH = singleBarHeight * 0.82;

              segments += `  <!-- Horiz Cat ${cat.label} - ${ser.name} -->
  <rect x="${pLeft}" y="${yPos.toFixed(1)}" width="${Math.max(1, barLen).toFixed(1)}" height="${innerH.toFixed(1)}" rx="3" fill="${ser.color}" />\n`;
              if (showValues && val > 0) {
                segments += `  <text x="${(pLeft + barLen + 6).toFixed(1)}" y="${(yPos + innerH / 2 + 3.5).toFixed(1)}" fill="#2D3748" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="800" text-anchor="start">${val}</text>\n`;
              }
            });

          } else {
            // STACKED horizontal
            const barHeight = Math.min(categoryHeight * 0.85, categoryHeight * 0.55 * (elementSize / 50));
            const yPos = pTop + cIdx * categoryHeight + (categoryHeight - barHeight) / 2;
            let currentXAccum = 0;

            seriesList.forEach((ser) => {
              const val = values[cat.id]?.[ser.id] || 0;
              if (val <= 0) return;
              const segmentWidth = graphW * (val / roundLimit);
              const xPos = pLeft + currentXAccum;

              segments += `  <!-- Stacked Horiz ${cat.label} - ${ser.name} -->
  <rect x="${xPos.toFixed(1)}" y="${yPos.toFixed(1)}" width="${segmentWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${ser.color}" />\n`;
              if (showValues && segmentWidth > 18) {
                segments += `  <text x="${(xPos + segmentWidth / 2).toFixed(1)}" y="${(yPos + barHeight / 2 + 3.5).toFixed(1)}" fill="#ffffff" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">${val}</text>\n`;
              }
              currentXAccum += segmentWidth;
            });
          }

          // Y Axis Labels
          segments += `  <text x="${pLeft - 10}" y="${catCenterY + 4}" fill="#565C68" font-size="11" font-family="system-ui, sans-serif" font-weight="700" text-anchor="end">${cat.label}</text>\n`;
        });
      }

    } else if (chartType === 'line' || chartType === 'area') {
      const categoryWidth = graphW / (categories.length - 1 || 1);

      // Axis Grids
      if (showGrid) {
        for (let i = 0; i <= 4; i++) {
          const ratio = i / 4;
          const y = pTop + graphH * (1 - ratio);
          const gridVal = Math.round(roundLimit * ratio);
          gridCode += `  <line x1="${pLeft}" y1="${y}" x2="${canvasW - pRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,3" />\n`;
          gridCode += `  <text x="${pLeft - 10}" y="${y + 4}" fill="#A2AABD" font-size="10" font-family="system-ui, sans-serif" font-weight="700" text-anchor="end">${gridVal}</text>\n`;
        }
      }

      // Render lines & areas for each series group separately
      seriesList.forEach((ser) => {
        const pointsArray: { x: number; y: number; val: number }[] = [];
        categories.forEach((cat, cIdx) => {
          const x = pLeft + cIdx * categoryWidth;
          const val = values[cat.id]?.[ser.id] || 0;
          const y = pTop + graphH - (graphH * (val / roundLimit));
          pointsArray.push({ x, y, val });
        });

        // Line path
        let linePathStr = `M ${pointsArray[0].x.toFixed(1)} ${pointsArray[0].y.toFixed(1)}`;
        for (let i = 1; i < pointsArray.length; i++) {
          linePathStr += ` L ${pointsArray[i].x.toFixed(1)} ${pointsArray[i].y.toFixed(1)}`;
        }

        // Area gradient path
        if (chartType === 'area') {
          const gradientId = `grad_${ser.id}`;
          gridCode += `  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ser.color}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${ser.color}" stop-opacity="0.0" />
    </linearGradient>
  </defs>\n`;
          const areaPathStr = `${linePathStr} L ${pointsArray[pointsArray.length - 1].x.toFixed(1)} ${(pTop + graphH).toFixed(1)} L ${pointsArray[0].x.toFixed(1)} ${(pTop + graphH).toFixed(1)} Z`;
          segments += `  <path d="${areaPathStr}" fill="url(#${gradientId})" stroke="none" />\n`;
        }

        // Draw Line stroke
        const lineStrokeW = 1.0 + 4.0 * (elementSize / 50);
        segments += `  <path d="${linePathStr}" fill="none" stroke="${ser.color}" stroke-width="${lineStrokeW.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" />\n`;

        // Dots nodes
        const nodeRadius = 2.0 + 5.0 * (elementSize / 50);
        const nodeStrokeW = 1.0 + 2.5 * (elementSize / 50);
        pointsArray.forEach((pt, pIdx) => {
          segments += `  <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${nodeRadius.toFixed(1)}" fill="#ffffff" stroke="${ser.color}" stroke-width="${nodeStrokeW.toFixed(1)}" />\n`;
          if (showValues) {
            segments += `  <text x="${pt.x.toFixed(1)}" y="${(pt.y - nodeRadius - 5).toFixed(1)}" fill="#2D3748" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="950" text-anchor="middle">${pt.val}</text>\n`;
          }
        });
      });

      // Categories Labels
      categories.forEach((cat, cIdx) => {
        const x = pLeft + cIdx * categoryWidth;
        segments += `  <text x="${x.toFixed(1)}" y="${pTop + graphH + 20}" fill="#565C68" font-size="11" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">${cat.label}</text>\n`;
      });

    } else if (chartType === 'pie' || chartType === 'donut') {
      const cx = canvasW / 2;
      const cy = canvasH / 2 + 10;
      const baseRadius = Math.min(canvasW, canvasH) * 0.28;
      const radius = baseRadius * (elementSize / 50);
      let angleSum = 0;

      // Extract values from single chosen Active series group for standard parts evaluation
      const currentSer = seriesList.find(s => s.id === activePieSeries) || seriesList[0];
      const itemsSum = categories.reduce((sum, cat) => sum + (values[cat.id]?.[currentSer.id] || 0), 0) || 1;

      categories.forEach((cat, cIdx) => {
        const val = values[cat.id]?.[currentSer.id] || 0;
        if (val <= 0) return;

        const portion = val / itemsSum;
        const currentAngle = portion * 360;

        const radStart = ((angleSum - 90) * Math.PI) / 180;
        const radEnd = (((angleSum + currentAngle) - 90) * Math.PI) / 180;

        const x1 = cx + radius * Math.cos(radStart);
        const y1 = cy + radius * Math.sin(radStart);
        const x2 = cx + radius * Math.cos(radEnd);
        const y2 = cy + radius * Math.sin(radEnd);

        const arcFlag = currentAngle > 180 ? 1 : 0;
        
        // Use a persistent item index to match a unique palette color
        const segmentColor = colorPalette[cIdx % colorPalette.length];

        const pathFormula = `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${arcFlag} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;

        // Mid label coordinates
        const labelRad = (((angleSum + currentAngle / 2) - 90) * Math.PI) / 180;

        segments += `  <!-- Pie Sector: ${cat.label} -->
  <path d="${pathFormula}" fill="${segmentColor}" stroke="#ffffff" stroke-width="2" />\n`;

        if (showValues && portion > 0.01) {
          const pctStr = `${Math.round(portion * 100)}%`;
          
          // Start the pointer line on the sector edge
          const lineStartX = cx + radius * 0.90 * Math.cos(labelRad);
          const lineStartY = cy + radius * 0.90 * Math.sin(labelRad);
          
          // Project the pointer line further out
          const extraDist = Math.max(15, 30 * (elementSize / 50));
          const lineEndX = cx + (radius + extraDist) * Math.cos(labelRad);
          const lineEndY = cy + (radius + extraDist) * Math.sin(labelRad);
          
          const lx = cx + (radius + extraDist + 6) * Math.cos(labelRad);
          const ly = cy + (radius + extraDist + 6) * Math.sin(labelRad);
          
          const cos = Math.cos(labelRad);
          let textAnchor = 'middle';
          if (cos > 0.15) {
            textAnchor = 'start';
          } else if (cos < -0.15) {
            textAnchor = 'end';
          }
          
          segments += `  <!-- Pointer Line -->
  <line x1="${lineStartX.toFixed(1)}" y1="${lineStartY.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${lineEndY.toFixed(1)}" stroke="${segmentColor}" stroke-width="1.2" stroke-dasharray="2,2" />\n`;
          
          segments += `  <!-- Text Value Outside -->
  <text x="${lx.toFixed(1)}" y="${(ly + 3.5).toFixed(1)}" fill="#2D3748" font-size="${valueFontSize}" font-family="system-ui, sans-serif" font-weight="900" text-anchor="${textAnchor}">${pctStr}</text>\n`;
        }

        angleSum += currentAngle;
      });

      // Pie custom legend lists
      const legendW = 110;
      const legendX = canvasW - pRight - legendW;
      const startLegendY = pTop + 40;
      categories.forEach((cat, cIdx) => {
        const val = values[cat.id]?.[currentSer.id] || 0;
        const legY = startLegendY + cIdx * 20;
        const customCol = colorPalette[cIdx % colorPalette.length];
        
        if (legY < canvasH - 30) {
          segments += `  <g transform="translate(${legendX}, ${legY})">
    <rect width="10" height="10" rx="3" fill="${customCol}" />
    <text x="16" y="9" fill="#565C68" font-size="10" font-family="system-ui, sans-serif" font-weight="700">${cat.label} (${val})</text>
  </g>\n`;
        }
      });

      if (chartType === 'donut') {
        const holeRadius = radius * 0.58;
        const sumFontLabel = Math.max(8, 10 * (radius / 80));
        const sumFontVal = Math.max(12, 17 * (radius / 80));
        
        const valueY = cy + (sumFontVal * 0.15);
        const labelY = valueY + sumFontLabel + 4;

        segments += `  <!-- Inner Hole Donut -->
  <circle cx="${cx}" cy="${cy}" r="${holeRadius.toFixed(1)}" fill="#ffffff" />
  <text x="${cx}" y="${valueY.toFixed(1)}" fill="#2D3748" font-size="${sumFontVal.toFixed(1)}" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">${itemsSum}</text>
  <text x="${cx}" y="${labelY.toFixed(1)}" fill="#A2AABD" font-size="${(sumFontLabel * 0.95).toFixed(1)}" font-family="system-ui, sans-serif" font-weight="300" text-anchor="middle">млрд руб.</text>\n`;
      }
    }

    const svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="100%" height="100%">
  <!-- Created by параdiz Studio on ${today} -->
  <defs>
    <style type="text/css">
      @font-face {
        font-family: 'ALS Granate';
        src: local('ALS Granate'), local('ALSGranate'), local('ALS-Granate');
      }
      text {
        font-family: 'ALS Granate', 'Montserrat', system-ui, -apple-system, sans-serif !important;
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="none" />
  
  <!-- Outer framework axes lines -->
  ${(chartType !== 'pie' && chartType !== 'donut') ? `
  <line x1="${pLeft}" y1="${pTop + graphH}" x2="${canvasW - pRight}" y2="${pTop + graphH}" stroke="#CBD5E1" stroke-width="1.5" />
  <line x1="${pLeft}" y1="${pTop}" x2="${pLeft}" y2="${pTop + graphH}" stroke="#CBD5E1" stroke-width="1.5" />` : ''}

${gridCode}

${legendCode}

${segments}
</svg>`;

    setSvgCode(svgOut);
  }, [chartType, orientation, groupMode, categories, seriesList, values, chartTitle, showGrid, showValues, activePieSeries, canvasW, canvasH, elementSize, valueFontSize]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      showToast('SVG скопирован в буфер обмена!');
    } catch {
      showToast('Ошибка при копировании!');
    }
  };

  const downloadFile = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paradiz-${chartType}-chart.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('SVG файл сохранен на компьютер!');
  };

  return (
    <div id="paradiz-charts-sandbox" className="grid grid-cols-1 lg:grid-cols-[200px_1fr_400px] gap-[15px] items-stretch w-full h-full min-h-0">
      
      {/* 1. LEFT COLUMN: Visual Pictograms selection panel (Perfect minimal list) */}
      <div className="bg-white rounded-[20px] p-4 flex flex-col h-full min-h-0 border border-gray-100 shadow-xs">
        <span className="text-[11px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-4 shrink-0">
          Формат графика
        </span>

        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5 scrollbar-hide select-none">
          {/* Vertical/Horizontal toggle buttons when columns is chosen */}
          {chartType === 'bar' && (
            <div className="pb-3 border-b border-gray-100 flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Ориентация</span>
              <div className="grid grid-cols-2 gap-1 bg-gray-50 p-1 rounded-lg">
                <button
                  onClick={() => setOrientation('vertical')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    orientation === 'vertical' ? 'bg-white shadow-3xs text-[#30ABE9]' : 'text-gray-500'
                  }`}
                >
                  Вертик.
                </button>
                <button
                  onClick={() => setOrientation('horizontal')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    orientation === 'horizontal' ? 'bg-white shadow-3xs text-[#30ABE9]' : 'text-gray-500'
                  }`}
                >
                  Гориз.
                </button>
              </div>
            </div>
          )}

          {/* Group mode option (Clusters / Stacks) */}
          {chartType === 'bar' && (
            <div className="pb-3 border-b border-gray-100 flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Режим набора</span>
              <div className="grid grid-cols-2 gap-1 bg-gray-50 p-1 rounded-lg">
                <button
                  onClick={() => setGroupMode('normal')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    groupMode === 'normal' ? 'bg-white shadow-3xs text-[#30ABE9]' : 'text-gray-500'
                  }`}
                >
                  Группы
                </button>
                <button
                  onClick={() => setGroupMode('stacked')}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    groupMode === 'stacked' ? 'bg-white shadow-3xs text-[#30ABE9]' : 'text-gray-500'
                  }`}
                >
                  Стеки
                </button>
              </div>
            </div>
          )}

          {/* Type 1. Bar */}
          <button
            onClick={() => setChartType('bar')}
            className={`w-full p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
              chartType === 'bar'
                ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-[#565C68]'
            }`}
          >
            <svg viewBox="0 0 40 24" className="w-10 h-6 shrink-0" shapeRendering="geometricPrecision">
              <rect x="2" y="14" width="6" height="8" rx="1" fill={chartType === 'bar' ? '#30ABE9' : '#CBD4EB'} />
              <rect x="10" y="8" width="6" height="14" rx="1" fill={chartType === 'bar' ? '#30ABE9' : '#9EB5E0'} />
              <rect x="18" y="4" width="6" height="18" rx="1" fill={chartType === 'bar' ? '#30ABE9' : '#A2AABD'} />
              <rect x="26" y="10" width="6" height="12" rx="1" fill={chartType === 'bar' ? '#30ABE9' : '#CBD4EB'} />
              <rect x="34" y="16" width="6" height="6" rx="1" fill={chartType === 'bar' ? '#30ABE9' : '#9EB5E0'} />
            </svg>
            <span className="text-[11px] font-extrabold font-sans">Столбцы</span>
          </button>

          {/* Type 2. Line */}
          <button
            onClick={() => setChartType('line')}
            className={`w-full p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
              chartType === 'line'
                ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-[#565C68]'
            }`}
          >
            <svg viewBox="0 0 40 24" className="w-10 h-6 shrink-0 fill-none stroke-current" strokeWidth="2.5" shapeRendering="geometricPrecision">
              <path d="M4 18 L14 8 L24 14 L36 4" stroke={chartType === 'line' ? '#30ABE9' : '#9EB5E0'} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="4" cy="18" r="1.5" fill="#ffffff" />
              <circle cx="14" cy="8" r="1.5" fill="#ffffff" />
              <circle cx="24" cy="14" r="1.5" fill="#ffffff" />
              <circle cx="36" cy="4" r="1.5" fill="#ffffff" />
            </svg>
            <span className="text-[11px] font-extrabold font-sans">Линии</span>
          </button>

          {/* Type 3. Area */}
          <button
            onClick={() => setChartType('area')}
            className={`w-full p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
              chartType === 'area'
                ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-[#565C68]'
            }`}
          >
            <svg viewBox="0 0 40 24" className="w-10 h-6 shrink-0" shapeRendering="geometricPrecision">
              <path d="M 4 20 L 14 10 L 24 16 L 36 6 L 36 20 Z" fill={chartType === 'area' ? '#30ABE9' : '#CBD4EB'} opacity="0.65" />
              <path d="M 4 20 L 14 10 L 24 16 L 36 6" fill="none" stroke={chartType === 'area' ? '#30ABE9' : '#9EB5E0'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-extrabold font-sans">С областями</span>
          </button>

          {/* Type 4. Pie */}
          <button
            onClick={() => setChartType('pie')}
            className={`w-full p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
              chartType === 'pie'
                ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-[#565C68]'
            }`}
          >
            <svg viewBox="0 0 40 24" className="w-10 h-6 shrink-0" shapeRendering="geometricPrecision">
              <circle cx="20" cy="12" r="10" fill={chartType === 'pie' ? '#30ABE9' : '#CBD4EB'} />
              <path d="M 20 12 L 20 2 A 10 10 0 0 1 30 12 Z" fill={chartType === 'pie' ? '#FF9F43' : '#9EB5E0'} />
            </svg>
            <span className="text-[11px] font-extrabold font-sans">Круговая</span>
          </button>

          {/* Type 5. Donut */}
          <button
            onClick={() => setChartType('donut')}
            className={`w-full p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
              chartType === 'donut'
                ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]'
                : 'bg-white hover:bg-gray-50 border-gray-100 text-[#565C68]'
            }`}
          >
            <svg viewBox="0 0 40 24" className="w-10 h-6 shrink-0" shapeRendering="geometricPrecision">
              <circle cx="20" cy="12" r="10" fill={chartType === 'donut' ? '#9B59B6' : '#9EB5E0'} />
              <circle cx="20" cy="12" r="5" fill="#ffffff" />
            </svg>
            <span className="text-[11px] font-extrabold font-sans">Пончик</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER COLUMN: Giant live generated visual Sandbox */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 border border-gray-100 shadow-xs relative">
        {/* Top parameters block */}
        <div className="flex items-center justify-between flex-shrink-0 mb-4 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#A2AABD] uppercase tracking-widest font-sans">
              векторный макет
            </span>
          </div>
          <button 
            onClick={randomizeValues}
            className="py-1 px-3 bg-gray-50 hover:bg-gray-100 text-[#565C68] hover:text-black text-xs font-bold rounded-lg transition duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Сгенерировать значения
          </button>
        </div>

        {/* Outer frame removed by request! Large beautiful blend without outlines */}
        <div className="flex-1 bg-white flex items-center justify-center min-h-0 relative p-4 overflow-auto">
          <div 
            className="transition-all duration-300 flex items-center justify-center shrink-0"
            style={{ 
              width: `${canvasW}px`,
              height: `${canvasH}px`,
            }}
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />

          {toastMessage && (
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-1.5 z-10 animate-fade-in">
              <Check className="w-3.5 h-3.5 text-[#30ABE9]" />
              {toastMessage}
            </div>
          )}
        </div>

        {/* Export options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 flex-shrink-0 select-none">
          <button 
            onClick={copyToClipboard}
            className="h-[42px] bg-gray-50 hover:bg-gray-100 text-[#565C68] hover:text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Copy className="w-4 h-4 text-[#A2AABD]" />
            Копировать SVG-код
          </button>
          <button 
            onClick={downloadFile}
            className="h-[42px] bg-[#30ABE9] hover:bg-[#30ABE9]/90 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Скачать .svg
          </button>

        </div>
      </div>

      {/* 3. RIGHT COLUMN: Interactive config panels */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 border border-gray-100 shadow-xs select-none">
        <span className="text-[11px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 shrink-0">
          настройки и данные показателей
        </span>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          
          {/* General customization options card */}
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#565C68]">
              <Settings className="w-4 h-4 text-[#30ABE9]" />
              <span>Общие опции</span>
            </div>

            {/* Active series dropdown if pie/donut mode is active */}
            {(chartType === 'pie' || chartType === 'donut') && (
              <div>
                <label className="text-[10px] font-bold text-[#A2AABD] block mb-1">Показывать группу</label>
                <select 
                  value={activePieSeries}
                  onChange={(e) => setActivePieSeries(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-[#30ABE9] bg-white font-bold text-black"
                >
                  {seriesList.map(ser => (
                    <option key={ser.id} value={ser.id}>{ser.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-[#565C68]">Сетка осей координат</span>
              <button 
                onClick={() => setShowGrid(!showGrid)}
                className={`w-9 h-5 rounded-full p-0.5 transition duration-200 cursor-pointer ${
                  showGrid ? 'bg-[#30ABE9]' : 'bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                  showGrid ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#565C68]">Показывать цифры</span>
              <button 
                onClick={() => setShowValues(!showValues)}
                className={`w-9 h-5 rounded-full p-0.5 transition duration-200 cursor-pointer ${
                  showValues ? 'bg-[#30ABE9]' : 'bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                  showValues ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-2.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Ширина: {canvasW}px</span>
                  <button 
                    onClick={() => setCanvasW(600)} 
                    className="text-[9px] font-semibold text-[#30ABE9] hover:underline cursor-pointer"
                  >
                    Сброс
                  </button>
                </div>
                <input 
                  type="range"
                  min="400"
                  max="1000"
                  step="20"
                  value={canvasW}
                  onChange={(e) => setCanvasW(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Высота: {canvasH}px</span>
                  <button 
                    onClick={() => setCanvasH(420)} 
                    className="text-[9px] font-semibold text-[#30ABE9] hover:underline cursor-pointer"
                  >
                    Сброс
                  </button>
                </div>
                <input 
                  type="range"
                  min="300"
                  max="800"
                  step="20"
                  value={canvasH}
                  onChange={(e) => setCanvasH(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
                />
              </div>

              {/* Sizing of chart indicators range */}
              <div className="pt-2 border-t border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Толщина: {elementSize * 2}%</span>
                  <button 
                    onClick={() => setElementSize(50)} 
                    className="text-[9px] font-semibold text-[#30ABE9] hover:underline cursor-pointer"
                  >
                    Сброс
                  </button>
                </div>
                <input 
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={elementSize}
                  onChange={(e) => setElementSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
                />
                <span className="text-[9px] text-[#A2AABD] mt-1">Регулирует толщину линий, ширину столбцов и радиус круговых диаграмм</span>
              </div>

              {/* Sizing of value labels font size */}
              <div className="pt-2 border-t border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-[#A2AABD] uppercase">Размер цифр значений: {valueFontSize}px</span>
                  <button 
                    onClick={() => setValueFontSize(10)} 
                    className="text-[9px] font-semibold text-[#30ABE9] hover:underline cursor-pointer"
                  >
                    Сброс
                  </button>
                </div>
                <input 
                  type="range"
                  min="6"
                  max="40"
                  step="1"
                  value={valueFontSize}
                  onChange={(e) => setValueFontSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#30ABE9]"
                />
                <span className="text-[9px] text-[#A2AABD] mt-1">Регулирует размер шрифта для числовых значений на графике</span>
              </div>
            </div>
          </div>

          {/* Harmonious Palette selector widget */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-2 relative">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#565C68]">
              <Sparkles className="w-3.5 h-3.5 text-[#30ABE9]" />
              <span>Гармоничные палитры (5 библиотек)</span>
            </div>
            
            <div className="relative">
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsPaletteDropdownOpen(!isPaletteDropdownOpen)}
                className="w-full text-left p-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition duration-200 flex items-center justify-between cursor-pointer focus:outline-none"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold text-[#565C68]">
                    {palettes.find(p => p.id === selectedPaletteId)?.name}
                  </span>
                  <div className="flex gap-1 overflow-hidden select-none">
                    {(palettes.find(p => p.id === selectedPaletteId)?.colors.slice(0, 6) || []).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#A2AABD] transition-transform duration-200 ${isPaletteDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options List */}
              {isPaletteDropdownOpen && (
                <>
                  {/* Overlay to close the dropdown when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsPaletteDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-150 rounded-xl shadow-lg flex flex-col max-h-[220px] overflow-y-auto divide-y divide-gray-50 p-1">
                    {palettes.map(pal => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaletteId(pal.id);
                          setIsPaletteDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 hover:bg-gray-50 transition duration-150 rounded-lg cursor-pointer flex flex-col gap-1 focus:outline-none ${
                          selectedPaletteId === pal.id ? 'bg-[#30ABE9]/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[10.5px] ${selectedPaletteId === pal.id ? 'font-black text-[#30ABE9]' : 'font-bold text-[#565C68]'}`}>
                            {pal.name}
                          </span>
                          {selectedPaletteId === pal.id && (
                            <span className="text-[8px] bg-[#30ABE9]/15 text-[#30ABE9] px-1.5 py-0.5 rounded-full font-black">АКТИВНА</span>
                          )}
                        </div>
                        <div className="flex gap-1 overflow-hidden pointer-events-none select-none">
                          {pal.colors.slice(0, 6).map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section: Groups / Series (The Columns grouping variables) */}
          <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#565C68] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#30ABE9]" />
                Группы показателей ({seriesList.length})
              </span>
              <button 
                onClick={addSeries}
                className="py-1 px-2 bg-[#30ABE9] hover:bg-[#30ABE9]/90 text-white rounded-lg text-[10px] font-extrabold transition flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3" fill="currentColor" />
                Добавить
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {seriesList.map((ser, index) => (
                <div key={ser.id} className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-100 shadow-3xs">
                  <div className="relative">
                    <button 
                      className="w-5.5 h-5.5 rounded-lg border border-gray-200 shadow-3xs cursor-pointer block"
                      style={{ backgroundColor: ser.color }}
                      onClick={() => document.getElementById(`sc-${ser.id}`)?.click()}
                    />
                    <input 
                      id={`sc-${ser.id}`}
                      type="color"
                      value={ser.color}
                      onChange={(e) => updateSeriesParam(ser.id, 'color', e.target.value)}
                      className="hidden"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={ser.name}
                    onChange={(e) => updateSeriesParam(ser.id, 'name', e.target.value)}
                    className="flex-1 min-w-0 text-[11px] font-bold px-2 py-1 rounded-md border border-gray-100 focus:outline-[#30ABE9]"
                  />
                  <button 
                    onClick={() => removeSeries(ser.id)}
                    disabled={seriesList.length <= 1}
                    className="p-1 text-gray-400 hover:text-red-500 rounded disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Categories columns configuration with core numerical cells */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#565C68] flex items-center gap-1">
                <Grid className="w-3.5 h-3.5 text-[#30ABE9]" />
                Столбцы / Временные отрезки ({categories.length})
              </span>
              <button 
                onClick={addCategory}
                className="py-1 px-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg text-[10px] font-extrabold transition flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3" />
                Создать
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {categories.map((cat, cIdx) => (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-2.5 hover:border-gray-200 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-gray-150 text-gray-500 w-4 h-4 rounded-full flex items-center justify-center">
                      {cIdx + 1}
                    </span>
                    <input 
                      type="text" 
                      value={cat.label}
                      onChange={(e) => updateCategoryLabel(cat.id, e.target.value)}
                      className="flex-1 min-w-0 font-bold text-xs bg-transparent border-b border-dashed border-gray-200 py-0.5 focus:border-[#30ABE9] focus:outline-none"
                    />
                    <button 
                      onClick={() => removeCategory(cat.id)}
                      disabled={categories.length <= 1}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cell grid variables values list */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                    {seriesList.map((ser) => {
                      const val = values[cat.id]?.[ser.id] ?? 50;
                      return (
                        <div key={ser.id} className="flex items-center gap-1.5 bg-gray-50/50 p-1 rounded-lg border border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ser.color }} />
                          <span className="text-[9px] font-semibold text-gray-500 truncate flex-1">{ser.name}</span>
                          <input 
                            type="number"
                            value={val}
                            min={0}
                            max={999}
                            onChange={(e) => updateValueCell(cat.id, ser.id, Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-11 text-center font-black text-xs text-[#30ABE9] bg-white border border-gray-200 rounded focus:border-[#30ABE9] focus:outline-none py-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
