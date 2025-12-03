'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PersonItemProps } from './types';
import { getStatusColor } from './utils';

/**
 * PersonItem Component
 * 
 * Displays team members and AI agents in the BMC People section.
 * Shows avatar, name, role, status indicator, and type badge (human/AI).
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */
const PersonItemComponent = memo(({ id, data }: NodeProps) => {
  const nodeData = data as PersonItemProps['data'];
  const { label, role, avatarUrl, status, type } = nodeData;
  
  // Get status indicator color
  const statusColorClass = getStatusColor(status);
  
  // Get type badge emoji
  const typeBadge = type === 'human' ? '👤' : '🤖';
  
  // Generate initials from name for placeholder
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-orange-400 border-2 border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-orange-400 border-2 border-slate-900"
      />
      
      {/* Person Card */}
      <div
        className="
          flex flex-col gap-2 px-3 py-2
          w-[160px] min-h-[100px]
          bg-slate-800/90 backdrop-blur-sm
          border border-orange-700/50
          rounded-md
          shadow-lg
          transition-all duration-200
          hover:shadow-orange-500/20 hover:border-orange-500/70
          group
        "
      >
        {/* Avatar Section */}
        <div className="flex items-start gap-3">
          {/* Avatar with Type Badge */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={label}
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-600/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center border-2 border-orange-600/50">
                <span className="text-sm font-bold text-white">
                  {getInitials(label)}
                </span>
              </div>
            )}
            
            {/* Type Badge Overlay */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center border border-orange-600/50">
              <span className="text-xs">{typeBadge}</span>
            </div>
            
            {/* Status Indicator */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusColorClass} border-2 border-slate-900`} />
          </div>
          
          {/* Name and Role */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {label}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {role}
            </p>
          </div>
        </div>
        
        {/* Status Label */}
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xs text-slate-500 capitalize">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
});

PersonItemComponent.displayName = 'PersonItem';

export { PersonItemComponent as PersonItem };
