'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { CodeItemProps } from './types';
import { getStatusColor, formatRelativeTime } from './utils';

/**
 * CodeItem Component
 * 
 * Displays code deployment status in the BMC Code section.
 * Shows deployment name, status indicator, last deploy time, and optional external links.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
const CodeItemComponent = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CodeItemProps['data'];
  const { label, status, lastDeploy, repoUrl, deploymentUrl } = nodeData;
  
  // Get status indicator color
  const statusColorClass = getStatusColor(status);
  
  // Format last deploy time
  const formattedLastDeploy = formatRelativeTime(lastDeploy);
  
  // Icons
  const CodeIcon = LucideIcons.Code2;
  const ExternalLinkIcon = LucideIcons.ExternalLink;
  
  return (
    <div className="relative" data-node-id={id}>
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
      
      {/* Code Card */}
      <div
        className="
          flex flex-col gap-2 px-3 py-2
          w-[160px] min-h-[80px]
          bg-slate-800/90 backdrop-blur-sm
          border border-cyan-700/50
          rounded-md
          shadow-lg
          transition-all duration-200
          hover:shadow-cyan-500/20 hover:border-cyan-500/70
          group
        "
      >
        {/* Header: Icon + Label */}
        <div className="flex items-center gap-2">
          <CodeIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
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
        
        {/* Last Deploy Time */}
        <div className="text-xs text-slate-500">
          Last deploy: {formattedLastDeploy}
        </div>
        
        {/* Optional External Links */}
        {(repoUrl || deploymentUrl) && (
          <div className="flex items-center gap-2 mt-1">
            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="w-3 h-3" />
                <span>Repo</span>
              </a>
            )}
            {deploymentUrl && (
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="w-3 h-3" />
                <span>Live</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

CodeItemComponent.displayName = 'CodeItem';

export { CodeItemComponent as CodeItem };
