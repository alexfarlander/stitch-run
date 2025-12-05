/**
 * Demo Reset API Endpoint
 * 
 * Resets the Clockwork Canvas demo to its initial state by:
 * 1. Restoring all entities to their initial positions from CLOCKWORK_ENTITIES
 * 2. Resetting financial metrics to their initial values
 * 
 * This allows the demo to be replayed multiple times without manual cleanup.
 * 
 * Requirements: 6.3, 9.5
 */

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/client';
import { CLOCKWORK_ENTITIES } from '@/lib/seeds/clockwork-entities';
import { resetFinancialMetrics } from '@/lib/metrics/financial-updates';

/**
 * POST /api/demo/reset
 * 
 * Resets the demo to its initial state.
 * 
 * Requirement 6.3: Reset all entities to initial positions
 * Requirement 9.5: Reset financial metrics to initial values
 * 
 * @returns Success response with reset counts
 */
export async function POST() {
  try {
    const supabase = getAdminClient();
    
    console.log('Resetting Clockwork Canvas demo...');
    
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
    
    // Requirement 6.3: Reset all entities to initial positions from CLOCKWORK_ENTITIES
    let entitiesReset = 0;
    let entitiesNotFound = 0;
    
    for (const entitySeed of CLOCKWORK_ENTITIES) {
      const updateData: any = {
        entity_type: entitySeed.entity_type,
        current_node_id: entitySeed.current_node_id || null,
        current_edge_id: entitySeed.current_edge_id || null,
        edge_progress: entitySeed.edge_progress || null,
      };
      
      // Update entity by email
      const { data: updatedEntity, error: updateError } = await supabase
        .from('stitch_entities')
        .update(updateData)
        .eq('canvas_id', canvasId)
        .eq('email', entitySeed.email)
        .select();
      
      if (updateError) {
        console.error(`Failed to reset entity ${entitySeed.name}:`, updateError);
        entitiesNotFound++;
      } else if (updatedEntity && updatedEntity.length > 0) {
        console.log(`Reset entity: ${entitySeed.name} -> ${entitySeed.current_node_id || entitySeed.current_edge_id}`);
        entitiesReset++;
      } else {
        console.warn(`Entity not found: ${entitySeed.name} (${entitySeed.email})`);
        entitiesNotFound++;
      }
    }
    
    // Requirement 9.5: Reset financial metrics to initial values
    await resetFinancialMetrics();
    console.log('Financial metrics reset to initial values');
    
    return NextResponse.json({
      success: true,
      message: 'Demo reset successfully',
      entities_reset: entitiesReset,
      entities_not_found: entitiesNotFound,
      total_entities: CLOCKWORK_ENTITIES.length,
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
