'use client';

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CostsSection } from '../sections/CostsSection';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';

/**
 * CostsSectionNode - React Flow wrapper for CostsSection
 * 
 * Renders the financial costs visualization as a node in the BMC canvas.
 * This node displays expense breakdowns and cost trends.
 * Wrapped in error boundary for graceful degradation.
 */
export const CostsSectionNode = memo((props: NodeProps) => {
  return (
    <div className="w-full h-full">
      <SectionErrorBoundary>
        <CostsSection {...props} />
      </SectionErrorBoundary>
    </div>
  );
});

CostsSectionNode.displayName = 'CostsSectionNode';
