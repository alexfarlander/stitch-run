/**
 * Hook for listening to node activation events
 * 
 * Subscribes to real-time broadcasts for node activation (green flash)
 * when entities arrive at or depart from nodes.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface NodeActivation {
  nodeId: string;
  entityId: string;
  entityName?: string;
  activationType: 'arrival' | 'departure';
  timestamp: string;
}

interface UseNodeActivationResult {
  activatedNodes: Set<string>;
  isNodeActivated: (nodeId: string) => boolean;
}

/**
 * Hook to track which nodes are currently "activated" (flashing green)
 * 
 * @param canvasId - The canvas to listen for activation events
 * @param flashDuration - How long the activation flash lasts (ms), default 1000
 */
export function useNodeActivation(
  canvasId: string,
  flashDuration: number = 1000
): UseNodeActivationResult {
  const [activatedNodes, setActivatedNodes] = useState<Set<string>>(new Set());

  // Check if a specific node is activated
  const isNodeActivated = useCallback((nodeId: string) => {
    return activatedNodes.has(nodeId);
  }, [activatedNodes]);

  useEffect(() => {
    if (!canvasId) return;

    // Subscribe to node activation broadcasts
    // Channel name must match what the server broadcasts to
    const channel = supabase
      .channel(`canvas-${canvasId}`)
      .on('broadcast', { event: 'node_activated' }, (payload) => {
        const activation = payload.payload as NodeActivation;
        const nodeId = activation.nodeId;
        
        if (!nodeId) {
          console.warn('[useNodeActivation] Received activation without nodeId:', payload);
          return;
        }
        
        console.log('[useNodeActivation] Node activated:', nodeId, activation.activationType);

        // Add node to activated set
        setActivatedNodes(prev => {
          const next = new Set(prev);
          next.add(nodeId);
          return next;
        });

        // Remove after flash duration
        setTimeout(() => {
          setActivatedNodes(prev => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        }, flashDuration);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canvasId, flashDuration]);

  return { activatedNodes, isNodeActivated };
}
