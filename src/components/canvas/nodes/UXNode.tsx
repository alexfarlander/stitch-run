/**
 * UXNode - Renders a UX node with real-time status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface UXNodeData {
  label?: string;
  prompt?: string;
  node_states?: StitchRun['node_states'];
}

export const UXNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as UXNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="UX" status={status} label={label}>
        {nodeData.label || 'User Input'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

UXNode.displayName = 'UXNode';
