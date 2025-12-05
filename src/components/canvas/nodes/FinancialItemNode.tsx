'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StitchEntity } from '@/types/entity';

interface FinancialItemNodeData {
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'financial';
  value?: number;
  currency?: string;
  format?: 'currency' | 'count';
  isActivated?: boolean;
  entityCount?: number;
  entities?: StitchEntity[];
  onEntitySelect?: (entityId: string | undefined) => void;
}

function formatCurrency(value: number, currency: string = 'USD'): string {
  const dollars = value / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

const FinancialItemNodeComponent = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as FinancialItemNodeData;
  const IconComponent = (LucideIcons as unknown)[nodeData.icon] || LucideIcons.DollarSign;

  const displayValue = nodeData.value !== undefined
    ? formatCurrency(nodeData.value, nodeData.currency)
    : null;

  const entityCount = nodeData.entityCount || 0;

  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-slate-600 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-slate-600 !border-0"
      />

      {/* Simple badge with value */}
      <Badge
        variant="outline"
        className={`
          cursor-default px-3 py-2 h-auto
          bg-slate-900/90 border-emerald-700/50
          hover:bg-slate-800 hover:border-emerald-600/50
          transition-all duration-150
          ${selected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
          ${nodeData.isActivated ? 'ring-2 ring-green-500 border-green-500 bg-green-950/50' : ''}
        `}
      >
        {/* Icon */}
        <IconComponent className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        
        {/* Label */}
        <span className="text-sm text-slate-300 font-medium">
          {nodeData.label}
        </span>

        {/* Value */}
        {displayValue && (
          <span className="text-sm text-emerald-400 font-semibold ml-1">
            {displayValue}
          </span>
        )}

        {/* Entity count bubble */}
        {entityCount > 0 && (
          <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">
            {entityCount}
          </span>
        )}
      </Badge>
    </div>
  );
});

FinancialItemNodeComponent.displayName = 'FinancialItemNode';

export { FinancialItemNodeComponent as FinancialItemNode };
