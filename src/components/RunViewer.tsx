/**
 * RunViewer - Real-time run visualization with UX interaction support
 * Combines StitchCanvas with UXInteractionPanel for human-in-the-loop flows
 */

'use client';

import { useMemo } from 'react';
import { StitchCanvas } from '@/components/canvas';
import { UXInteractionPanel } from '@/components/UXInteractionPanel';
import { useRealtimeRun } from '@/hooks/useRealtimeRun';
import { StitchFlow, StitchRun } from '@/types/stitch';
import { Loader2 } from 'lucide-react';

interface RunViewerProps {
  initialRun: StitchRun;
  flow: StitchFlow;
}

export function RunViewer({ initialRun, flow }: RunViewerProps) {
  const { run, loading, error } = useRealtimeRun(initialRun.id);

  // Find active UX node (waiting_for_user status)
  const activeUXNode = useMemo(() => {
    if (!run) return null;

    // Find first node with waiting_for_user status
    const waitingNodeId = Object.keys(run.node_states).find(
      (nodeId) => run.node_states[nodeId].status === 'waiting_for_user'
    );

    if (!waitingNodeId) return null;

    // Find the node in the flow graph
    const node = flow.graph.nodes.find((n) => n.id === waitingNodeId);
    if (!node || node.type !== 'UX') return null;

    return {
      nodeId: waitingNodeId,
      label: node.data.label,
      prompt: node.data.prompt,
    };
  }, [run, flow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading run...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">Error loading run</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StitchCanvas flow={flow} run={run || undefined} />
      
      {/* Show UX interaction panel if a UX node is waiting */}
      {activeUXNode && (
        <UXInteractionPanel
          runId={initialRun.id}
          nodeId={activeUXNode.nodeId}
          nodeLabel={activeUXNode.label}
          prompt={activeUXNode.prompt}
        />
      )}
    </>
  );
}
