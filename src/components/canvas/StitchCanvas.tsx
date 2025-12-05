/**
 * StitchCanvas - Main visualization component for live run execution
 * Renders the flow graph with real-time status updates and versioning controls
 * 
 * Features:
 * - Save Version button to create new versions
 * - Run button that auto-versions before execution
 * - Current version indicator
 * - Unsaved changes indicator
 * - Version history panel
 * 
 * Requirements: 5.1, 5.5
 */

'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
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
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Save, 
  Play, 
  GitBranch, 
  AlertCircle, 
  Loader2,
  History,
  X,
} from 'lucide-react';

import { StitchFlow, StitchRun } from '@/types/stitch';
import { VisualGraph } from '@/types/canvas-schema';
import { WorkerNode } from './nodes/WorkerNode';
import { CollectorNode } from './nodes/CollectorNode';
import { UXNode } from './nodes/UXNode';
import { SplitterNode } from './nodes/SplitterNode';
import { MediaSelectNode } from './nodes/MediaSelectNode';
import { JourneyEdge } from './edges/JourneyEdge';
import { RunStatusOverlay } from './RunStatusOverlay';
import { CanvasBreadcrumbs } from './CanvasBreadcrumbs';
import { EntityOverlay } from './entities/EntityOverlay';
import { VersionHistory } from './VersionHistory';
import { FlowVersion } from '@/lib/canvas/version-manager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface StitchCanvasProps {
  flow: StitchFlow;
  run?: StitchRun;
  editable?: boolean;  // Enable editing mode with versioning controls
}

const nodeTypes: NodeTypes = {
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
  MediaSelect: MediaSelectNode,
};

const edgeTypes: EdgeTypes = {
  journey: JourneyEdge,
};

