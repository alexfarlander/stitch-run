'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

interface SectionItemNodeData {
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'worker' | 'asset' | 'integration' | 'product';
  linked_workflow_id?: string;
  linked_canvas_id?: string;
  onShowDetail?: (itemId: string) => void;
}

const statusStyles = {
  idle: 'bg-slate-500',
  active: 'bg-green-500',
  running: 'bg-amber-500 animate-pulse',
  error: 'bg-red-500',
};

const SectionItemNodeComponent = memo(({ id, data }: NodeProps) => {
  const nodeData = data as unknown as SectionItemNodeData;
  const { drillInto } = useCanvasNavigation();
  const [isHovered, setIsHovered] = useState(false);
  
  // Dynamically get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[nodeData.icon] || LucideIcons.Package;
  const ExternalLinkIcon = LucideIcons.ExternalLink;
  
  const hasLinkedContent = !!(nodeData.linked_workflow_id || nodeData.linked_canvas_id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Priority 1: Navigate to linked workflow
    if (nodeData.linked_workflow_id) {
      drillInto(nodeData.linked_workflow_id, nodeData.label, 'workflow');
      return;
    }

    // Priority 2: Navigate to linked detail canvas
    if (nodeData.linked_canvas_id) {
      drillInto(nodeData.linked_canvas_id, nodeData.label, 'workflow');
      return;
    }

    // Priority 3: Show detail panel (if callback provided)
    if (nodeData.onShowDetail) {
      nodeData.onShowDetail(id);
    }
  };
  
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-cyan-400 border-2 border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-cyan-400 border-2 border-slate-900"
      />
      
      {/* Item Card */}
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="
          flex items-center gap-2 px-3 py-2
          w-[120px] h-[60px]
          bg-slate-800/90 backdrop-blur-sm
          border border-slate-700
          rounded-md
          shadow-lg
          transition-all duration-200
          hover:shadow-cyan-500/20 hover:border-cyan-500/50
          cursor-pointer
          group
        "
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          <IconComponent className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
        </div>
        
        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">
            {nodeData.label}
          </p>
        </div>
        
        {/* Status Indicator */}
        <div className="absolute top-1 right-1">
          <div className={`w-2 h-2 rounded-full ${statusStyles[nodeData.status]}`} />
        </div>

        {/* Drill-down indicator */}
        {hasLinkedContent && (
          <div className="absolute bottom-1 right-1">
            <ExternalLinkIcon 
              className={`
                w-3 h-3 text-cyan-400
                transition-opacity duration-200
                ${isHovered ? 'opacity-100' : 'opacity-0'}
              `}
            />
          </div>
        )}
      </div>
    </div>
  );
});

SectionItemNodeComponent.displayName = 'SectionItemNode';

export { SectionItemNodeComponent as SectionItemNode };
