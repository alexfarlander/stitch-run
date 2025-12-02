/**
 * StitchCanvas - Main visualization component for live run execution
 * Renders the flow graph with real-time status updates
 */

'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StitchFlow, StitchRun } from '@/types/stitch';
import { WorkerNode } from './nodes/WorkerNode';
import { CollectorNode } from './nodes/CollectorNode';
import { UXNode } from './nodes/UXNode';
import { SplitterNode } from './nodes/SplitterNode';

interface StitchCanvasProps {
  flow: StitchFlow;
  run?: StitchRun;
}

const nodeTypes: NodeTypes = {
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
};

export function StitchCanvas({ flow, run }: StitchCanvasProps) {
  // Transform flow nodes to ReactFlow nodes with runtime state
  const nodes: Node[] = useMemo(() => {
    return flow.graph.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        node_states: run?.node_states,
      },
      draggable: false, // Disable editing in run view
      selectable: true,
    }));
  }, [flow.graph.nodes, run?.node_states]);

  // Transform flow edges to ReactFlow edges
  const edges: Edge[] = useMemo(() => {
    return flow.graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      animated: true,
      style: {
        stroke: '#00ff99',
        strokeWidth: 2,
      },
    }));
  }, [flow.graph.edges]);

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
        }}
      >
        <Background color="#1e293b" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            // Color minimap nodes based on status
            const nodeStates = run?.node_states;
            if (!nodeStates) return '#475569';
            
            const state = nodeStates[node.id];
            if (!state) return '#475569';
            
            switch (state.status) {
              case 'completed': return '#00ff99';
              case 'running': return '#fbbf24';
              case 'failed': return '#ef4444';
              case 'waiting_for_user': return '#3b82f6';
              default: return '#475569';
            }
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
