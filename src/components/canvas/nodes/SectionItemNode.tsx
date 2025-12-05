'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { StitchEntity } from '@/types/entity';

interface SectionItemNodeData {
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'running' | 'error';
  itemType: 'worker' | 'asset' | 'integration' | 'product';
  linked_workflow_id?: string;
  linked_canvas_id?: string;
  onShowDetail?: (itemId: string) => void;
  isActivated?: boolean;
  entityCount?: number;
  entities?: StitchEntity[];
  onEntitySelect?: (entityId: string | undefined) => void;
}

const SectionItemNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as SectionItemNodeData;
  const { drillInto } = useCanvasNavigation();
  const [isHovered, setIsHovered] = useState(false);

  const IconComponent = (LucideIcons as unknown)[nodeData.icon] || LucideIcons.Package;
  const hasLinkedContent = !!(nodeData.linked_workflow_id || nodeData.linked_canvas_id);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.linked_workflow_id) {
      drillInto(nodeData.linked_workflow_id, nodeData.label, 'workflow');
      return;
    }
    if (nodeData.linked_canvas_id) {
      drillInto(nodeData.linked_canvas_id, nodeData.label, 'workflow');
      return;
    }
    if (nodeData.onShowDetail) {
      nodeData.onShowDetail(id);
    }
  };

  const entityCount = nodeData.entityCount || 0;

  return (
    <div className="relative">
      {/* Connection Handles - minimal */}
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

      {/* Simple badge-style node */}
      <Badge
        variant="outline"
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          cursor-pointer px-3 py-2 h-auto
          bg-slate-900/90 border-slate-700
          hover:bg-slate-800 hover:border-slate-600
          transition-all duration-150
          ${selected ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}
          ${nodeData.isActivated ? 'ring-2 ring-green-500 border-green-500 bg-green-950/50' : ''}
        `}
      >
        {/* Icon */}
        <IconComponent className="w-4 h-4 text-slate-400 flex-shrink-0" />
        
        {/* Label */}
        <span className="text-sm text-slate-200 font-medium">
          {nodeData.label}
        </span>

        {/* Entity count bubble */}
        {entityCount > 0 && (
          <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center">
            {entityCount}
          </span>
        )}

        {/* Drill-down indicator */}
        {hasLinkedContent && isHovered && (
          <LucideIcons.ChevronRight className="w-3 h-3 text-slate-500 ml-1" />
        )}
      </Badge>
    </div>
  );
});

SectionItemNodeComponent.displayName = 'SectionItemNode';

export { SectionItemNodeComponent as SectionItemNode };
