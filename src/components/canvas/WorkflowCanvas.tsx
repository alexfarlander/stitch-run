/**
 * WorkflowCanvas - Renders workflow graphs with real-time execution status
 * Shows the detailed workflow inside a BMC section
 */

'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft } from 'lucide-react';

import { StitchFlow, StitchRun } from '@/types/stitch';
import { WorkerNode } from './nodes/WorkerNode';
import { CollectorNode } from './nodes/CollectorNode';
import { UXNode } from './nodes/UXNode';
import { SplitterNode } from './nodes/SplitterNode';
import { MediaSelectNode } from './nodes/MediaSelectNode';
import { JourneyEdge } from './edges/JourneyEdge';
import { SystemEdge } from './edges/SystemEdge';
import { AIAssistantPanel } from '@/components/panels/AIAssistantPanel';
import { NodeConfigPanel } from '@/components/panels/NodeConfigPanel';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useRealtimeRun } from '@/hooks/useRealtimeRun';
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';
import { useTimelineNodeStates } from '@/hooks/useTimelineNodeStates';
import { useCanvasGraphUpdate } from '@/hooks/useCanvasGraphUpdate';
import { VisualGraph } from '@/types/canvas-schema';
import { TimelineScrubber } from './TimelineScrubber';

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
  MediaSelect: MediaSelectNode as any,
};

// Edge type registry for workflow edges
const edgeTypes: EdgeTypes = {
  journey: JourneyEdge,
  system: SystemEdge,
};

export function WorkflowCanvas({ flow, runId }: WorkflowCanvasProps) {
  const { goBack, canGoBack } = useCanvasNavigation();
  const [nodeStates, setNodeStates] = useState<StitchRun['node_states']>({});
  const [scrubTimestamp, setScrubTimestamp] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const traversingEdges = useEdgeTraversal(flow.id);

  // Use timeline hook for historical state reconstruction
  // Requirements: 6.2, 6.3, 6.4, 6.5
  const { nodeStates: timelineNodeStates } = useTimelineNodeStates(
    runId || '',
    scrubTimestamp
  );

  // Handle AI graph updates using shared hook
  const handleGraphUpdate = useCanvasGraphUpdate(flow.id);

  // Subscribe to run updates if runId provided
  const { run } = useRealtimeRun(runId || '');

  // Initialize nodes and edges with local state for interaction
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Initial load of graph data
  useEffect(() => {
    if (flow.graph) {
      const initialNodes = flow.graph.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          node_states: nodeStates,
          // Explicitly pass selected if needed, though React Flow handles it via selected prop on Node
        },
        style: node.style,
        selectable: true,
        draggable: true,
      }));
      setNodes(initialNodes);

      const initialEdges = flow.graph.edges.map((edge) => ({
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
        data: {
          isTraversing: traversingEdges.get(edge.id) || false,
        },
      }));
      setEdges(initialEdges);
    }
  }, [flow.graph]); // Only run on mount or if graph structure changes deeply (which usually doesn't in this view)

  // Sync node states (e.g. from real-time run or time travel)
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          node_states: nodeStates,
        },
      }))
    );
  }, [nodeStates, setNodes]);

  // Update node states based on time travel mode
  useEffect(() => {
    if (scrubTimestamp !== null) {
      setNodeStates(timelineNodeStates);
    } else if (run) {
      setNodeStates(run.node_states);
    } else if (!runId) {
      setNodeStates({});
    }
  }, [run, runId, scrubTimestamp, timelineNodeStates]);

  // Handle timestamp change
  const handleTimestampChange = useCallback((timestamp: string | null) => {
    setScrubTimestamp(timestamp);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Sync edge highlighting and traversal state
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const isConnectedToSelected =
          selectedNodeId &&
          (edge.source === selectedNodeId || edge.target === selectedNodeId);

        return {
          ...edge,
          data: {
            ...edge.data,
            isTraversing: traversingEdges.get(edge.id) || false,
            isHighlighted: !!isConnectedToSelected,
          },
          animated: true, // Keep animated
          style: {
            ...edge.style,
            stroke: isConnectedToSelected ? '#22d3ee' : '#06b6d4',
            strokeWidth: isConnectedToSelected ? 3 : 2,
            opacity: isConnectedToSelected || !selectedNodeId ? 1 : 0.3, // Dim unconnected edges if something is selected
          },
          zIndex: isConnectedToSelected ? 10 : 0, // Bring to front
        };
      })
    );
  }, [selectedNodeId, traversingEdges, setEdges]); // Dep on selectedNodeId and traversingEdges

  // Handle node config save
  const handleSaveNodeConfig = useCallback(async (nodeId: string, config: any) => {
    try {
      const response = await fetch(`/api/canvas/${flow.id}/nodes/${nodeId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update node configuration');
      }
    } catch (error) {
      console.error('Error saving node configuration:', error);
      throw error;
    }
  }, [flow.id]);

  const handleNodeConfigClose = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="w-full h-full bg-slate-950 dark relative flex flex-col">
      {/* Back to Surface button */}
      {canGoBack && (
        <button
          onClick={goBack}
          className="
            absolute top-4 left-4 z-10
            flex items-center gap-2 px-4 py-2
            bg-slate-900/90 hover:bg-slate-800
            border border-slate-700 hover:border-cyan-500
            rounded-lg
            text-sm font-medium text-slate-300 hover:text-cyan-400
            transition-all duration-200
            backdrop-blur-sm
            shadow-lg
          "
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Surface
        </button>
      )}

      {/* Flow name header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="px-6 py-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg">
          <h2 className="text-lg font-semibold text-slate-200">{flow.name}</h2>
          {runId && (
            <p className="text-xs text-slate-500 font-mono">Run: {runId}</p>
          )}
          {scrubTimestamp && (
            <p className="text-xs text-amber-500 font-medium mt-1">
              🕐 Time Travel Mode
            </p>
          )}
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
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
        </ReactFlow>

        {/* AI Assistant Panel */}
        <AIAssistantPanel
          canvasId={flow.id}
          onGraphUpdate={handleGraphUpdate}
        />

        {/* Node Configuration Panel */}
        <NodeConfigPanel
          nodeId={selectedNodeId}
          canvasId={flow.id}
          onClose={handleNodeConfigClose}
          onSave={handleSaveNodeConfig}
        />
      </div>

      {/* Timeline Scrubber */}
      {runId && (
        <TimelineScrubber
          runId={runId}
          onTimestampChange={handleTimestampChange}
        />
      )}
    </div>
  );
}
