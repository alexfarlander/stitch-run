/**
 * SplitterNode - Renders a Splitter node with real-time status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface SplitterNodeData {
  label?: string;
  arrayPath?: string;
  node_states?: StitchRun['node_states'];
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export const SplitterNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as SplitterNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode
        id={id}
        type="Splitter"
        status={status}
        label={label}
        selected={selected}
        onDrop={nodeData.onDrop}
        onDragOver={nodeData.onDragOver}
      >
        {nodeData.label || 'Splitter'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

SplitterNode.displayName = 'SplitterNode';
