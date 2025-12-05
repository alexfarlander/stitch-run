'use client';

import { DemoControlPanel } from '@/components/canvas/DemoControlPanel';

/**
 * Test Page: Demo Control Panel
 * 
 * Visual test page to verify the DemoControlPanel component renders correctly
 * and all interactions work as expected.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export default function TestDemoControlPanelPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Demo Control Panel Test</h1>
          <p className="text-slate-400">
            Testing the DemoControlPanel component for the Clockwork Canvas demo orchestrator.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Component Features</h2>
          <ul className="space-y-2 text-slate-300">
            <li>✅ Play button to start demo sequence</li>
            <li>✅ Reset button to restore initial state</li>
            <li>✅ "Demo running..." status indicator</li>
            <li>✅ Disabled state while demo is running</li>
            <li>✅ Fixed positioning at bottom-left</li>
            <li>✅ Calls /api/demo/start and /api/demo/reset</li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Visual Test</h2>
          <p className="text-slate-400">
            The Demo Control Panel should appear at the bottom-left of this container.
            Try clicking the Play and Reset buttons to test the interactions.
          </p>
          
          {/* Container to simulate canvas */}
          <div className="relative bg-slate-800 border border-slate-600 rounded-lg h-96 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <p>Canvas Area (Demo Control Panel should be at bottom-left)</p>
            </div>
            
            {/* Demo Control Panel */}
            <DemoControlPanel />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Requirements Coverage</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-cyan-400">Requirement 6.1:</strong>
              <p className="text-slate-400">Play button executes demo script</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 6.2:</strong>
              <p className="text-slate-400">Shows "Demo running..." status</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 6.3:</strong>
              <p className="text-slate-400">Reset button restores entities</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 6.5:</strong>
              <p className="text-slate-400">Demo can be replayed</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 14.1:</strong>
              <p className="text-slate-400">Display Play and Reset buttons</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 14.2:</strong>
              <p className="text-slate-400">Disable Play while running</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 14.3:</strong>
              <p className="text-slate-400">Reset calls API endpoint</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 14.4:</strong>
              <p className="text-slate-400">Re-enable Play after completion</p>
            </div>
            <div>
              <strong className="text-cyan-400">Requirement 14.5:</strong>
              <p className="text-slate-400">Fixed position, no obstruction</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6">
          <h3 className="text-amber-400 font-semibold mb-2">⚠️ Note</h3>
          <p className="text-slate-300">
            The API endpoints (/api/demo/start and /api/demo/reset) must be implemented
            for the buttons to work correctly. Check the browser console for any errors.
          </p>
        </div>
      </div>
    </div>
  );
}
