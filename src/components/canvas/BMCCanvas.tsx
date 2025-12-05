'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
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
import { RightSidePanel } from '@/components/panels/RightSidePanel';
import { CanvasBreadcrumbs } from './CanvasBreadcrumbs';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useEdgeTraversal } from '@/hooks/useEdgeTraversal';
import { useCanvasGraphUpdate } from '@/hooks/useCanvasGraphUpdate';
import { useEntities } from '@/hooks/useEntities';
import { useNodeActivation } from '@/hooks/useNodeActivation';
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

  // Track node activations for green flash effect
  const { activatedNodes } = useNodeActivation(flow.id);

  // Handle AI graph updates using shared hook
  const handleGraphUpdate = useCanvasGraphUpdate(flow.id);

  // Edge visibility state management
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Entity selection state (lifted from EntityOverlay for RightSidePanel)
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();

  // Get selected entity object
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !entities) return null;
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [selectedEntityId, entities]);

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

  // Use local state for nodes and edges to enable interactivity
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Group entities by node for badge display
  const entitiesByNode = useMemo(() => {
    const grouped = new Map<string, typeof entities>();
    if (!entities) return grouped;
    
    entities.forEach((entity) => {
      const nodeId = entity.current_node_id;
      if (!nodeId) return;
      
      if (!grouped.has(nodeId)) {
        grouped.set(nodeId, []);
      }
      grouped.get(nodeId)!.push(entity);
    });
    
    return grouped;
  }, [entities]);

  // Initialize nodes from flow graph
  useEffect(() => {
    if (!flow.graph.nodes) return;

    const registeredTypes = new Set([
      'section', 'section-item', 'financial-item', 'integration-item',
      'person-item', 'code-item', 'data-item', 'costs-section', 'revenue-section',
      'Worker', 'Collector', 'UX', 'Splitter', 'MediaSelect',
    ]);

    const transformedNodes = flow.graph.nodes.map((node) => {
      const isSection = node.type === 'section';
      const isFinancialSection = node.type === 'costs-section' || node.type === 'revenue-section';
      const nodeType = registeredTypes.has(node.type) ? node.type : 'fallback';

      let zIndex: number;
      if (isSection) {
        zIndex = Z_INDEX_LAYERS.SECTION_BACKGROUND;
      } else if (isFinancialSection) {
        zIndex = Z_INDEX_LAYERS.FINANCIAL_SECTIONS;
      } else {
        zIndex = Z_INDEX_LAYERS.ITEMS;
      }

      const isActivated = activatedNodes.has(node.id);
      const nodeEntities = entitiesByNode.get(node.id) || [];

      return {
        id: node.id,
        type: nodeType,
        position: node.position,
        data: {
          ...node.data,
          originalType: node.type,
          isActivated,
          // Pass entity data to nodes for badge display
          entityCount: nodeEntities.length,
          entities: nodeEntities,
          onEntitySelect: setSelectedEntityId,
        },
        parentId: node.parentId,
        extent: node.extent,
        style: { ...node.style, zIndex },
        width: node.width,
        height: node.height,
        draggable: !isSection && !isFinancialSection,
        selectable: !isSection && !isFinancialSection,
        connectable: !isSection && !isFinancialSection,
      };
    });

    setNodes(sortNodesForRendering(transformedNodes));
  }, [flow.graph.nodes, activatedNodes, entitiesByNode, setSelectedEntityId, setNodes]);

  // Sync edges with visibility and highlighting logic
  useEffect(() => {
    if (!flow.graph.edges) return;

    const updatedEdges = flow.graph.edges.map((edge) => {
      const isTraversing = traversingEdges.get(edge.id) || false;
      const isConnectedToSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const hasActiveEntityTravel = entities?.some(e => e.current_edge_id === edge.id) || false;
      const isVisible = isTraversing || isConnectedToSelected || hasActiveEntityTravel;
      const edgeType = edge.type || 'journey';
      const strokeColor = isConnectedToSelected ? '#22d3ee' : (edgeType === 'system' ? '#64748b' : '#06b6d4');

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        animated: isTraversing,
        style: {
          stroke: strokeColor,
          strokeWidth: isConnectedToSelected ? 3 : 2,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: (isVisible ? 'auto' : 'none') as 'auto' | 'none',
        },
        data: {
          intensity: 0.8,
          isTraversing,
          isHighlighted: !!isConnectedToSelected,
        },
        zIndex: isConnectedToSelected ? Z_INDEX_LAYERS.EDGES_HIGHLIGHTED : Z_INDEX_LAYERS.EDGES,
      };
    });

    setEdges(updatedEdges);
  }, [flow.graph.edges, traversingEdges, selectedNodeId, entities, setEdges]);

  // Handle double-clicks for drill-down (sections, section-items, and financial-items)
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'section') {
      const data = node.data as unknown as SectionNodeData;
      if (data.child_canvas_id) {
        drillInto(data.child_canvas_id, data.label, 'workflow');
      }
    } else if (node.type === 'section-item' || node.type === 'financial-item') {
      const data = node.data as unknown as ItemNodeData;
      if (data.linked_workflow_id) {
        drillInto(data.linked_workflow_id, data.label, 'workflow');
      } else if (data.linked_canvas_id) {
        drillInto(data.linked_canvas_id, data.label, 'workflow');
      }
    }
  }, [drillInto]);

  // Handle item single clicks - selection only, no drill-down
  const handleNodeClick = useCallback((_event: React.MouseEvent, _node: Node) => {
    // Selection is handled automatically by React Flow
    // No drill-down on single click
  }, []);

  // Handle node drop event for entity movement
  const onNodeDrop = useCallback((event: React.DragEvent, node: any) => {
    event.preventDefault();
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
    <div className="w-full h-full bg-slate-950 text-white relative">
      {/* Canvas Breadcrumbs - Floating in top-left */}
      <CanvasBreadcrumbs
        canvasId={flow.id}
        canvasName={flow.name}
        canvasType={flow.canvas_type as 'bmc' | 'workflow'}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onSelectionChange={handleSelectionChange}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        minZoom={0.5}
        maxZoom={2}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={30} size={1} />
        <Controls className="bg-white/10 border-white/10 fill-white text-white" />

        {/* The Magic Layer */}
        <EntityOverlay
          canvasId={flow.id}
          selectedEntityId={selectedEntityId}
          onEntitySelect={setSelectedEntityId}
        />

        {/* Run Status Indicators */}
        {runId && <RunStatusOverlay runId={runId} />}
      </ReactFlow>

      {/* Left Side Panel - Events Log with Demo Controls, AI Assistant, Entity Details */}
      <RightSidePanel
        canvasId={flow.id}
        selectedEntity={selectedEntity}
        onEntityClose={() => setSelectedEntityId(undefined)}
        onMoveEntity={(entityId, targetNodeId) => {
          // Entity movement is handled by the EntityOverlay drag/drop
          console.log('Move entity:', entityId, 'to', targetNodeId);
        }}
        currentNodes={nodes}
        onGraphUpdate={handleGraphUpdate}
      />
    </div>
  );
}