'use client';

import { memo, useMemo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { TrendingUp, TrendingDown, Users, DollarSign, Loader2 } from 'lucide-react';
import {
  calculateMRR,
  calculateARPU,
  calculateLTVtoCAC,
  getCustomersByPlan,
  generateTrendData,
  generateForecast,
  PlanBreakdown,
} from '@/lib/metrics/calculations';
import { TrendChart } from './TrendChart';
import { DemoModeToggle } from './DemoModeToggle';
import { useCanvasEntities } from '@/hooks/useCanvasEntities';

interface RevenueSectionData {
  canvasId: string;
  showDemo?: boolean;
  width?: number;
  height?: number;
}

/**
 * RevenueSection Component
 * 
 * Displays revenue metrics and customer counts in a horizontal 5x2 layout.
 * Shows MRR, customer count, growth indicator, ARPU, LTV:CAC, trend chart, and plan breakdown.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
const RevenueSectionComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as RevenueSectionData;
  const { canvasId, showDemo: initialShowDemo = true, width = 500, height = 200 } = nodeData;
  
  // Local state for demo mode toggle
  const [showDemo, setShowDemo] = useState(initialShowDemo);
  
  // Use shared hook with cleanup - only fetch when not in demo mode
  const { entities, loading: isLoading } = useCanvasEntities(canvasId, !showDemo);
  
  // Calculate metrics from entities
  const metrics = useMemo(() => {
    // If in demo mode OR loading with no entities, use demo data (prevent empty flash)
    if (showDemo || (isLoading && entities.length === 0)) {
      return {
        mrr: 4800,
        customerCount: 24,
        arpu: 200,
        ltvToCAC: 3.2,
        planBreakdown: [
          { plan: 'Starter', count: 12, revenue: 14400, mrr: 1200, percentage: 33.3 },
          { plan: 'Pro', count: 9, revenue: 21600, mrr: 1800, percentage: 50.0 },
          { plan: 'Enterprise', count: 3, revenue: 7200, mrr: 600, percentage: 16.7 },
        ] as PlanBreakdown[],
      };
    }
    
    // Calculate from real entities
    const mrr = calculateMRR(entities);
    const customerCount = entities.filter(e => e.entity_type === 'customer').length;
    const arpu = calculateARPU(entities);
    const ltvToCAC = calculateLTVtoCAC(entities);
    const planBreakdown = getCustomersByPlan(entities);
    
    return {
      mrr,
      customerCount,
      arpu,
      ltvToCAC,
      planBreakdown,
    };
  }, [entities, showDemo, isLoading]);
  
  // Generate trend data (6 months historical + 3 months forecast)
  const { historicalData, forecastData } = useMemo(() => {
    // Calculate base value (6 months ago) assuming 10% monthly growth
    const baseValue = metrics.mrr / Math.pow(1.10, 5);
    const historical = generateTrendData(baseValue, 6, 0.10);
    const forecast = generateForecast(historical, 3);
    
    return {
      historicalData: historical,
      forecastData: forecast,
    };
  }, [metrics.mrr]);
  
  // Calculate month-over-month growth
  const momGrowth = useMemo(() => {
    if (historicalData.length < 2) return 0;
    const previous = historicalData[historicalData.length - 2].value;
    const current = historicalData[historicalData.length - 1].value;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [historicalData]);
  
  return (
    <div
      className="
        relative w-full h-full
        bg-slate-900/90 backdrop-blur-sm
        border-2 border-emerald-700/50
        rounded-lg
        shadow-[0_0_20px_rgba(16,185,129,0.3),0_0_40px_rgba(5,150,105,0.2)]
        overflow-hidden
      "
      style={{ width, height }}
    >
      {/* Demo Mode Toggle and Indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <DemoModeToggle showDemo={showDemo} onToggle={setShowDemo} />
        {showDemo && (
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
            Demo Data
          </span>
        )}
      </div>
      
      {/* Loading Overlay */}
      {!showDemo && isLoading && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}
      
      {/* Main Content - Horizontal Layout */}
      <div className="flex items-stretch h-full p-4 gap-4">
        
        {/* Left Panel: Primary Metrics */}
        <div className="flex-1 flex flex-col justify-center items-start gap-2 border-r border-slate-700/50 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Recurring Revenue
            </h3>
          </div>
          
          {/* MRR - Large Display */}
          <div className="text-3xl font-bold text-emerald-400">
            ${metrics.mrr.toLocaleString()}
          </div>
          
          {/* Growth Indicator */}
          <div className="flex items-center gap-1.5">
            {momGrowth > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : momGrowth < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            ) : null}
            <span className={`text-xs font-medium ${
              momGrowth > 0 ? 'text-emerald-400' : momGrowth < 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}% MoM
            </span>
          </div>
          
          {/* Customer Count */}
          <div className="flex items-center gap-2 mt-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-300">
              {metrics.customerCount} {metrics.customerCount === 1 ? 'customer' : 'customers'}
            </span>
          </div>
          
          {/* Additional Metrics */}
          <div className="w-full mt-2 pt-2 border-t border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">ARPU</span>
              <span className="text-xs font-medium text-slate-300">
                ${metrics.arpu.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">LTV:CAC</span>
              <span className="text-xs font-medium text-slate-300">
                {metrics.ltvToCAC.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
        
        {/* Center Panel: Mini Trend Chart with Forecast */}
        <div className="flex-1 flex flex-col justify-center items-center border-r border-slate-700/50 pr-4">
          <div className="w-full h-full flex items-center justify-center">
            <TrendChart 
              data={historicalData}
              forecastData={forecastData}
              color="emerald"
              style="area"
            />
          </div>
        </div>
        
        {/* Right Panel: Plan Breakdown */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Plan Breakdown
          </h4>
          
          {metrics.planBreakdown.length === 0 ? (
            <div className="text-xs text-slate-600 italic">
              No customers yet
            </div>
          ) : (
            metrics.planBreakdown.map((plan) => (
              <div key={plan.plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">{plan.plan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {plan.count} {plan.count === 1 ? 'user' : 'users'}
                  </span>
                  <span className="text-xs font-medium text-slate-200">
                    ${plan.mrr.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 w-10 text-right">
                    {plan.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
});

RevenueSectionComponent.displayName = 'RevenueSection';

export { RevenueSectionComponent as RevenueSection };
