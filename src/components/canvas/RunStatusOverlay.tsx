/**
 * Run Status Overlay Component
 * Renders status indicators for all nodes in an active run
 * Requirements: 1.1, 1.2, 1.3, 1.5, 8.2, 8.3, 8.4
 */

'use client';

import { useNodes, useViewport, Panel } from '@xyflow/react';
import { useRunStatus } from '@/hooks/useRunStatus';
import { NodeStatusIndicator } from './nodes/NodeStatusIndicator';
import { useNodeStatus } from './hooks/useNodeStatus';

interface RunStatusOverlayProps {
  runId?: string;
}

/**
 * Overlay component that displays status indicators for all nodes in a run
 * Uses React Flow's useNodes hook to get node positions and renders indicators
 * Positioned using viewport transformation to match React Flow's coordinate system
 */
export function RunStatusOverlay({ runId }: RunStatusOverlayProps) {
  const nodes = useNodes();
  const viewport = useViewport();
  const { nodeStates, loading, error } = useRunStatus(runId);

  // Don't render if no run is active or still loading
  if (!runId || loading || error || !nodeStates) {
    if (runId) {
      console.log('[RunStatusOverlay] Not rendering:', { runId, loading, error, hasNodeStates: !!nodeStates });
    }
    return null;
  }

  console.log('[RunStatusOverlay] Rendering status indicators for', nodes.length, 'nodes');
  console.log('[RunStatusOverlay] Node states:', nodeStates);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {/* Debug indicator */}
      <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 text-xs rounded pointer-events-auto z-50">
        Status Overlay Active
      </div>
      
      {nodes.map((node) => {
        // Use the existing useNodeStatus hook to handle parallel instances
        const { status } = useNodeStatus(node.id, nodeStates);
        
        // Get error message if node failed
        const nodeState = nodeStates[node.id];
        const errorMessage = nodeState?.error;

        // Skip if node is pending (no indicator needed)
        if (status === 'pending') {
          return null;
        }

        // Calculate position based on node position, dimensions, and viewport
        const width = node.width || node.measured?.width || 200;
        const height = node.height || node.measured?.height || 100;
        
        // Transform node position to screen coordinates
        const screenX = node.position.x * viewport.zoom + viewport.x;
        const screenY = node.position.y * viewport.zoom + viewport.y;
        const screenWidth = width * viewport.zoom;
        const screenHeight = height * viewport.zoom;

        return (
          <div
            key={`status-${node.id}`}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              width: screenWidth,
              height: screenHeight,
              pointerEvents: 'auto', // Allow interaction with error tooltips
              transform: 'translateZ(0)', // Force GPU acceleration
            }}
          >
            <NodeStatusIndicator
              nodeId={node.id}
              status={status}
              error={errorMessage}
            />
          </div>
        );
      })}
    </div>
  );
}
