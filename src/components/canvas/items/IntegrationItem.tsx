'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { IntegrationItemProps } from './types';
import { getStatusColor, formatRelativeTime } from './utils';

/**
 * IntegrationItem Component
 * 
 * Displays integration status for external APIs and services in the BMC Integrations section.
 * Shows API name, connection status, last ping time, and optional usage metrics.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
const IntegrationItemComponent = memo(({ id, data }: NodeProps) => {
  const nodeData = data as IntegrationItemProps['data'];
  const { label, status, lastPing, usagePercent } = nodeData;
  
  // Get status indicator color
  const statusColorClass = getStatusColor(status);
  
  // Format last ping time
  const formattedLastPing = lastPing ? formatRelativeTime(lastPing) : 'Unknown';
  
  // Icon for integrations
  const PlugIcon = LucideIcons.Plug;
  
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-purple-400 border-2 border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-purple-400 border-2 border-slate-900"
      />
      
      {/* Integration Card */}
      <div
        className="
          flex flex-col gap-2 px-3 py-2
          w-[160px] min-h-[80px]
          bg-slate-800/90 backdrop-blur-sm
          border border-purple-700/50
          rounded-md
          shadow-lg
          transition-all duration-200
          hover:shadow-purple-500/20 hover:border-purple-500/70
          group
        "
      >
        {/* Header: Icon + Label */}
        <div className="flex items-center gap-2">
          <PlugIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-slate-200 truncate flex-1">
            {label}
          </p>
        </div>
        
        {/* Status Indicator with Label */}
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColorClass} flex-shrink-0`} />
          <span className="text-xs text-slate-400 capitalize">
            {status}
          </span>
        </div>
        
        {/* Last Ping Time */}
        <div className="text-xs text-slate-500">
          Last ping: {formattedLastPing}
        </div>
        
        {/* Optional Usage Indicator */}
        {usagePercent !== undefined && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Usage</span>
              <span className="text-xs text-slate-400 font-medium">{usagePercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

IntegrationItemComponent.displayName = 'IntegrationItem';

export { IntegrationItemComponent as IntegrationItem };
