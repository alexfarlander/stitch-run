'use client';

import { useState } from 'react';
import { StitchEntity } from '@/types/entity';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EntityClusterProps {
  count: number;
  position: { x: number; y: number };
  nodeId: string;
  entities: StitchEntity[];
  onClick?: () => void;
  onDragStart?: (entityId: string) => void;
  onDragEnd?: (entityId: string, targetNodeId: string | null) => void;
}

/**
 * EntityCluster Component
 * 
 * Displays a badge with entity count when more than 5 entities are at the same node.
 * Clicking the badge shows a popover with all entities in the cluster.
 * 
 * Requirements:
 * - 4.1: Display cluster badge when more than 5 entities at same node
 * - 4.2: Show count of entities in cluster
 * - 4.3: Display popover list when cluster is clicked
 * - 4.5: Update count in real-time when entities are added/removed
 */
export function EntityCluster({ 
  count, 
  position, 
  entities, 
  onClick,
  onDragStart,
  onDragEnd 
}: EntityClusterProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);

  const handleClick = () => {
    setShowPopover(!showPopover);
    onClick?.();
  };

  // Handle drag start for individual entity in cluster
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

  // Handle drag end
  const handleEntityDragEnd = (e: React.DragEvent, entityId: string) => {
    e.stopPropagation();
    setDraggedEntityId(null);
    onDragEnd?.(entityId, null);
  };

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <div
          className="absolute cursor-pointer group"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 40,
          }}
          onClick={handleClick}
        >
          <div 
            className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-gray-900 flex items-center justify-center transition-transform hover:scale-110"
            style={{
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)',
            }}
          >
            <span className="text-white font-bold text-lg">{count}</span>
          </div>
          
          {/* Hover label */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {count} entities
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm mb-2">Entities at this node</h4>
          {entities.map(entity => (
            <div 
              key={entity.id} 
              className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-move"
              draggable={!entity.current_edge_id}
              onDragStart={(e) => handleEntityDragStart(e, entity.id, entity.current_node_id || '')}
              onDragEnd={(e) => handleEntityDragEnd(e, entity.id)}
              style={{
                opacity: draggedEntityId === entity.id ? 0.5 : 1
              }}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={entity.avatar_url || undefined} />
                <AvatarFallback>{entity.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{entity.name}</span>
                <span className="text-xs text-gray-500 capitalize">{entity.entity_type}</span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
