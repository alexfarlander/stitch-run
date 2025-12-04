'use client';

import { memo, useMemo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  DEFAULT_COST_CONFIG,
  shouldShowCostWarning,
  getCostBreakdown,
  getThresholdUsagePercentage,
} from '@/lib/metrics/cost-config';
import { generateTrendData } from '@/lib/metrics/calculations';
import { TrendChart } from './TrendChart';
import { DemoModeToggle } from './DemoModeToggle';

interface CostsSectionData {
  canvasId: string;
  showDemo?: boolean;
  width?: number;
  height?: number;
}

/**
 * CostsSection Component
 * 
 * Displays expense breakdown and cost trends in a horizontal 5x2 layout.
 * Shows total monthly costs, warning indicators, trend chart, and category breakdown.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
const CostsSectionComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as CostsSectionData;
  const { showDemo: initialShowDemo = true, width = 500, height = 200 } = nodeData;
  
  // Local state for demo mode toggle
  const [showDemo, setShowDemo] = useState(initialShowDemo);
  
  // For now, always use demo data (real data integration will come later)
  const costConfig = DEFAULT_COST_CONFIG;
  
  // Calculate metrics
  const totalCosts = useMemo(() => {
    return costConfig.api_costs + costConfig.infrastructure_costs + costConfig.team_costs;
  }, [costConfig]);
  
  const showWarning = useMemo(() => {
    return shouldShowCostWarning(costConfig);
  }, [costConfig]);
  
  const breakdown = useMemo(() => {
    return getCostBreakdown(costConfig);
  }, [costConfig]);
  
  const thresholdUsage = useMemo(() => {
    return getThresholdUsagePercentage(costConfig);
  }, [costConfig]);
  
  // Generate trend data (6 months of historical data with 5% growth)
  const trendData = useMemo(() => {
    // Calculate base value (6 months ago)
    const baseValue = totalCosts / Math.pow(1.05, 5);
    return generateTrendData(baseValue, 6, 0.05);
  }, [totalCosts]);
  
  // Calculate month-over-month change (comparing last two data points)
  const momChange = useMemo(() => {
    if (trendData.length < 2) return 0;
    const previous = trendData[trendData.length - 2].value;
    const current = trendData[trendData.length - 1].value;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [trendData]);
  
  return (
    <div
      className="
        relative w-full h-full
        bg-slate-900/90 backdrop-blur-sm
        border-2 border-amber-700/50
        rounded-lg
        shadow-[0_0_20px_rgba(245,158,11,0.3),0_0_40px_rgba(234,179,8,0.2)]
        overflow-hidden
      "
      style={{ width, height }}
    >
      {/* Demo Mode Toggle and Indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <DemoModeToggle showDemo={showDemo} onToggle={setShowDemo} />
        {showDemo && (
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
            Demo Data
          </span>
        )}
      </div>
      
      {/* Main Content - Horizontal Layout */}
      <div className="flex items-stretch h-full p-4 gap-4">
        
        {/* Left Panel: Total Costs with Warning and MoM Change */}
        <div className="flex-1 flex flex-col justify-center items-start gap-2 border-r border-slate-700/50 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Costs
            </h3>
            {showWarning && (
              <div title="Approaching threshold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
            )}
          </div>
          
          <div className="text-3xl font-bold text-amber-400">
            ${totalCosts.toLocaleString()}
          </div>
          
          {/* Month-over-Month Change */}
          <div className="flex items-center gap-1.5">
            {momChange > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            ) : momChange < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-green-400" />
            ) : null}
            <span className={`text-xs font-medium ${
              momChange > 0 ? 'text-red-400' : momChange < 0 ? 'text-green-400' : 'text-slate-400'
            }`}>
              {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}% MoM
            </span>
          </div>
          
          {/* Threshold Usage Bar */}
          {costConfig.threshold > 0 && (
            <div className="w-full mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Budget</span>
                <span className="text-xs text-slate-400">
                  ${costConfig.threshold.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    thresholdUsage >= 90 
                      ? 'bg-gradient-to-r from-red-500 to-red-600' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600'
                  }`}
                  style={{ width: `${Math.min(100, thresholdUsage)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Center Panel: Mini Trend Chart */}
        <div className="flex-1 flex flex-col justify-center items-center border-r border-slate-700/50 pr-4">
          <div className="w-full h-full flex items-center justify-center">
            <TrendChart data={trendData} color="amber" style="area" />
          </div>
        </div>
        
        {/* Right Panel: Category Breakdown */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Breakdown
          </h4>
          
          {breakdown.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-300">{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-200">
                  ${item.amount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 w-10 text-right">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
});

CostsSectionComponent.displayName = 'CostsSection';

export { CostsSectionComponent as CostsSection };
