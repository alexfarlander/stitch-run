/**
 * CollectorNode - Renders a Collector node with real-time status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface CollectorNodeData {
  label?: string;
  node_states?: StitchRun['node_states'];
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export const CollectorNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CollectorNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode
        id={id}
        type="Collector"
        status={status}
        label={label}
        selected={selected}
        onDrop={nodeData.onDrop}
        onDragOver={nodeData.onDragOver}
      >
        {nodeData.label || 'Collector'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

CollectorNode.displayName = 'CollectorNode';
