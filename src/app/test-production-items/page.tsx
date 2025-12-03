'use client';

import { ReactFlow, Node, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IntegrationItem } from '@/components/canvas/items/IntegrationItem';
import { PersonItem } from '@/components/canvas/items/PersonItem';
import { CodeItem } from '@/components/canvas/items/CodeItem';
import { DataItem } from '@/components/canvas/items/DataItem';
import { useMemo } from 'react';

/**
 * Test page to verify production-side visual distinction
 * 
 * This page displays all four production-side item components in a canvas context
 * to verify:
 * - Consistent production-side styling
 * - Distinct color schemes (purple, orange, cyan, emerald)
 * - Consistent status indicator color mapping
 * - Visual distinction from customer-side components
 */
export default function TestProductionItemsPage() {
  const nodeTypes = useMemo(() => ({
    integration: IntegrationItem,
    person: PersonItem,
    code: CodeItem,
    data: DataItem,
  }), []);

  const nodes: Node[] = [
    // Integration Items (Purple/Indigo)
    {
      id: 'int-1',
      type: 'integration',
      position: { x: 50, y: 50 },
      data: {
        label: 'Claude API',
        status: 'connected',
        lastPing: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        usagePercent: 45,
      },
    },
    {
      id: 'int-2',
      type: 'integration',
      position: { x: 250, y: 50 },
      data: {
        label: 'Supabase',
        status: 'disconnected',
        lastPing: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
    },
    {
      id: 'int-3',
      type: 'integration',
      position: { x: 450, y: 50 },
      data: {
        label: 'Shotstack',
        status: 'error',
        lastPing: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        usagePercent: 85,
      },
    },

    // Person Items (Orange/Warm)
    {
      id: 'person-1',
      type: 'person',
      position: { x: 50, y: 200 },
      data: {
        label: 'Sarah Chen',
        role: 'Founder',
        status: 'online',
        type: 'human',
      },
    },
    {
      id: 'person-2',
      type: 'person',
      position: { x: 250, y: 200 },
      data: {
        label: 'AI Assistant',
        role: 'Support Agent',
        status: 'busy',
        type: 'ai',
      },
    },
    {
      id: 'person-3',
      type: 'person',
      position: { x: 450, y: 200 },
      data: {
        label: 'John Doe',
        role: 'Developer',
        status: 'offline',
        type: 'human',
      },
    },

    // Code Items (Blue/Cyan)
    {
      id: 'code-1',
      type: 'code',
      position: { x: 50, y: 350 },
      data: {
        label: 'Web App',
        status: 'deployed',
        lastDeploy: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        repoUrl: 'https://github.com/example/web-app',
        deploymentUrl: 'https://app.example.com',
      },
    },
    {
      id: 'code-2',
      type: 'code',
      position: { x: 250, y: 350 },
      data: {
        label: 'API Server',
        status: 'building',
        lastDeploy: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      },
    },
    {
      id: 'code-3',
      type: 'code',
      position: { x: 450, y: 350 },
      data: {
        label: 'Worker Service',
        status: 'failed',
        lastDeploy: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        repoUrl: 'https://github.com/example/worker',
      },
    },

    // Data Items (Green/Emerald)
    {
      id: 'data-1',
      type: 'data',
      position: { x: 50, y: 500 },
      data: {
        label: 'Customer DB',
        type: 'database',
        recordCount: 1234,
        lastSync: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        status: 'operational',
      },
    },
    {
      id: 'data-2',
      type: 'data',
      position: { x: 250, y: 500 },
      data: {
        label: 'Sales Sheet',
        type: 'spreadsheet',
        recordCount: 567890,
        lastSync: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        status: 'operational',
      },
    },
    {
      id: 'data-3',
      type: 'data',
      position: { x: 450, y: 500 },
      data: {
        label: 'Analytics',
        type: 'chart',
        recordCount: 42,
        lastSync: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'error',
      },
    },
  ];

  return (
    <div className="w-screen h-screen bg-[#0a0f1a]">
      <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-md">
        <h1 className="text-xl font-bold text-white mb-2">Production-Side Items Test</h1>
        <p className="text-sm text-slate-300 mb-3">
          Verifying visual distinction and consistency across all four production-side components.
        </p>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Integration Items (Purple/Indigo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Person Items (Orange/Warm)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span>Code Items (Blue/Cyan)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>Data Items (Green/Emerald)</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 font-semibold mb-1">Status Colors:</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Success</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Error</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span>Inactive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Busy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Building</span>
            </div>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={24} size={1} />
        <Controls className="bg-white/10 border-white/10 fill-white text-white" />
      </ReactFlow>
    </div>
  );
}
