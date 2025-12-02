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
}

export const SplitterNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as SplitterNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="Splitter" status={status} label={label}>
        {nodeData.label || 'Splitter'}
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

SplitterNode.displayName = 'SplitterNode';
