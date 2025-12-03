/**
 * Test page to verify canvas components work
 */

'use client';

import { StitchCanvas } from '@/components/canvas';
import { StitchFlow, StitchRun } from '@/types/stitch';

// Mock flow for testing
const mockFlow: StitchFlow = {
  id: 'test-flow',
  name: 'Test Flow',
  canvas_type: 'workflow',
  parent_id: null,
  graph: {
    nodes: [
      {
        id: 'start',
        type: 'Worker',
        position: { x: 100, y: 100 },
        data: { label: 'Start Worker' },
      },
      {
        id: 'splitter',
        type: 'Splitter',
        position: { x: 100, y: 250 },
        data: { label: 'Split Data', arrayPath: 'items' },
      },
      {
        id: 'worker',
        type: 'Worker',
        position: { x: 100, y: 400 },
        data: { label: 'Process Item' },
      },
      {
        id: 'collector',
        type: 'Collector',
        position: { x: 100, y: 550 },
        data: { label: 'Collect Results' },
      },
      {
        id: 'end',
        type: 'Worker',
        position: { x: 100, y: 700 },
        data: { label: 'Final Worker' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'splitter' },
      { id: 'e2', source: 'splitter', target: 'worker' },
      { id: 'e3', source: 'worker', target: 'collector' },
      { id: 'e4', source: 'collector', target: 'end' },
    ],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock run with various states
const mockRun: StitchRun = {
  id: 'test-run',
  flow_id: 'test-flow',
  entity_id: null,
  trigger: {
    type: 'manual',
    source: null,
    event_id: null,
    timestamp: new Date().toISOString(),
  },
  node_states: {
    start: { status: 'completed', output: { data: 'test' } },
    splitter: { status: 'completed', output: { items: [1, 2, 3] } },
    worker_0: { status: 'completed', output: { result: 'done' } },
    worker_1: { status: 'running' },
    worker_2: { status: 'pending' },
    collector: { status: 'running' },
    end: { status: 'pending' },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function TestCanvasPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">
          Stitch Canvas Test
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Testing the Frankenstein&apos;s Lab aesthetic
        </p>
      </div>
      <div className="flex-1">
        <StitchCanvas flow={mockFlow} run={mockRun} />
      </div>
    </div>
  );
}
