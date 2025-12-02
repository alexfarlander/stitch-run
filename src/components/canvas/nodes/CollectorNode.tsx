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
}

export const CollectorNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CollectorNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="Collector" status={status} label={label}>
        {nodeData.label || 'Collector'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

CollectorNode.displayName = 'CollectorNode';
