/**
 * Demo Mode API Endpoint
 * Spawns demo entities and triggers workflows with staggered delays
 * 
 * Requirements: 6.1, 6.2, 6.3, 13.1, 13.2, 13.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/client';
import { startRun } from '@/lib/engine/edge-walker';

interface DemoEntityConfig {
  name: string;
  startNodeId: string;
  avatarUrl?: string;
  email?: string;
  entityType?: 'lead' | 'customer' | 'churned';
}

interface StartDemoRequest {
  canvasId: string;
  entities?: DemoEntityConfig[];
  staggerDelay?: number; // milliseconds between entity spawns
}

interface StartDemoResponse {
  sessionId: string;
  status: 'running';
  entities: Array<{
    id: string;
    name: string;
    nodeId: string;
  }>;
  runs: Array<{
    entityId: string;
    runId: string;
  }>;
}

/**
 * POST /api/demo/start
 * 
 * Starts a demo session by:
 * 1. Spawning demo entities at specified nodes
 * 2. Triggering workflows for each entity with staggered delays
 * 3. Returning session info
 * 
 * Requirements: 6.1, 6.2, 6.3, 13.1, 13.2, 13.3
 */
export async function POST(request: NextRequest) {
  try {
    const body: StartDemoRequest = await request.json();
    const { canvasId, entities: entityConfigs, staggerDelay = 2000 } = body;

    // Validate required fields (Requirement 13.1)
    if (!canvasId) {
      return NextResponse.json(
        { error: 'canvasId is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Verify canvas exists
    const { data: canvas, error: canvasError } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Default demo entities if none provided (Requirement 13.2)
    const defaultEntities: DemoEntityConfig[] = [
      {
        name: 'Monica',
        startNodeId: 'item-linkedin-ads',
        email: 'monica@demo.stitch.run',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=monica',
        entityType: 'lead',
      },
      {
        name: 'Ross',
        startNodeId: 'item-demo-call',
        email: 'ross@demo.stitch.run',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ross',
        entityType: 'lead',
      },
      {
        name: 'Rachel',
        startNodeId: 'item-free-trial',
        email: 'rachel@demo.stitch.run',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
        entityType: 'lead',
      },
    ];

    const entitiesToSpawn = entityConfigs && entityConfigs.length > 0 
      ? entityConfigs 
      : defaultEntities;

    // Create demo session ID (Requirement 13.3)
    const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const spawnedEntities: Array<{ id: string; name: string; nodeId: string }> = [];
    const triggeredRuns: Array<{ entityId: string; runId: string }> = [];

    // Spawn entities with staggered delays (Requirements 6.2, 6.3)
    for (let i = 0; i < entitiesToSpawn.length; i++) {
      const config = entitiesToSpawn[i];

      // Add delay between spawns (except for first entity)
      if (i > 0) {
        await delay(staggerDelay);
      }

      // Spawn entity (Requirement 6.2)
      const { data: entity, error: entityError } = await supabase
        .from('stitch_entities')
        .insert({
          canvas_id: canvasId,
          name: config.name,
          email: config.email || `${config.name.toLowerCase()}@demo.stitch.run`,
          avatar_url: config.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.name.toLowerCase()}`,
          entity_type: config.entityType || 'lead',
          current_node_id: config.startNodeId,
          journey: [
            {
              type: 'entered_node',
              node_id: config.startNodeId,
              timestamp: new Date().toISOString(),
              metadata: {
                source: 'demo',
                session_id: sessionId,
              },
            },
          ],
          metadata: {
            source: 'demo',
            session_id: sessionId,
          },
        })
        .select()
        .single();

      if (entityError || !entity) {
        console.error(`Failed to spawn entity ${config.name}:`, entityError);
        continue;
      }

      spawnedEntities.push({
        id: entity.id,
        name: entity.name,
        nodeId: config.startNodeId,
      });

      // Trigger workflow for this entity (Requirement 6.3)
      // Note: For BMC canvases, workflows are typically triggered when entities
      // move between nodes. For demo purposes, we spawn entities at their starting
      // positions and let the user manually trigger workflows or wait for automated
      // triggers based on the canvas configuration.
      // 
      // If the canvas has executable workflows (canvas_type === 'workflow'),
      // we can trigger them here:
      if (canvas.canvas_type === 'workflow') {
        try {
          const run = await startRun(canvasId, {
            entityId: entity.id,
            trigger: {
              type: 'demo',
              source: 'demo_mode',
              event_id: sessionId,
              timestamp: new Date().toISOString(),
            },
          });

          triggeredRuns.push({
            entityId: entity.id,
            runId: run.id,
          });
        } catch (runError) {
          console.error(`Failed to trigger workflow for entity ${config.name}:`, runError);
          // Continue with other entities even if one fails
        }
      }
    }

    // Return demo session info (Requirement 13.3)
    const response: StartDemoResponse = {
      sessionId,
      status: 'running',
      entities: spawnedEntities,
      runs: triggeredRuns,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Demo mode error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start demo mode',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
