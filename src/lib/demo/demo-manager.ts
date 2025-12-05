/**
 * Demo Manager
 * 
 * Manages demo sessions with idempotent cleanup and metadata tagging.
 * Ensures that starting a new demo cleans up previous demo entities.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { getAdminClient } from '@/lib/supabase/client';
import { startRun } from '@/lib/engine/edge-walker';

export interface DemoEntityConfig {
  name: string;
  startNodeId: string;
  avatarUrl?: string;
  email?: string;
  entityType?: 'lead' | 'customer' | 'churned';
}

export interface DemoConfig {
  canvasId: string;
  entities?: DemoEntityConfig[];
  staggerDelay?: number;
}

export interface DemoSession {
  sessionId: string;
  canvasId: string;
  entityIds: string[];
  runIds: string[];
}

export interface DemoEntityMetadata {
  source: 'demo';
  session_id: string;
  spawned_at: string;
}

/**
 * DemoManager class handles demo session lifecycle
 * 
 * Key features:
 * - Idempotent demo sessions (cleanup before creating new entities)
 * - Metadata tagging for demo entities
 * - Cleanup endpoint support
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class DemoManager {
  /**
   * Start a demo session with idempotent cleanup
   * 
   * Requirement 3.1: Check for existing demo entities
   * Requirement 3.2: Delete existing demo entities before creating new ones
   * Requirement 3.3: Tag new entities with demo metadata
   * 
   * @param config - Demo configuration
   * @returns Demo session information
   */
  async startDemo(config: DemoConfig): Promise<DemoSession> {
    const { canvasId, entities: entityConfigs, staggerDelay = 2000 } = config;

    // Validate canvas exists
    const _supabase = getAdminClient();
    const { data: canvas, error: canvasError } = await supabase
      .from('stitch_flows')
      .select('id, name, canvas_type')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      throw new Error('Canvas not found');
    }

    // Requirement 3.1 & 3.2: Clean up existing demo entities
    await this.cleanupDemoEntities(canvasId);

    // Create new demo session
    const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Default demo entities if none provided
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

    // Requirement 3.3: Spawn entities with metadata tagging
    const entityIds = await this.spawnEntities(
      canvasId,
      entitiesToSpawn,
      sessionId,
      staggerDelay
    );

    // Trigger workflows if applicable
    const runIds = await this.triggerWorkflows(
      canvasId,
      canvas.canvas_type,
      entityIds,
      sessionId
    );

    return {
      sessionId,
      canvasId,
      entityIds,
      runIds,
    };
  }

  /**
   * Clean up demo entities for a canvas
   * 
   * Requirement 3.2: Delete existing demo entities before creating new ones
   * 
   * @param canvasId - Canvas ID to clean up
   */
  private async cleanupDemoEntities(canvasId: string): Promise<void> {
    const _supabase = getAdminClient();

    // Query for existing demo entities (Requirement 3.1)
    const { data: existingEntities, error: queryError } = await supabase
      .from('stitch_entities')
      .select('id')
      .eq('canvas_id', canvasId)
      .eq('metadata->>source', 'demo');

    if (queryError) {
      console.error('Error querying demo entities:', queryError);
      // Continue anyway - we'll try to delete
    }

    if (existingEntities && existingEntities.length > 0) {
      console.log(`Cleaning up ${existingEntities.length} existing demo entities`);
    }

    // Delete existing demo entities (Requirement 3.2)
    const { error: deleteError } = await supabase
      .from('stitch_entities')
      .delete()
      .eq('canvas_id', canvasId)
      .eq('metadata->>source', 'demo');

    if (deleteError) {
      console.error('Error deleting demo entities:', deleteError);
      throw new Error('Failed to clean up existing demo entities');
    }
  }

  /**
   * Spawn demo entities with metadata tagging
   * 
   * Requirement 3.3: Tag entities with metadata indicating they are demo entities
   * 
   * @param canvasId - Canvas ID
   * @param entityConfigs - Entity configurations
   * @param sessionId - Demo session ID
   * @param staggerDelay - Delay between spawns in milliseconds
   * @returns Array of spawned entity IDs
   */
  private async spawnEntities(
    canvasId: string,
    entityConfigs: DemoEntityConfig[],
    sessionId: string,
    staggerDelay: number
  ): Promise<string[]> {
    const _supabase = getAdminClient();
    const entityIds: string[] = [];

    for (let i = 0; i < entityConfigs.length; i++) {
      const _config = entityConfigs[i];

      // Add delay between spawns (except for first entity)
      if (i > 0) {
        await this.delay(staggerDelay);
      }

      // Requirement 3.3: Create metadata for demo entity
      const metadata: DemoEntityMetadata = {
        source: 'demo',
        session_id: sessionId,
        spawned_at: new Date().toISOString(),
      };

      // Spawn entity with demo metadata
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
          metadata, // Requirement 3.3: Tag with demo metadata
        })
        .select()
        .single();

      if (entityError || !entity) {
        console.error(`Failed to spawn entity ${config.name}:`, entityError);
        continue;
      }

      entityIds.push(entity.id);
    }

    return entityIds;
  }

  /**
   * Trigger workflows for demo entities
   * 
   * @param canvasId - Canvas ID
   * @param canvasType - Canvas type
   * @param entityIds - Entity IDs to trigger workflows for
   * @param sessionId - Demo session ID
   * @returns Array of run IDs
   */
  private async triggerWorkflows(
    canvasId: string,
    canvasType: string,
    entityIds: string[],
    sessionId: string
  ): Promise<string[]> {
    const runIds: string[] = [];

    // Only trigger workflows for workflow-type canvases
    if (canvasType !== 'workflow') {
      return runIds;
    }

    for (const entityId of entityIds) {
      try {
        const run = await startRun(canvasId, {
          entityId,
          trigger: {
            type: 'manual',
            source: 'demo_mode',
            event_id: sessionId,
            timestamp: new Date().toISOString(),
          },
        });

        runIds.push(run.id);
      } catch (runError) {
        console.error(`Failed to trigger workflow for entity ${entityId}:`, runError);
        // Continue with other entities even if one fails
      }
    }

    return runIds;
  }

  /**
   * Clean up a specific demo session
   * 
   * Requirement 3.4: Provide cleanup endpoint for demo sessions
   * 
   * @param sessionId - Demo session ID to clean up
   * @returns Number of entities deleted
   */
  async cleanupSession(sessionId: string): Promise<number> {
    const _supabase = getAdminClient();

    // Query entities for this session
    const { data: entities, error: queryError } = await supabase
      .from('stitch_entities')
      .select('id')
      .eq('metadata->>session_id', sessionId)
      .eq('metadata->>source', 'demo');

    if (queryError) {
      console.error('Error querying session entities:', queryError);
      throw new Error('Failed to query demo session entities');
    }

    const entityCount = entities?.length || 0;

    // Delete entities for this session
    const { error: deleteError } = await supabase
      .from('stitch_entities')
      .delete()
      .eq('metadata->>session_id', sessionId)
      .eq('metadata->>source', 'demo');

    if (deleteError) {
      console.error('Error deleting session entities:', deleteError);
      throw new Error('Failed to clean up demo session');
    }

    return entityCount;
  }

  /**
   * Query entities with option to exclude demo entities
   * 
   * Requirement 3.5: Allow filtering to exclude demo entities
   * 
   * @param canvasId - Canvas ID
   * @param excludeDemo - Whether to exclude demo entities
   * @returns Array of entities
   */
  async queryEntities(canvasId: string, excludeDemo: boolean = false) {
    const _supabase = getAdminClient();

    let query = supabase
      .from('stitch_entities')
      .select('*')
      .eq('canvas_id', canvasId);

    // Requirement 3.5: Filter to exclude demo entities
    if (excludeDemo) {
      query = query.or('metadata->>source.neq.demo,metadata->>source.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error querying entities:', error);
      throw new Error('Failed to query entities');
    }

    return data || [];
  }

  /**
   * Helper function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
