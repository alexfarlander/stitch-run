'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';

interface FinancialItemNodeData {
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'financial';
  value?: number; // Value in cents
  currency?: string; // e.g., 'USD'
  format?: 'currency' | 'count';
}

const statusStyles = {
  idle: 'bg-slate-500',
  active: 'bg-green-500',
  running: 'bg-amber-500 animate-pulse',
  error: 'bg-red-500',
};

/**
 * Format currency value from cents to display format
 * @param value - Value in cents
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted string like "$12,450"
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  // Convert cents to dollars
  const dollars = value / 100;
  
  // Format with commas and no decimal places
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
  
  return formatted;
}

const FinancialItemNodeComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as FinancialItemNodeData;
  
  // Dynamically get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[nodeData.icon] || LucideIcons.DollarSign;
  
  // Format the value for display
  const displayValue = nodeData.value !== undefined 
    ? formatCurrency(nodeData.value, nodeData.currency)
    : null;
  
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-emerald-400 border-2 border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-emerald-400 border-2 border-slate-900"
      />
      
      {/* Financial Item Card */}
      <div
        className="
          flex flex-col gap-1 px-3 py-2
          w-[120px] h-[70px]
          bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm
          border border-emerald-700/50
          rounded-md
          shadow-lg shadow-emerald-500/10
          transition-all duration-200
          hover:shadow-emerald-500/30 hover:border-emerald-500/70
          group
        "
      >
        {/* Header: Icon and Label */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <IconComponent className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
          </div>
          <p className="text-xs font-medium text-slate-300 truncate flex-1">
            {nodeData.label}
          </p>
        </div>
        
        {/* Value Display */}
        {displayValue && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              {displayValue}
            </p>
          </div>
        )}
        
        {/* Status Indicator */}
        <div className="absolute top-1 right-1">
          <div className={`w-2 h-2 rounded-full ${statusStyles[nodeData.status]}`} />
        </div>
      </div>
    </div>
  );
});

FinancialItemNodeComponent.displayName = 'FinancialItemNode';

export { FinancialItemNodeComponent as FinancialItemNode };
