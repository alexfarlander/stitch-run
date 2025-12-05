'use client';

import { useState } from 'react';
import { StitchEntity } from '@/types/entity';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NodeEntityBadgeProps {
  count: number;
  nodeId: string;
  entities: StitchEntity[];
  /** Position of the node's top-right corner in screen coordinates */
  position: { x: number; y: number };
  onEntityClick?: (entityId: string) => void;
  onDragStart?: (entityId: string) => void;
  onDragEnd?: (entityId: string, targetNodeId: string | null) => void;
}

/**
 * NodeEntityBadge Component
 * 
 * A small badge that appears in the top-right corner of a node,
 * showing the count of entities currently at that node.
 * Clicking reveals a popover with the entity list.
 */
export function NodeEntityBadge({ 
  count, 
  nodeId,
  entities, 
  position,
  onEntityClick,
  onDragStart,
  onDragEnd 
}: NodeEntityBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);

  // Handle drag start for individual entity in list
  const handleEntityDragStart = (e: React.DragEvent, entityId: string, sourceNodeId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      entityId,
      sourceNodeId
    }));
    setDraggedEntityId(entityId);
    onDragStart?.(entityId);
  };

  const handleEntityDragEnd = (e: React.DragEvent, entityId: string) => {
    e.stopPropagation();
    setDraggedEntityId(null);
    onDragEnd?.(entityId, null);
  };

  const handleEntityClick = (entityId: string) => {
    setShowPopover(false);
    onEntityClick?.(entityId);
  };

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <div
          className="absolute cursor-pointer"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 45,
          }}
        >
          <div 
            className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-cyan-500 flex items-center justify-center transition-transform hover:scale-110 shadow-md"
            style={{
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)',
            }}
          >
            <span className="text-white font-semibold text-xs">{count}</span>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 max-h-72 overflow-y-auto bg-slate-900 border-slate-700"
        align="start"
        side="right"
      >
        <div className="space-y-1">
          <h4 className="font-medium text-xs text-slate-400 mb-2 px-1">
            {count} {count === 1 ? 'entity' : 'entities'}
          </h4>
          {entities.map(entity => (
            <div 
              key={entity.id} 
              className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer"
              draggable={!entity.current_edge_id}
              onClick={() => handleEntityClick(entity.id)}
              onDragStart={(e) => handleEntityDragStart(e, entity.id, entity.current_node_id || '')}
              onDragEnd={(e) => handleEntityDragEnd(e, entity.id)}
              style={{
                opacity: draggedEntityId === entity.id ? 0.5 : 1
              }}
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={entity.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-slate-700 text-slate-300">
                  {entity.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-200 truncate block">{entity.name}</span>
                <span className="text-[10px] text-slate-500 capitalize">{entity.entity_type}</span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
