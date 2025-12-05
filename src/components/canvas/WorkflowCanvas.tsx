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

  // Update node states based on time travel mode
  // Requirement 6.2: Update node statuses to reflect state at timestamp
  // Requirement 6.5: Return to real-time state when exiting time travel
  useEffect(() => {
    if (scrubTimestamp !== null) {
      // In time travel mode: use historical states
      setNodeStates(timelineNodeStates);
    } else if (run) {
      // Real-time mode: use current run states
      setNodeStates(run.node_states);
    } else if (!runId) {
      // No run: clear states
      setNodeStates({});
    }
  }, [run, runId, scrubTimestamp, timelineNodeStates]);

  // Handle timestamp change from timeline scrubber
  const handleTimestampChange = useCallback((timestamp: string | null) => {
    setScrubTimestamp(timestamp);
  }, []);

  // Handle node click to open configuration panel
  // Requirement 3.1: Display configuration panel on node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle node configuration save
  // Requirement 3.4: Update node in database and close panel
  const handleSaveNodeConfig = useCallback(async (nodeId: string, config: any) => {
    try {
      // Update the node configuration via API
      const response = await fetch(`/api/canvas/${flow.id}/nodes/${nodeId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update node configuration');
      }

      // The canvas will update automatically via Supabase real-time subscriptions
      // or the parent component will refetch the flow data
    } catch (error) {
      console.error('Error saving node configuration:', error);
      throw error;
    }
  }, [flow.id]);

  // Handle node config panel close
  const handleNodeConfigClose = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

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

  // Transform flow edges to ReactFlow edges with traversal state
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
      data: {
        isTraversing: traversingEdges.get(edge.id) || false,
      },
    }));
  }, [flow.graph.edges, traversingEdges]);



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
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
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

      {/* Timeline Scrubber - Requirement 6.1: Display timeline scrubber at bottom */}
      {runId && (
        <TimelineScrubber 
          runId={runId}
          onTimestampChange={handleTimestampChange}
        />
      )}
    </div>
  );
}
