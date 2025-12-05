/**
 * Shared hook for handling AI graph updates
 * 
 * Extracts duplicated logic from BMCCanvas and WorkflowCanvas
 * to adhere to DRY principles.
 */

import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface VisualGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Hook for handling graph updates via API
 * 
 * @param canvasId - The canvas ID to update
 * @returns Callback function to handle graph updates
 */
export function useCanvasGraphUpdate(canvasId: string) {
  const handleGraphUpdate = useCallback(
    async (graph: { nodes: Node[]; edges: Edge[] }) => {
      try {
        // Update the canvas via API
        const response = await fetch(`/api/canvas/${canvasId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvas: graph as VisualGraph,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to update canvas:', error);
          throw new Error(error.error || 'Failed to update canvas');
        }

        // The canvas will update automatically via Supabase real-time subscriptions
        // or the parent component will refetch the flow data
      } catch (error) {
        console.error('Error updating canvas:', error);
        throw error;
      }
    },
    [canvasId]
  );

  return handleGraphUpdate;
}
