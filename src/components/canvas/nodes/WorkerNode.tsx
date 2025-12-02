/**
 * WorkerNode - Renders a Worker node with real-time status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface WorkerNodeData {
  label?: string;
  webhookUrl?: string;
  node_states?: StitchRun['node_states'];
}

export const WorkerNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as WorkerNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="Worker" status={status} label={label}>
        {nodeData.label || 'Worker'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

WorkerNode.displayName = 'WorkerNode';
