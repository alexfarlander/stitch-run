'use client';

import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StitchFlow, StitchEntity } from '@/types/stitch';
import { SectionNode } from './nodes/SectionNode';
import { SectionItemNode } from './nodes/SectionItemNode';
import { FinancialItemNode } from './nodes/FinancialItemNode';
import { WorkerNode } from './nodes/WorkerNode';
import { CollectorNode } from './nodes/CollectorNode';
import { UXNode } from './nodes/UXNode';
import { SplitterNode } from './nodes/SplitterNode';
import { MediaSelectNode } from './nodes/MediaSelectNode';
import { CostsSectionNode } from './nodes/CostsSectionNode';
import { RevenueSectionNode } from './nodes/RevenueSectionNode';
import { FallbackNode } from './nodes/FallbackNode';
import { IntegrationItem, PersonItem, CodeItem, DataItem } from './items';
import { JourneyEdge } from './edges/JourneyEdge';
import { SystemEdge } from './edges/SystemEdge';
import { EntityOverlay } from './entities/EntityOverlay';
import { RunStatusOverlay } from './RunStatusOverlay';
import { DemoControlPanel } from './DemoControlPanel';
import { AIAssistantPanel } from '@/components/panels/AIAssistantPanel';
import { CanvasBreadcrumbs } from './CanvasBreadcrumbs';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';
import { useCanvasGraphUpdate } from '@/hooks/useCanvasGraphUpdate';
import { useEntities } from '@/hooks/useEntities';
import { sortNodesForRendering, Z_INDEX_LAYERS } from './utils';

interface BMCCanvasProps {
  flow: StitchFlow;
  initialEntities?: StitchEntity[];
  runId?: string; // Optional run ID for showing execution status
}

interface SectionNodeData {
  label: string;
  category: string;
  child_canvas_id?: string;
}

interface ItemNodeData {
  label: string;
  linked_workflow_id?: string;
  linked_canvas_id?: string;
}

