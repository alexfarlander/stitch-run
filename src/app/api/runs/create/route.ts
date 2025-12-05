import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { flowId } = await request.json();

    if (!flowId) {
      return NextResponse.json(
        { error: 'flowId is required' },
        { status: 400 }
      );
    }

    const _supabase = createServerClient();

    // Create a new run
    const { data: run, error } = await supabase
      .from('stitch_runs')
      .insert({
        flow_id: flowId,
        node_states: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create run:', error);
      return NextResponse.json(
        { error: 'Failed to create run' },
        { status: 500 }
      );
    }

    return NextResponse.json({ runId: run.id });
  } catch (_error) {
    console.error('Error creating run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
