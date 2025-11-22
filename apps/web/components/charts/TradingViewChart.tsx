"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  marketId: string;
  outcomeIndex?: number;
  height?: number;
}

export default function TradingViewChart({ 
  marketId, 
  outcomeIndex = 0,
  height = 400 
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // TradingView Lightweight Charts integration
    // This is a placeholder for the actual TradingView implementation
    // Requires TradingView library: npm install lightweight-charts

    if (!containerRef.current) return;

    // Mock chart data
    const mockData = [
      { time: '2024-01-01', value: 0.45 },
      { time: '2024-01-02', value: 0.48 },
      { time: '2024-01-03', value: 0.52 },
      { time: '2024-01-04', value: 0.50 },
      { time: '2024-01-05', value: 0.55 },
      { time: '2024-01-06', value: 0.58 },
      { time: '2024-01-07', value: 0.56 },
    ];

    // Render mock chart
    const canvas = document.createElement('canvas');
    canvas.width = containerRef.current.clientWidth;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw simple line chart
      ctx.strokeStyle = '#14F195';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const maxValue = Math.max(...mockData.map(d => d.value));
      const minValue = Math.min(...mockData.map(d => d.value));
      const range = maxValue - minValue;
      
      mockData.forEach((point, i) => {
        const x = (i / (mockData.length - 1)) * canvas.width;
        const y = canvas.height - ((point.value - minValue) / range) * (canvas.height - 40) - 20;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw grid
      ctx.strokeStyle = '#2D2D2D';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = (i / 5) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Draw labels
      ctx.fillStyle = '#A0A0A0';
      ctx.font = '12px Inter';
      ctx.fillText(`${maxValue.toFixed(2)}`, 10, 20);
      ctx.fillText(`${minValue.toFixed(2)}`, 10, canvas.height - 10);
    }
    
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvas);

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [marketId, outcomeIndex, height]);

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-slate-900 rounded-lg p-4"
      style={{ height: `${height}px` }}
    >
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading chart...
      </div>
    </div>
  );
}

// Note: For production, replace this with actual TradingView Lightweight Charts:
// import { createChart } from 'lightweight-charts';
// 
// const chart = createChart(containerRef.current, {
//   width: containerRef.current.clientWidth,
//   height: height,
//   layout: {
//     background: { color: '#0F172A' },
//     textColor: '#A0A0A0',
//   },
//   grid: {
//     vertLines: { color: '#2D2D2D' },
//     horzLines: { color: '#2D2D2D' },
//   },
// });
//
// const lineSeries = chart.addLineSeries({
//   color: '#14F195',
//   lineWidth: 2,
// });
//
// lineSeries.setData(data);
