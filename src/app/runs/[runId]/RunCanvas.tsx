/**
 * RunCanvas - Client component that wraps StitchCanvas with real-time updates
 */

'use client';

import { StitchCanvas } from '@/components/canvas';
import { useRealtimeRun } from '@/hooks/useRealtimeRun';
import { StitchFlow } from '@/types/stitch';
import { Loader2 } from 'lucide-react';

interface RunCanvasProps {
  runId: string;
  flow: StitchFlow;
}

export function RunCanvas({ runId, flow }: RunCanvasProps) {
  const { run, loading, error } = useRealtimeRun(runId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">Error loading run</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return <StitchCanvas flow={flow} run={run || undefined} />;
}
