'use client';

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { RevenueSection } from '../sections/RevenueSection';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';

/**
 * RevenueSectionNode - React Flow wrapper for RevenueSection
 * 
 * Renders the financial revenue visualization as a node in the BMC canvas.
 * This node displays revenue metrics, customer counts, and plan breakdowns.
 * Wrapped in error boundary for graceful degradation.
 */
export const RevenueSectionNode = memo((props: NodeProps) => {
  return (
    <div className="w-full h-full">
      <SectionErrorBoundary>
        <RevenueSection {...props} />
      </SectionErrorBoundary>
    </div>
  );
});

RevenueSectionNode.displayName = 'RevenueSectionNode';
