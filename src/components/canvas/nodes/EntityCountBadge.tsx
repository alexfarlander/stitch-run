'use client';

import { useState } from 'react';
import { StitchEntity } from '@/types/entity';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EntityCountBadgeProps {
  count: number;
  entities: StitchEntity[];
  onEntityClick?: (entityId: string) => void;
}

/**
 * EntityCountBadge - Small badge showing entity count in node corner
 * 
 * Renders inside the node component itself (not as overlay),
 * ensuring proper positioning within React Flow's coordinate system.
 */
export function EntityCountBadge({ 
  count, 
  entities,
  onEntityClick 
}: EntityCountBadgeProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  const handleEntityClick = (entityId: string) => {
    setOpen(false);
    onEntityClick?.(entityId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-cyan-500 flex items-center justify-center transition-transform hover:scale-110 shadow-md z-10"
          style={{ boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white font-semibold text-xs">{count}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 max-h-72 overflow-y-auto bg-slate-900 border-slate-700"
        align="start"
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h4 className="font-medium text-xs text-slate-400 mb-2 px-1">
            {count} {count === 1 ? 'entity' : 'entities'}
          </h4>
          {entities.map(entity => (
            <div 
              key={entity.id} 
              className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer"
              onClick={() => handleEntityClick(entity.id)}
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
