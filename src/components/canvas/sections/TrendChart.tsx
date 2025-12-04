'use client';

import { memo } from 'react';

/**
 * TrendChart Component
 * 
 * A reusable mini chart component for displaying trend data.
 * Supports line and area chart styles with minimal design.
 * 
 * Requirements: 1.4, 2.4
 */

export interface TrendDataPoint {
  period: string;  // "Jan", "Feb", or ISO date
  value: number;
}

export interface TrendChartProps {
  /** Historical data points to display */
  data: TrendDataPoint[];
  
  /** Optional forecast data points (displayed with dashed line) */
  forecastData?: TrendDataPoint[];
  
  /** Color theme for the chart */
  color?: 'amber' | 'emerald';
  
  /** Chart style */
  style?: 'line' | 'area';
  
  /** Chart width in pixels */
  width?: number;
  
  /** Chart height in pixels */
  height?: number;
  
  /** Whether to show data point dots */
  showDots?: boolean;
  
  /** Whether to show period labels */
  showLabels?: boolean;
}

/**
 * TrendChart - Reusable mini chart component
 * 
 * Displays financial trends with smooth curves and gradient colors.
 * Minimal design with no axes labels for compact display.
 * 
 * @example
 * ```tsx
 * <TrendChart 
 *   data={historicalData}
 *   forecastData={forecastData}
 *   color="emerald"
 *   style="area"
 * />
 * ```
 */
export const TrendChart = memo(({
  data,
  forecastData = [],
  color = 'emerald',
  style = 'line',
  width = 120,
  height = 50,
  showDots = true,
  showLabels = true,
}: TrendChartProps) => {
  // Handle empty data
  if (data.length === 0) {
    return (
      <div className="text-xs text-slate-600 italic">
        No trend data
      </div>
    );
  }
  
  const allData = [...data, ...forecastData];
  const padding = 4;
  
  // Find min and max values for scaling
  const values = allData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1; // Avoid division by zero
  
  // Scale a value to SVG coordinates
  const scaleY = (value: number): number => {
    return height - padding - ((value - minValue) / valueRange) * (height - 2 * padding);
  };
  
  const scaleX = (index: number): number => {
    return padding + (index / (allData.length - 1)) * (width - 2 * padding);
  };
  
  // Generate points for historical data
  const historicalPoints = data.map((point, index) => ({
    x: scaleX(index),
    y: scaleY(point.value),
  }));
  
  // Generate points for forecast data
  const forecastPoints = forecastData.map((point, index) => {
    const dataIndex = data.length + index;
    return {
      x: scaleX(dataIndex),
      y: scaleY(point.value),
    };
  });
  
  // Generate SVG path strings
  const historicalPath = historicalPoints.length > 0
    ? `M ${historicalPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';
  
  const forecastPath = forecastPoints.length > 0 && historicalPoints.length > 0
    ? `M ${historicalPoints[historicalPoints.length - 1].x},${historicalPoints[historicalPoints.length - 1].y} L ${forecastPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';
  
  // Area path for gradient fill (only for historical data)
  const areaPath = style === 'area' && historicalPoints.length > 0
    ? `${historicalPath} L ${historicalPoints[historicalPoints.length - 1].x},${height - padding} L ${padding},${height - padding} Z`
    : '';
  
  // Color configuration
  const colors = {
    amber: {
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.1)',
      forecast: 'rgba(245, 158, 11, 0.5)',
    },
    emerald: {
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.1)',
      forecast: 'rgba(16, 185, 129, 0.5)',
    },
  };
  
  const colorScheme = colors[color];
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Area fill for historical data */}
        {areaPath && (
          <path
            d={areaPath}
            fill={colorScheme.fill}
            opacity={0.3}
          />
        )}
        
        {/* Historical line */}
        {historicalPath && (
          <path
            d={historicalPath}
            fill="none"
            stroke={colorScheme.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Forecast line (dashed) */}
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke={colorScheme.forecast}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2"
          />
        )}
        
        {/* Historical data points */}
        {showDots && historicalPoints.map((point, index) => (
          <circle
            key={`hist-${index}`}
            cx={point.x}
            cy={point.y}
            r={2}
            fill={colorScheme.stroke}
          />
        ))}
        
        {/* Forecast data points */}
        {showDots && forecastPoints.map((point, index) => (
          <circle
            key={`forecast-${index}`}
            cx={point.x}
            cy={point.y}
            r={1.5}
            fill={colorScheme.forecast}
            opacity={0.7}
          />
        ))}
      </svg>
      
      {/* Period labels */}
      {showLabels && (
        <div className="flex justify-between mt-1" style={{ width }}>
          <span className="text-xs text-slate-600">{data[0]?.period}</span>
          {forecastData.length > 0 ? (
            <span className="text-xs text-slate-600 opacity-60">
              {forecastData[forecastData.length - 1]?.period}
            </span>
          ) : (
            <span className="text-xs text-slate-600">
              {data[data.length - 1]?.period}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

TrendChart.displayName = 'TrendChart';
