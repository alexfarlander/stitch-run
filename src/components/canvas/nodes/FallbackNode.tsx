'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';

/**
 * FallbackNode - Renders when an unknown node type is encountered
 * 
 * This component provides a visual indicator that a node type is not registered
 * in the nodeTypes registry. It displays the node ID and type to help with debugging.
 * 
 * Validates: Requirements 6.2
 */
export const FallbackNode = memo(({ id, type, data }: NodeProps) => {
  // Use originalType from data if available, otherwise use the type prop
  const displayType = (data as unknown)?.originalType || type;
  
  return (
    <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-lg p-4 min-w-[200px]">
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-yellow-500 font-semibold text-sm mb-1">
            Unknown Node Type
          </div>
          <div className="text-white/70 text-xs space-y-1">
            <div>
              <span className="text-white/50">ID:</span>{' '}
              <span className="font-mono">{id}</span>
            </div>
            <div>
              <span className="text-white/50">Type:</span>{' '}
              <span className="font-mono">{displayType}</span>
            </div>
            {(data as unknown)?.label && (
              <div>
                <span className="text-white/50">Label:</span>{' '}
                <span>{String((data as unknown).label)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

FallbackNode.displayName = 'FallbackNode';
