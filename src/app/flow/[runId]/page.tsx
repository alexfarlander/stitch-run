/**
 * Flow Execution Page
 * Real-time visualization of a running flow with human-in-the-loop support
 */

import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { StitchFlow, StitchRun } from '@/types/stitch';
import { RunViewer } from '@/components/RunViewer';
import { FlowLayout } from '@/components/FlowLayout';
import { Clock, Zap } from 'lucide-react';

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function FlowPage({ params }: PageProps) {
  const { runId } = await params;
  const supabase = createServerClient();

  // Fetch the run
  const { data: run, error: runError } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('id', runId)
    .single<StitchRun>();

  if (runError || !run) {
    notFound();
  }

  // Fetch the associated flow
  const { data: flow, error: flowError } = await supabase
    .from('stitch_flows')
    .select('*')
    .eq('id', run.flow_id)
    .single<StitchFlow>();

  if (flowError || !flow) {
    notFound();
  }

  // Calculate run statistics
  const nodeStates = Object.values(run.node_states);
  const completedCount = nodeStates.filter((s) => s.status === 'completed').length;
  const failedCount = nodeStates.filter((s) => s.status === 'failed').length;
  const runningCount = nodeStates.filter((s) => s.status === 'running').length;
  const waitingCount = nodeStates.filter((s) => s.status === 'waiting_for_user').length;

  return (
    <FlowLayout>
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-500" />
              {flow.name}
            </h1>
            <p className="text-sm text-slate-400 font-mono mt-1">
              Run ID: {runId}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Started:</span>
              <span className="text-white font-mono">
                {new Date(run.created_at).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm font-mono">
              {completedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00ff99]" />
                  <span className="text-[#00ff99]">{completedCount} completed</span>
                </div>
              )}
              {runningCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-400">{runningCount} running</span>
                </div>
              )}
              {waitingCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-400">{waitingCount} waiting</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-400">{failedCount} failed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <RunViewer initialRun={run} flow={flow} />
      </div>
    </FlowLayout>
  );
}