export function BMCCanvas({ flow, runId }: BMCCanvasProps) {
  const { drillInto } = useCanvasNavigation();
  const traversingEdges = useEdgeTraversal(flow.id);

  // Get entities to derive edge visibility from active entity travel
  const { entities } = useEntities(flow.id);

  // Handle AI graph updates using shared hook
  const handleGraphUpdate = useCanvasGraphUpdate(flow.id);

  // Edge visibility state management
  const [showAllEdges, setShowAllEdges] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Memoize nodeTypes so React Flow doesn't re-render constantly
  const nodeTypes = useMemo<NodeTypes>(() => ({
    // Background containers (The 12 Sections)
    section: SectionNode,

    // Items inside sections (CRM, API, etc.)
    'section-item': SectionItemNode,
    'financial-item': FinancialItemNode,

    // Production-side items
    'integration-item': IntegrationItem,
    'person-item': PersonItem,
    'code-item': CodeItem,
    'data-item': DataItem,

    // Financial sections
    'costs-section': CostsSectionNode,
    'revenue-section': RevenueSectionNode,

    // Workflow nodes (for drill-down views)
    Worker: WorkerNode,
    Collector: CollectorNode,
    UX: UXNode,
    Splitter: SplitterNode,
    MediaSelect: MediaSelectNode,

    // Fallback for unknown node types
    fallback: FallbackNode,
  }), []);

  const edgeTypes = useMemo<EdgeTypes>(() => ({
    journey: JourneyEdge,
    system: SystemEdge,
  }), []);

  // Transform flow nodes to ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    // Get list of registered node types
    const registeredTypes = new Set([
      'section',
      'section-item',
      'financial-item',
      'integration-item',
      'person-item',
      'code-item',
      'data-item',
      'costs-section',
      'revenue-section',
      'Worker',
      'Collector',
      'UX',
      'Splitter',
      'MediaSelect',
    ]);

    const transformedNodes = flow.graph.nodes.map((node) => {
      const isSection = node.type === 'section';
      const isFinancialSection = node.type === 'costs-section' || node.type === 'revenue-section';
      const isItem = node.type === 'section-item' ||
        node.type === 'financial-item' ||
        node.type === 'integration-item' ||
        node.type === 'person-item' ||
        node.type === 'code-item' ||
        node.type === 'data-item';

      // Use fallback type if node type is not registered
      const nodeType = registeredTypes.has(node.type) ? node.type : 'fallback';

      // Log warning for unknown node types
      if (nodeType === 'fallback') {
        console.warn(`Unknown node type encountered: "${node.type}" for node "${node.id}". Using fallback component.`);
      }

      // Determine zIndex based on node type using constants
      let zIndex: number;
      if (isSection) {
        zIndex = Z_INDEX_LAYERS.SECTION_BACKGROUND;
      } else if (isFinancialSection) {
        zIndex = Z_INDEX_LAYERS.FINANCIAL_SECTIONS;
      } else if (isItem) {
        zIndex = Z_INDEX_LAYERS.ITEMS;
      } else {
        // Default for workflow nodes and other types
        zIndex = Z_INDEX_LAYERS.ITEMS;
      }

      return {
        id: node.id,
        type: nodeType,
        position: node.position,
        data: {
          ...node.data,
          // Pass original type to fallback component for display
          originalType: node.type,
        },
        parentId: node.parentId,
        extent: node.extent,
        style: {
          ...node.style,
          zIndex,
        },
        width: node.width,
        height: node.height,
        // Lock sections in place so you don't accidentally drag the background
        draggable: !isSection && !isFinancialSection,
        selectable: !isSection && !isFinancialSection,
        // Items connect, sections don't (usually)
        connectable: !isSection && !isFinancialSection,
      };
    });

    // CRITICAL: Sort nodes by zIndex to ensure correct DOM stacking order
    // React Flow renders nodes in array order, which affects z-index stacking context
    return sortNodesForRendering(transformedNodes);
  }, [flow.graph.nodes]);

  // Transform flow edges with visibility calculation logic
  const edges: Edge[] = useMemo(() => {
    return flow.graph.edges.map((edge) => {
      // Calculate visibility conditions
      const isTraversing = traversingEdges.get(edge.id) || false;
      const isConnectedToSelected = selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);

      // Check if any entity is currently traveling on this edge
      const hasActiveEntityTravel = entities?.some(e => e.current_edge_id === edge.id) || false;

      // Determine if edge should be visible
      const isVisible = showAllEdges || isTraversing || isConnectedToSelected || hasActiveEntityTravel;

      // Determine edge type with fallback to 'journey'
      const edgeType = edge.type || 'journey';

      // Apply stroke color based on edge type
      const strokeColor = edgeType === 'system' ? '#64748b' : '#06b6d4';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        animated: isTraversing,
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: isVisible ? 'auto' : 'none',
        },
        data: {
          intensity: 0.8,
          isTraversing,
        },
      };
    });
  }, [flow.graph.edges, traversingEdges, showAllEdges, selectedNodeId, entities]);

  // Handle section double-clicks for drill-down
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'section') {
      const data = node.data as unknown as SectionNodeData;
      if (data.child_canvas_id) {
        drillInto(data.child_canvas_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);

  // Handle item single clicks for drill-down
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'section-item') {
      const data = node.data as unknown as ItemNodeData;
      if (data.linked_workflow_id) {
        drillInto(data.linked_workflow_id, data.label, 'workflow');
      } else if (data.linked_canvas_id) {
        drillInto(data.linked_canvas_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);

  // Handle node drop event for entity movement
  const onNodeDrop = useCallback((event: React.DragEvent, node: any) => {
    event.preventDefault();
    // Store the target node ID for EntityOverlay to use
    window.dispatchEvent(new CustomEvent('entity-drop', {
      detail: { targetNodeId: node.id, event }
    }));
  }, []);

  // Handle node drag over
  const onNodeDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle selection change for edge visibility
  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    if (nodes.length === 1) {
      setSelectedNodeId(nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  return (
    <div className="w-full h-full bg-[#0a0f1a] text-white relative">
      {/* Canvas Breadcrumbs - Floating in top-left */}
      <CanvasBreadcrumbs 
        canvasId={flow.id} 
        canvasName={flow.name} 
        canvasType={flow.canvas_type as 'bmc' | 'workflow'} 
      />

      {/* Edge Visibility Toggle - Floating in top-right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setShowAllEdges(prev => !prev)}
          className={`px-3 py-2 rounded-lg border transition-colors ${showAllEdges
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
            }`}
          title={showAllEdges ? 'Hide edges' : 'Show all edges'}
        >
          {showAllEdges ? '👁 Edges' : '👁‍🗨 Edges'}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onSelectionChange={handleSelectionChange}
        fitView
        minZoom={0.5}
        maxZoom={2}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={24} size={1} />
        <Controls className="bg-white/10 border-white/10 fill-white text-white" />

        {/* The Magic Layer */}
        <EntityOverlay canvasId={flow.id} />

        {/* Run Status Indicators */}
        {runId && <RunStatusOverlay runId={runId} />}
      </ReactFlow>

      {/* AI Assistant Panel */}
      <AIAssistantPanel
        canvasId={flow.id}
        onGraphUpdate={handleGraphUpdate}
      />

      {/* Demo Control Panel - Fixed at bottom-left */}
      <DemoControlPanel />
    </div>
  );
}