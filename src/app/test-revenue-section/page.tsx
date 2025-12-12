'use client';

import { RevenueSection } from '@/components/canvas/sections';
import type { ComponentProps } from 'react';

/**
 * Test page for RevenueSection component
 * 
 * This page allows visual verification of the RevenueSection component
 * with demo data before integrating it into the BMC canvas.
 */
export default function TestRevenueSectionPage() {
  type RevenueSectionProps = ComponentProps<typeof RevenueSection>;

  // Mock node props for testing
  const mockNodeProps = {
    id: 'test-revenue-section',
    data: {
      canvasId: 'test-canvas-id',
      showDemo: true,
      width: 500,
      height: 200,
    },
    type: 'revenue-section',
    position: { x: 0, y: 0 },
    selected: false,
    dragging: false,
    isConnectable: false,
    // Provide reasonable defaults for other NodeProps fields that React Flow passes
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    selectable: true,
    deletable: false,
    draggable: false,
  } as unknown as RevenueSectionProps;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            RevenueSection Component Test
          </h1>
          <p className="text-slate-400">
            Visual verification of the RevenueSection component with demo data
          </p>
        </div>

        {/* Default Size */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Default Size (500px × 200px)
          </h2>
          <div className="inline-block">
            <RevenueSection {...mockNodeProps} />
          </div>
        </div>

        {/* Larger Size */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Larger Size (700px × 250px)
          </h2>
          <div className="inline-block">
            <RevenueSection 
              {...mockNodeProps}
              data={{
                ...mockNodeProps.data,
                width: 700,
                height: 250,
              }}
            />
          </div>
        </div>

        {/* Side by Side Comparison */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Multiple Instances
          </h2>
          <div className="flex gap-4 flex-wrap">
            <RevenueSection {...mockNodeProps} />
            <RevenueSection {...mockNodeProps} />
          </div>
        </div>

        {/* Component Features Checklist */}
        <div className="bg-slate-900 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">
            Visual Verification Checklist
          </h2>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Left Panel: MRR displayed prominently with growth indicator</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Left Panel: Customer count with user icon</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Left Panel: ARPU and LTV:CAC metrics displayed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Center Panel: Mini trend chart with historical and forecast data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Center Panel: Forecast shown as dashed line</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Right Panel: Plan breakdown with counts and percentages</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Demo mode toggle in top-right corner (click to switch between demo and live data)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Demo mode badge appears when demo data is active</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Emerald color scheme with glow effect</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Horizontal 5x2 layout (wide and short)</span>
            </div>
          </div>
        </div>

        {/* Requirements Coverage */}
        <div className="bg-slate-900 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">
            Requirements Coverage
          </h2>
          <div className="space-y-2 text-slate-300 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono">2.1</span>
              <span>Monthly Recurring Revenue (MRR) displayed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono">2.2</span>
              <span>Number of paying customers displayed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono">2.3</span>
              <span>Revenue breakdown by plan displayed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono">2.4</span>
              <span>Mini chart showing revenue trends with forecast</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono">2.5</span>
              <span>Growth indicator with percentage and direction arrow</span>
            </div>
          </div>
        </div>

        {/* Demo Mode Toggle Instructions */}
        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-emerald-300 mb-4">
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
              <li>When toggled to live mode, the section fetches real entity data from the database</li>
              <li>Smooth transition between modes without page reload</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
