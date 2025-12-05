'use client';

import { ReactFlow, Node, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FinancialItemNode } from '@/components/canvas/nodes/FinancialItemNode';
import { SectionItemNode } from '@/components/canvas/nodes/SectionItemNode';

/**
 * Test page for Financial Item Nodes
 * 
 * Demonstrates the financial value display with formatted currency
 */

const nodeTypes = {
  'financial-item': FinancialItemNode,
  'section-item': SectionItemNode,
};

const testNodes: Node[] = [
  // Financial nodes (Revenue)
  {
    id: 'mrr',
    type: 'financial-item',
    position: { x: 50, y: 50 },
    data: {
      label: 'MRR',
      icon: 'DollarSign',
      status: 'active',
      itemType: 'financial',
      value: 12450, // $124.50 -> displays as $125
      currency: 'USD',
      format: 'currency',
    },
  },
  {
    id: 'arr',
    type: 'financial-item',
    position: { x: 200, y: 50 },
    data: {
      label: 'ARR',
      icon: 'TrendingUp',
      status: 'active',
      itemType: 'financial',
      value: 149400, // $1,494
      currency: 'USD',
      format: 'currency',
    },
  },
  {
    id: 'ltv',
    type: 'financial-item',
    position: { x: 350, y: 50 },
    data: {
      label: 'LTV',
      icon: 'Target',
      status: 'idle',
      itemType: 'financial',
      value: 5000, // $50
      currency: 'USD',
      format: 'currency',
    },
  },
  
  // Financial nodes (Costs)
  {
    id: 'stripe-fees',
    type: 'financial-item',
    position: { x: 50, y: 150 },
    data: {
      label: 'Stripe Fees',
      icon: 'CreditCard',
      status: 'active',
      itemType: 'financial',
      value: 361, // $3.61 -> displays as $4
      currency: 'USD',
      format: 'currency',
    },
  },
  {
    id: 'claude-cost',
    type: 'financial-item',
    position: { x: 200, y: 150 },
    data: {
      label: 'Claude API',
      icon: 'Cpu',
      status: 'running',
      itemType: 'financial',
      value: 150, // $1.50 -> displays as $2
      currency: 'USD',
      format: 'currency',
    },
  },
  {
    id: 'elevenlabs-cost',
    type: 'financial-item',
    position: { x: 350, y: 150 },
    data: {
      label: 'ElevenLabs',
      icon: 'Mic',
      status: 'idle',
      itemType: 'financial',
      value: 75, // $0.75 -> displays as $1
      currency: 'USD',
      format: 'currency',
    },
  },
  
  // Regular item for comparison
  {
    id: 'regular-item',
    type: 'section-item',
    position: { x: 50, y: 250 },
    data: {
      label: 'Regular Item',
      icon: 'Package',
      status: 'idle',
      itemType: 'worker',
    },
  },
];

export default function TestFinancialNodesPage() {
  return (
    <div className="w-screen h-screen bg-slate-950">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-md">
        <h1 className="text-white text-lg font-bold mb-2">Financial Node Display Test</h1>
        <p className="text-slate-400 text-sm mb-2">
          Testing financial item nodes with formatted currency values
        </p>
        <ul className="text-slate-400 text-xs space-y-1">
          <li>✅ Values stored in cents, displayed as dollars</li>
          <li>✅ Formatted with commas (e.g., $1,494)</li>
          <li>✅ Rounded to nearest dollar (no decimals)</li>
          <li>✅ Emerald color scheme for financial nodes</li>
          <li>✅ Real-time updates when values change</li>
        </ul>
        
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-slate-300 text-xs font-semibold mb-1">Test Values:</p>
          <ul className="text-slate-400 text-xs space-y-0.5">
            <li>MRR: 12450¢ → $125</li>
            <li>ARR: 149400¢ → $1,494</li>
            <li>LTV: 5000¢ → $50</li>
            <li>Stripe: 361¢ → $4</li>
            <li>Claude: 150¢ → $2</li>
            <li>ElevenLabs: 75¢ → $1</li>
          </ul>
        </div>
      </div>
      
      <ReactFlow
        nodes={testNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
