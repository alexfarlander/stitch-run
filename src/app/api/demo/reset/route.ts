/**
 * Demo Reset API Endpoint
 * 
 * Resets the Clockwork Canvas demo to a BLANK STATE:
 * 1. Hides all entities (sets current_node_id and current_edge_id to null)
 * 2. Resets entity types to 'lead'
 * 3. Resets financial metrics to zero
 * 
 * This creates a clean slate for the demo - no entities visible until
 * the demo starts and they "arrive" from marketing sources.
 * 
 * Requirements: 6.3, 9.5
 */

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/client';
import { resetFinancialMetrics } from '@/lib/metrics/financial-updates';

/**
 * POST /api/demo/reset
 * 
 * Resets the demo to a blank state - all entities hidden.
 * 
 * Requirement 6.3: Reset all entities (hide them)
 * Requirement 9.5: Reset financial metrics to initial values
 * 
 * @returns Success response with reset counts
 */
export async function POST() {
  try {
    const supabase = getAdminClient();
    
    console.log('Resetting Clockwork Canvas demo to blank state...');
    
    // Get the BMC canvas ID
    const { data: bmcList, error: bmcError } = await supabase
      .from('stitch_flows')
      .select('id')
      .eq('canvas_type', 'bmc')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (bmcError || !bmcList || bmcList.length === 0) {
      console.error('Failed to find BMC canvas:', bmcError);
      return NextResponse.json(
        { error: 'BMC canvas not found' },
        { status: 404 }
      );
    }
    
    const canvasId = bmcList[0].id;
    
    // Hide ALL entities by setting their position to null
    // This creates a blank slate - no entities visible
    const { data: updatedEntities, error: updateError } = await supabase
      .from('stitch_entities')
      .update({
        current_node_id: null,
        current_edge_id: null,
        edge_progress: null,
        destination_node_id: null,
        entity_type: 'lead', // Reset all to leads
      })
      .eq('canvas_id', canvasId)
      .select('id');
    
    if (updateError) {
      console.error('Failed to reset entities:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset entities', details: updateError.message },
        { status: 500 }
      );
    }
    
    const entitiesReset = updatedEntities?.length || 0;
    console.log(`Reset ${entitiesReset} entities to hidden state`);
    
    // Requirement 9.5: Reset financial metrics to initial values
    await resetFinancialMetrics();
    console.log('Financial metrics reset to initial values');
    
    return NextResponse.json({
      success: true,
      message: 'Demo reset to blank state',
      entities_hidden: entitiesReset,
      financial_metrics_reset: true,
    });
    
  } catch (error) {
    console.error('Failed to reset demo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset demo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
