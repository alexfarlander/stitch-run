/**
 * GET /api/stitch/status/[runId]
 * Returns the current state of a run for visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { StitchRun } from '@/types/stitch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const supabase = createServerClient();

  const { data: run, error } = await supabase
    .from('stitch_runs')
    .select('*')
    .eq('id', runId)
    .single<StitchRun>();

  if (error || !run) {
    return NextResponse.json(
      { error: 'Run not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(run);
}