export function StitchCanvas({ flow, run, editable = false }: StitchCanvasProps) {
  const router = useRouter();
  
  // State for versioning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Convert StitchNode to VisualNode
  const convertToVisualNode = (node: any): any => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.data.label || '',
      ...node.data,
    },
    parentNode: node.parentId,
    style: node.style,
    width: node.width,
    height: node.height,
  });
  
  // Convert StitchEdge to VisualEdge
  const convertToVisualEdge = (edge: any): any => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
    style: edge.style,
    data: edge.data,
  });
  
  // Track original graph for change detection
  const [originalGraph, setOriginalGraph] = useState<VisualGraph>({
    nodes: flow.graph.nodes.map(convertToVisualNode),
    edges: flow.graph.edges.map(convertToVisualEdge),
  });
  
  // Use ReactFlow state management for editable mode
  const [nodes, setNodes, onNodesChange] = useNodesState(
    flow.graph.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        node_states: run?.node_states,
      },
      draggable: editable,
      selectable: true,
    }))
  );
  
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    flow.graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'journey',
      data: { intensity: 0.6 },
    }))
  );
  
  // Detect changes
  useEffect(() => {
    if (!editable) return;
    
    const currentGraph: any = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: n.data.label || '',
          ...n.data,
        },
        parentNode: (n as unknown).parentNode,
        style: (n as unknown).style,
        width: (n as unknown).width,
        height: (n as unknown).height,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type,
        animated: (e as unknown).animated,
        style: (e as unknown).style,
        data: e.data,
      })),
    };
    
    // Simple change detection - compare JSON
    const hasChanges = JSON.stringify(currentGraph) !== JSON.stringify(originalGraph);
    setHasUnsavedChanges(hasChanges);
  }, [nodes, edges, originalGraph, editable]);
  
  // Save version handler
  const handleSaveVersion = useCallback(async () => {
    if (!editable || !hasUnsavedChanges) return;
    
    setSaving(true);
    setSaveError(null);
    
    try {
      const currentGraph: any = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data.label || '',
            ...n.data,
          },
          parentNode: (n as unknown).parentNode,
          style: (n as unknown).style,
          width: (n as unknown).width,
          height: (n as unknown).height,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          animated: (e as unknown).animated,
          style: (e as unknown).style,
          data: e.data,
        })),
      };
      
      const response = await fetch(`/api/flows/${flow.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualGraph: currentGraph,
          commitMessage: 'Manual save'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save version');
      }
      
      // Update original graph to new saved state
      setOriginalGraph(currentGraph);
      setHasUnsavedChanges(false);
      
      // Refresh the page to get updated version info
      router.refresh();
    } catch (_error) {
      console.error('Failed to save version:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save version');
    } finally {
      setSaving(false);
    }
  }, [editable, hasUnsavedChanges, nodes, edges, flow.id, router]);
  
  // Run with auto-versioning handler
  const handleRun = useCallback(async () => {
    if (!editable) return;
    
    setRunning(true);
    setSaveError(null);
    
    try {
      const currentGraph: any = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data.label || '',
            ...n.data,
          },
          parentNode: (n as unknown).parentNode,
          style: (n as unknown).style,
          width: (n as unknown).width,
          height: (n as unknown).height,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          animated: (e as unknown).animated,
          style: (e as unknown).style,
          data: e.data,
        })),
      };
      
      // Call the run API endpoint with auto-versioning
      const response = await fetch(`/api/flows/${flow.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualGraph: currentGraph }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start run');
      }
      
      const { runId } = await response.json();
      
      // Update original graph since we auto-versioned
      setOriginalGraph(currentGraph);
      setHasUnsavedChanges(false);
      
      // Navigate to run view
      router.push(`/runs/${runId}`);
    } catch (_error) {
      console.error('Failed to run flow:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to start run');
    } finally {
      setRunning(false);
    }
  }, [editable, nodes, edges, flow.id, router]);
  
  // Handle version view
  const handleViewVersion = useCallback((version: FlowVersion) => {
    // Update nodes and edges to show historical version
    setNodes(version.visual_graph.nodes.map(node => ({
      id: node.id,
      type: node.type as unknown,
      position: node.position,
      data: node.data,
      draggable: false,  // Historical versions are read-only
      selectable: true,
    })) as unknown);
    
    setEdges(version.visual_graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'journey',
      data: { intensity: 0.6 },
    })) as unknown);
    
    setShowVersionHistory(false);
  }, [setNodes, setEdges]);
  
  // Handle version revert
  const handleRevertVersion = useCallback(() => {
    // Refresh to show new current version
    router.refresh();
    setShowVersionHistory(false);
  }, [router]);
  
  return (
    <div className="w-full h-full bg-slate-950 relative">
      {/* Canvas Breadcrumbs - Floating in top-left */}
      <CanvasBreadcrumbs 
        canvasId={flow.id} 
        canvasName={flow.name} 
        canvasType={flow.canvas_type as 'bmc' | 'workflow'} 
      />

      {/* Versioning Controls (only in editable mode) */}
      {editable && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          
          {/* Current version indicator */}
          {flow.current_version_id && (
            <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
              <GitBranch className="w-3 h-3 mr-1" />
              v{flow.current_version_id.slice(0, 8)}
            </Badge>
          )}
          
          {/* Error message */}
          {saveError && (
            <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              {saveError}
            </Badge>
          )}
          
          {/* Version History button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="bg-slate-900/90 border-slate-700 hover:border-cyan-500"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          
          {/* Save Version button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveVersion}
            disabled={!hasUnsavedChanges || saving}
            className="bg-slate-900/90 border-slate-700 hover:border-cyan-500"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Version
              </>
            )}
          </Button>
          
          {/* Run button */}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={running}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Version History Panel */}
      {editable && showVersionHistory && (
        <div className="absolute top-20 right-4 z-10 w-96 max-h-[calc(100vh-8rem)] overflow-hidden">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-200">Version History</h3>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setShowVersionHistory(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <VersionHistory
                flowId={flow.id}
                currentVersionId={flow.current_version_id}
                onViewVersion={handleViewVersion}
                onRevertVersion={handleRevertVersion}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={editable ? onNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#1e293b" gap={16} />
        <Controls />
        <EntityOverlay canvasId={flow.id} />
        
        {/* Run Status Indicators */}
        {run && <RunStatusOverlay runId={run.id} />}
      </ReactFlow>
    </div>
  );
}
