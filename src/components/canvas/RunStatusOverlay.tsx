/**
 * Run Status Overlay Component
 * Renders status indicators for all nodes in an active run
 * Requirements: 1.1, 1.2, 1.3, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.2, 8.3, 8.4
 */

'use client';

import type { Node as FlowNode } from '@xyflow/react';
import { useNodes, useViewport, Panel } from '@xyflow/react';
import { useRunStatus } from '@/hooks/useRunStatus';
import { NodeStatusIndicator } from './nodes/NodeStatusIndicator';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useEffect } from 'react';
import type { NodeState } from '@/types/stitch';

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

  // Log errors for debugging (Requirement 6.4)
  useEffect(() => {
    if (error) {
      console.error('[RunStatusOverlay] Error loading run status:', {
        runId,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }, [error, runId]);

  // Don't render if no run is active
  if (!runId) {
    return null;
  }

  // Display error message if run status fails to load (Requirements 6.1, 6.2, 6.3)
  if (error) {
    return (
      <Panel position="top-center" className="m-4">
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            {/* Error Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Error Content */}
            <div className="flex-1">
              <h3 className="text-red-900 font-semibold text-lg mb-1">
                Failed to Load Run Status
              </h3>
              <p className="text-red-800 text-sm mb-2">
                {error}
              </p>
              <p className="text-red-700 text-xs">
                Please check your connection and try refreshing the page. If the problem persists, contact support.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  // Show loading state
  if (loading) {
    return null;
  }

  // Don't render if no node states available
  if (!nodeStates) {
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

      {nodes.map((node) => (
        <NodeStatusItem
          key={`status-${node.id}`}
          node={node}
          nodeStates={nodeStates}
          viewport={viewport}
        />
      ))}
    </div>
  );
}

interface NodeStatusItemProps {
  node: FlowNode;
  nodeStates: Record<string, NodeState>;
  viewport: { zoom: number; x: number; y: number };
}

function NodeStatusItem({ node, nodeStates, viewport }: NodeStatusItemProps) {
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
  const height = node.height || node.measured?.height || 50;
  const x = (node.position.x * viewport.zoom) + viewport.x;
  const y = (node.position.y * viewport.zoom) + viewport.y;

  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(${x}px, ${y}px) scale(${viewport.zoom})`,
        width,
        height,
        transformOrigin: '0 0',
        pointerEvents: 'none'
      }}
    >
      <NodeStatusIndicator
        nodeId={node.id}
        status={status}
        error={errorMessage}
      />
    </div>
  );
}
