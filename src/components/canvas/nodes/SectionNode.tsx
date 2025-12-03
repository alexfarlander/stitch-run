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

// Glowing border colors based on category
const categoryGlow = {
  Production: 'shadow-[0_0_20px_rgba(99,102,241,0.3),0_0_40px_rgba(139,92,246,0.2)] border-[#6366f1]',
  Customer: 'shadow-[0_0_20px_rgba(6,182,212,0.3),0_0_40px_rgba(20,184,166,0.2)] border-[#06b6d4]',
  Financial: 'shadow-[0_0_20px_rgba(245,158,11,0.3),0_0_40px_rgba(234,179,8,0.2)] border-[#f59e0b]',
};

export const SectionNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as SectionNodeData;
  const Icon = iconMap[nodeData.label] || Package;
  const glowStyle = categoryGlow[nodeData.category];
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
        relative w-full h-full p-4
        bg-[#0d1117]/80 backdrop-blur-sm
        border-2 ${glowStyle}
        rounded-lg
        transition-all duration-300
        pointer-events-none
        ${hasChildCanvas ? 'group/section' : ''}
      `}
      style={{
        zIndex: -1,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px),
          repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px)
        `,
      }}
    >
      {/* Header */}
      <div 
        className={`
          flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50 pointer-events-auto
          ${hasChildCanvas ? 'cursor-pointer hover:border-cyan-500/50' : ''}
        `}
        onDoubleClick={hasChildCanvas ? handleDrillDown : undefined}
      >
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex-1">
          {nodeData.label}
        </h3>
        
        {/* Drill-down indicator */}
        {hasChildCanvas && (
          <button
            onClick={handleDrillDown}
            className="
              p-1 rounded
              bg-slate-800/50 hover:bg-cyan-500/20
              border border-slate-700 hover:border-cyan-500
              transition-all duration-200
              opacity-60 group-hover/section:opacity-100
            "
            title={`Open ${nodeData.label} workflow`}
          >
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover/section:text-cyan-400" />
          </button>
        )}
      </div>

      {/* Drop zone placeholder */}
      <div className="flex items-center justify-center h-[calc(100%-3rem)] text-slate-600 text-xs italic">
        Drop items here
      </div>
    </div>
  );
});

SectionNode.displayName = 'SectionNode';
