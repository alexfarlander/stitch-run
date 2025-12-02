/**
 * Run Visualization Page
 * Shows the live execution of a Stitch flow
 */

import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { StitchFlow } from '@/types/stitch';
import { RunCanvas } from './RunCanvas';

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function RunPage({ params }: PageProps) {
  const { runId } = await params;
  const supabase = createServerClient();

  // Fetch the run
  const { data: run, error: runError } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('id', runId)
    .single();

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

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {flow.name}
            </h1>
            <p className="text-sm text-slate-400 font-mono mt-1">
              Run ID: {runId}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Started: {new Date(run.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <RunCanvas runId={runId} flow={flow} />
      </div>
    </div>
  );
}
