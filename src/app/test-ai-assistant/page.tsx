'use client';

import { AIAssistantPanel } from '@/components/panels/AIAssistantPanel';

export default function TestAIAssistantPage() {
  const handleGraphUpdate = (graph: { nodes: unknown[]; edges: unknown[] }) => {
    console.log('Graph update received:', graph);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">
          AI Assistant Panel Test
        </h1>
        <p className="text-gray-400 mb-8">
          Click the chat icon in the bottom-right corner to open the AI Assistant panel.
        </p>
        
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Instructions</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✓ Chat icon should appear in bottom-right corner</li>
            <li>✓ Clicking icon should open/close the chat panel</li>
            <li>✓ Panel should display above the toggle button</li>
            <li>✓ Message history should be scrollable</li>
            <li>✓ Input field should accept text</li>
            <li>✓ Send button should be enabled when text is entered</li>
            <li>✓ Press Enter to send message</li>
            <li>✓ Loading state should show while processing</li>
          </ul>
        </div>
      </div>

      <AIAssistantPanel 
        canvasId="test-canvas-id" 
        onGraphUpdate={handleGraphUpdate}
      />
    </div>
  );
}
