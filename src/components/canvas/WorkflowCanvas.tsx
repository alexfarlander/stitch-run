/**
 * WorkflowCanvas - Renders workflow graphs with real-time execution status
 * Shows the detailed workflow inside a BMC section
 */

'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft } from 'lucide-react';

import { StitchFlow, StitchRun } from '@/types/stitch';
import { WorkerNode } from './nodes/WorkerNode';
import { CollectorNode } from './nodes/CollectorNode';
import { UXNode } from './nodes/UXNode';
import { SplitterNode } from './nodes/SplitterNode';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useRealtimeRun } from '@/hooks/useRealtimeRun';
import { supabase } from '@/lib/supabase/client';

interface WorkflowCanvasProps {
  flow: StitchFlow;
  runId?: string;
}

// Node type registry for workflow nodes
const nodeTypes: NodeTypes = {
  Worker: WorkerNode as any,
  Collector: CollectorNode as any,
  UX: UXNode as any,
  Splitter: SplitterNode as any,
};

export function WorkflowCanvas({ flow, runId }: WorkflowCanvasProps) {
  const { goBack, canGoBack } = useCanvasNavigation();
  const [nodeStates, setNodeStates] = useState<StitchRun['node_states']>({});
  
  // Subscribe to run updates if runId provided
  const { run } = useRealtimeRun(runId || '');

  // Update node states when run changes
  useEffect(() => {
    if (run) {
      setNodeStates(run.node_states);
    }
  }, [run]);

  // Skip realtime subscription if no runId
  useEffect(() => {
    if (!runId) {
      setNodeStates({});
    }
  }, [runId]);

  // Transform flow nodes to ReactFlow nodes with status
  const nodes: Node[] = useMemo(() => {
    return flow.graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        node_states: nodeStates,
      },
      style: node.style,
    }));
  }, [flow.graph.nodes, nodeStates]);

  // Transform flow edges to ReactFlow edges
  const edges: Edge[] = useMemo(() => {
    return flow.graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      animated: true,
      style: {
        stroke: '#06b6d4',
        strokeWidth: 2,
      },
    }));
  }, [flow.graph.edges]);

  return (
    <div className="w-full h-full bg-slate-950 dark relative">
      {/* Back button */}
      {canGoBack && (
        <button
          onClick={goBack}
          className="
            absolute top-4 left-4 z-10
            flex items-center gap-2 px-4 py-2
            bg-slate-900/90 hover:bg-slate-800
            border border-slate-700 hover:border-cyan-500
            rounded-lg
            text-sm text-slate-300 hover:text-cyan-400
            transition-all duration-200
            backdrop-blur-sm
          "
        >
          <ArrowLeft className="w-4 h-4" />
          Back to BMC
        </button>
      )}

      {/* Flow name header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="px-6 py-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg">
          <h2 className="text-lg font-semibold text-slate-200">{flow.name}</h2>
          {runId && (
            <p className="text-xs text-slate-500 font-mono">Run: {runId}</p>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background 
          color="#1e293b" 
          gap={16}
          style={{
            backgroundColor: '#020617',
          }}
        />
        <Controls 
          className="bg-slate-900 border-slate-700"
        />
        
        {/* Minimap */}
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const status = (node.data as any)?.node_states?.[node.id]?.status;
            switch (status) {
              case 'completed': return '#00ff99';
              case 'running': return '#fbbf24';
              case 'failed': return '#ef4444';
              case 'waiting_for_user': return '#3b82f6';
              default: return '#475569';
            }
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #334155',
          }}
        />
      </ReactFlow>
    </div>
  );
}
