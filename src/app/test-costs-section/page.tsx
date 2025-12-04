'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { CostsSection } from '@/components/canvas/sections/CostsSection';

/**
 * Test page for CostsSection component
 * 
 * Allows visual verification of the component in isolation
 */
export default function TestCostsSectionPage() {
  // Mock node props for testing
  const mockNodeProps = {
    id: 'test-costs-section',
    type: 'costs-section',
    position: { x: 0, y: 0 },
    data: {
      canvasId: 'test-canvas',
      showDemo: true,
      width: 500,
      height: 200,
    },
    selected: false,
    isConnectable: true,
    zIndex: 0,
    dragging: false,
    selectable: true,
    deletable: true,
    draggable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };

  return (
    <ReactFlowProvider>
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-200 mb-2">
              CostsSection Component Test
            </h1>
            <p className="text-slate-400 text-sm">
              Visual verification of the CostsSection component with demo data
            </p>
          </div>

          {/* Default Size (500x200) */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-300">
              Default Size (500px × 200px)
            </h2>
            <div className="inline-block">
              <CostsSection {...mockNodeProps} />
            </div>
          </div>

          {/* Larger Size */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-300">
              Larger Size (700px × 250px)
            </h2>
            <div className="inline-block">
              <CostsSection 
                {...mockNodeProps} 
                data={{
                  ...mockNodeProps.data,
                  width: 700,
                  height: 250,
                }}
              />
            </div>
          </div>

          {/* Component Features */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-300">
              Component Features
            </h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Horizontal 5x2 layout with three panels</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Left panel: Total costs ($177) with warning indicator and MoM change</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Center panel: Mini trend chart showing 6 months of cost history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Right panel: Category breakdown (API: $127, Infrastructure: $50, Team: $0)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Budget threshold indicator with progress bar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Demo mode toggle in top-right corner (click to switch between demo and live data)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Demo mode badge appears when demo data is active</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Amber color scheme matching Financial category</span>
              </li>
            </ul>
          </div>

          {/* Demo Data Details */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-300">
              Demo Data Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">API Costs</p>
                <p className="text-slate-200 font-medium">$127/month (72%)</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Infrastructure</p>
                <p className="text-slate-200 font-medium">$50/month (28%)</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Team Costs</p>
                <p className="text-slate-200 font-medium">$0/month (0%)</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Total</p>
                <p className="text-slate-200 font-medium">$177/month</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Budget Threshold</p>
                <p className="text-slate-200 font-medium">$200/month</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Threshold Usage</p>
                <p className="text-slate-200 font-medium">88.5%</p>
              </div>
            </div>
          </div>

          {/* Demo Mode Toggle Instructions */}
          <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-300">
              Demo Mode Toggle (Requirement 1.5)
            </h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Click the toggle switch in the top-right corner of each section to switch between demo and live data modes.
              </p>
              <ul className="space-y-1 ml-4 list-disc text-slate-400">
                <li>Toggle shows current mode (Demo/Live) with visual indicator</li>
                <li>Demo mode displays amber-colored toggle and "Demo Data" badge</li>
                <li>Live mode displays emerald-colored toggle (no badge)</li>
                <li>State is stored in local component state for smooth transitions</li>
                <li>Each section maintains its own demo mode preference independently</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
