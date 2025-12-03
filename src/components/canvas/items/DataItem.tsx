'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { DataItemProps } from './types';
import { getStatusColor, formatRelativeTime, formatNumber } from './utils';

/**
 * DataItem Component
 * 
 * Displays data source status in the BMC Data section.
 * Shows data source name, type icon, formatted record count, last sync time, and status indicator.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
const DataItemComponent = memo(({ id, data }: NodeProps) => {
  const nodeData = data as DataItemProps['data'];
  const { label, type, recordCount, lastSync, status } = nodeData;
  
  // Get status indicator color
  const statusColorClass = getStatusColor(status);
  
  // Format last sync time
  const formattedLastSync = formatRelativeTime(lastSync);
  
  // Format record count with comma separators
  const formattedRecordCount = formatNumber(recordCount);
  
  // Get type icon based on data source type
  const getTypeIcon = () => {
    switch (type) {
      case 'database':
        return LucideIcons.Database;
      case 'spreadsheet':
        return LucideIcons.Sheet;
      case 'chart':
        return LucideIcons.BarChart3;
      default:
        return LucideIcons.Database;
    }
  };
  
  const TypeIcon = getTypeIcon();
  
  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-emerald-400 border-2 border-slate-900"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-emerald-400 border-2 border-slate-900"
      />
      
      {/* Data Card */}
      <div
        className="
          flex flex-col gap-2 px-3 py-2
          w-[160px] min-h-[80px]
          bg-slate-800/90 backdrop-blur-sm
          border border-emerald-700/50
          rounded-md
          shadow-lg
          transition-all duration-200
          hover:shadow-emerald-500/20 hover:border-emerald-500/70
          group
        "
      >
        {/* Header: Icon + Label */}
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
        
        {/* Record Count */}
        <div className="text-xs text-slate-300 font-medium">
          {formattedRecordCount} records
        </div>
        
        {/* Last Sync Time */}
        <div className="text-xs text-slate-500">
          Last sync: {formattedLastSync}
        </div>
      </div>
    </div>
  );
});

DataItemComponent.displayName = 'DataItem';

export { DataItemComponent as DataItem };
