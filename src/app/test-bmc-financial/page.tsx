'use client';

import { BMCCanvas } from '@/components/canvas/BMCCanvas';
import { StitchFlow } from '@/types/stitch';

/**
 * Test page for BMC with integrated financial sections
 * 
 * This page demonstrates the costs-section and revenue-section node types
 * integrated into the Business Model Canvas.
 */
export default function TestBMCFinancialPage() {
  // Create a minimal BMC flow with financial sections
  const testFlow: StitchFlow = {
    id: 'test-bmc-financial',
    name: 'Test BMC with Financial Sections',
    canvas_type: 'bmc',
    parent_id: null,
    current_version_id: null,
    graph: {
      nodes: [
        // Financial category section (background container)
        {
          id: 'financial-section',
          type: 'section',
          position: { x: 50, y: 50 },
          data: {
            label: 'Financial',
            category: 'Financial',
          },
          width: 600,
          height: 400,
          style: {},
        },
        // Costs section node
        {
          id: 'costs-node',
          type: 'costs-section',
          position: { x: 70, y: 100 },
          data: {
            canvasId: 'test-bmc-financial',
            showDemo: true,
            width: 500,
            height: 150,
          },
          width: 500,
          height: 150,
          style: {},
          parentId: 'financial-section',
        },
        // Revenue section node
        {
          id: 'revenue-node',
          type: 'revenue-section',
          position: { x: 70, y: 270 },
          data: {
            canvasId: 'test-bmc-financial',
            showDemo: true,
            width: 500,
            height: 150,
          },
          width: 500,
          height: 150,
          style: {},
          parentId: 'financial-section',
        },
      ],
      edges: [],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="w-screen h-screen bg-[#0a0f1a]">
      <div className="absolute top-4 left-4 z-50 bg-black/80 p-4 rounded-lg border border-white/10">
        <h1 className="text-white text-lg font-bold mb-2">BMC Financial Sections Test</h1>
        <p className="text-slate-400 text-sm mb-2">
          Testing integration of costs-section and revenue-section node types
        </p>
        <ul className="text-slate-400 text-xs space-y-1">
          <li>✓ Costs section with demo data</li>
          <li>✓ Revenue section with demo data</li>
          <li>✓ Proper z-index layering</li>
          <li>✓ Entity overlay compatibility</li>
        </ul>
      </div>
      
      <BMCCanvas flow={testFlow} initialEntities={[]} />
    </div>
  );
}
