'use client';

import { useMemo, useCallback } from 'react';
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

import { StitchFlow, StitchEntity } from '@/types/stitch';
import { SectionNode } from './nodes/SectionNode';
import { SectionItemNode } from './nodes/SectionItemNode';
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
import { EntityOverlay } from './entities/EntityOverlay';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { sortNodesForRendering, Z_INDEX_LAYERS } from './utils';

interface BMCCanvasProps {
  flow: StitchFlow;
  initialEntities?: StitchEntity[];
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

export function BMCCanvas({ flow }: BMCCanvasProps) {
  const { drillInto } = useCanvasNavigation();
  
  // Memoize nodeTypes so React Flow doesn't re-render constantly
  const nodeTypes = useMemo<NodeTypes>(() => ({
    // Background containers (The 12 Sections)
    section: SectionNode,
    
    // Items inside sections (CRM, API, etc.)
    'section-item': SectionItemNode,
    
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
  }), []);

  // Transform flow nodes to ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    // Get list of registered node types
    const registeredTypes = new Set([
      'section',
      'section-item',
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

  // Transform flow edges
  const edges: Edge[] = useMemo(() => {
    return flow.graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'journey',
      animated: true, // Force animation
      style: { stroke: '#06b6d4', strokeWidth: 2 }, // Default style backup
      data: { intensity: 0.8 },
    }));
  }, [flow.graph.edges]);

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

  return (
    <div className="w-full h-full bg-[#0a0f1a] text-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        minZoom={0.5}
        maxZoom={2}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={24} size={1} />
        <Controls className="bg-white/10 border-white/10 fill-white text-white" />
        
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === 'section') {
              const category = (node.data as any)?.category;
              if (category === 'Production') return '#4f46e5'; // Indigo
              if (category === 'Customer') return '#10b981'; // Emerald
              if (category === 'Financial') return '#f59e0b'; // Amber
            }
            return '#64748b';
          }}
          maskColor="rgba(10, 15, 26, 0.8)"
          className="bg-[#0a0f1a] border border-white/10"
        />
        
        {/* The Magic Layer */}
        <EntityOverlay canvasId={flow.id} />
      </ReactFlow>
    </div>
  );
}