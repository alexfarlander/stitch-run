'use client';

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import {
  Megaphone,
  ShoppingCart,
  Database,
  DollarSign,
  Users,
  Package,
  Handshake,
  Target,
  Code as CodeIcon,
  Lightbulb,
  Wallet,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

interface SectionNodeData {
  label: string;
  category: 'Production' | 'Customer' | 'Financial';
  child_canvas_id?: string;
}

const iconMap: Record<string, any> = {
  Marketing: Megaphone,
  Sales: ShoppingCart,
  Data: Database,
  Revenue: DollarSign,
  Costs: Wallet,
  People: Users,
  Integrations: Handshake,
  Code: CodeIcon,
  Offers: Target,
  Products: Package,
  Support: Lightbulb,
  Recommendations: TrendingUp,
  'Paying Customers': Users,
};

// Simple category colors - no gradients
const categoryColors = {
  Production: 'border-indigo-500/30 text-indigo-400',
  Customer: 'border-cyan-500/30 text-cyan-400',
  Financial: 'border-amber-500/30 text-amber-400',
};

export const SectionNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as SectionNodeData;
  const Icon = iconMap[nodeData.label] || Package;
  const colors = categoryColors[nodeData.category];
  const { drillInto } = useCanvasNavigation();

  const hasChildCanvas = !!nodeData.child_canvas_id;

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.child_canvas_id) {
      drillInto(nodeData.child_canvas_id, nodeData.label, 'workflow');
    }
  };

  return (
    <div
      className={`
        relative w-full h-full
        bg-slate-900/50
        border ${colors.split(' ')[0]}
        rounded-lg
        ${hasChildCanvas ? 'cursor-pointer group' : ''}
      `}
      onDoubleClick={hasChildCanvas ? handleDrillDown : undefined}
      style={{ zIndex: -1 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/50"
        onDoubleClick={hasChildCanvas ? handleDrillDown : undefined}
      >
        <Icon className={`w-4 h-4 ${colors.split(' ')[1]}`} />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">
          {nodeData.label}
        </span>
        {hasChildCanvas && (
          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
        )}
      </div>
    </div>
  );
});

SectionNode.displayName = 'SectionNode';
