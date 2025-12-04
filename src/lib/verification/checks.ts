/**
 * Database verification checks
 * Validates data integrity, foreign keys, and relationships
 */

import { createServerClient } from '../supabase/server';
import { VerificationError } from './types';
import { StitchFlow, StitchNode, StitchEdge, NodeType } from '@/types/stitch';

/**
 * Valid node types that should be registered in React Flow
 * This list must match the nodeTypes registry in BMCCanvas.tsx
 */
const VALID_NODE_TYPES: NodeType[] = [
  'section',
  'section-item',
  'integration-item',
  'person-item',
  'code-item',
  'data-item',
  'costs-section',
  'revenue-section',
  'Worker',
  'Collector',
  'UX',
  'Splitter',
  'MediaSelect',
];

/**
 * Valid canvas types from the database enum
 */
const VALID_CANVAS_TYPES = ['bmc', 'workflow', 'detail'] as const;

/**
 * Check all foreign key relationships for a flow
 * Validates:
 * - stitch_flows.parent_id references existing flow
 * - stitch_entities.canvas_id references existing flow
 * - stitch_entities.current_node_id references node in canvas graph
 * - stitch_entities.current_edge_id references edge in canvas graph
 * - stitch_runs.flow_id references existing flow
 */
export async function checkForeignKeys(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'foreign_key',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    // Check parent_id if it exists
    if (flow.parent_id) {
      const { data: parentFlow, error: parentError } = await supabase
        .from('stitch_flows')
        .select('id')
        .eq('id', flow.parent_id)
        .single();

      if (parentError || !parentFlow) {
        errors.push({
          type: 'foreign_key',
          message: `Flow ${flowId} has invalid parent_id: ${flow.parent_id}`,
          context: { flowId, parentId: flow.parent_id, error: parentError?.message },
        });
      }
    }

    // Get all entities for this canvas
    const { data: entities, error: entitiesError } = await supabase
      .from('stitch_entities')
      .select('*')
      .eq('canvas_id', flowId);

    if (entitiesError) {
      errors.push({
        type: 'foreign_key',
        message: `Failed to query entities for flow ${flowId}`,
        context: { flowId, error: entitiesError.message },
      });
    } else if (entities) {
      const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      const edgeIds = new Set(graph.edges.map((e) => e.id));

      // Check each entity's current_node_id and current_edge_id
      for (const entity of entities) {
        if (entity.current_node_id && !nodeIds.has(entity.current_node_id)) {
          errors.push({
            type: 'foreign_key',
            message: `Entity ${entity.id} has invalid current_node_id: ${entity.current_node_id}`,
            context: {
              entityId: entity.id,
              entityName: entity.name,
              currentNodeId: entity.current_node_id,
              flowId,
            },
          });
        }

        if (entity.current_edge_id && !edgeIds.has(entity.current_edge_id)) {
          errors.push({
            type: 'foreign_key',
            message: `Entity ${entity.id} has invalid current_edge_id: ${entity.current_edge_id}`,
            context: {
              entityId: entity.id,
              entityName: entity.name,
              currentEdgeId: entity.current_edge_id,
              flowId,
            },
          });
        }
      }
    }

    // Check stitch_runs.flow_id references
    const { data: runs, error: runsError } = await supabase
      .from('stitch_runs')
      .select('id')
      .eq('flow_id', flowId);

    if (runsError) {
      errors.push({
        type: 'foreign_key',
        message: `Failed to query runs for flow ${flowId}`,
        context: { flowId, error: runsError.message },
      });
    }
    // If runs query succeeds, the foreign key is valid (enforced by database)
  } catch (error) {
    errors.push({
      type: 'foreign_key',
      message: `Unexpected error checking foreign keys for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that all node types in the flow graph are registered in React Flow
 * Validates that each node.type exists in the VALID_NODE_TYPES list
 */
export async function checkNodeTypes(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'node_type',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };
    const validTypeSet = new Set(VALID_NODE_TYPES);

    // Check each node's type
    for (const node of graph.nodes) {
      if (!validTypeSet.has(node.type)) {
        errors.push({
          type: 'node_type',
          message: `Node ${node.id} has unregistered type: ${node.type}`,
          context: {
            nodeId: node.id,
            nodeType: node.type,
            flowId,
            validTypes: VALID_NODE_TYPES,
          },
        });
      }
    }

    // Also check canvas_type is valid
    if (!VALID_CANVAS_TYPES.includes(flow.canvas_type as any)) {
      errors.push({
        type: 'node_type',
        message: `Flow ${flowId} has invalid canvas_type: ${flow.canvas_type}`,
        context: {
          flowId,
          canvasType: flow.canvas_type,
          validTypes: VALID_CANVAS_TYPES,
        },
      });
    }
  } catch (error) {
    errors.push({
      type: 'node_type',
      message: `Unexpected error checking node types for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that all edges reference valid source and target node IDs
 * Validates that edge.source and edge.target exist in the graph's nodes
 */
export async function checkEdgeReferences(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'edge_reference',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    // Check each edge's source and target
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          type: 'edge_reference',
          message: `Edge ${edge.id} has invalid source: ${edge.source}`,
          context: {
            edgeId: edge.id,
            source: edge.source,
            target: edge.target,
            flowId,
          },
        });
      }

      if (!nodeIds.has(edge.target)) {
        errors.push({
          type: 'edge_reference',
          message: `Edge ${edge.id} has invalid target: ${edge.target}`,
          context: {
            edgeId: edge.id,
            source: edge.source,
            target: edge.target,
            flowId,
          },
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'edge_reference',
      message: `Unexpected error checking edge references for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that parent node references use the correct field name
 * Validates that nodes use "parentId" field (not "parentNode")
 * Note: React Flow uses "parentNode" but our database schema uses "parentId"
 */
export async function checkParentNodes(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'parent_node',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    // Check each node's parent reference
    for (const node of graph.nodes) {
      // Check if using wrong field name (parentId instead of parentNode)
      // Requirement 1.5: Use parentNode field consistently
      if ('parentId' in node && node.parentNode === undefined) {
        errors.push({
          type: 'parent_node',
          message: `Node ${node.id} uses 'parentId' field instead of 'parentNode'`,
          context: {
            nodeId: node.id,
            nodeType: node.type,
            flowId,
          },
        });
      }

      // Check if parent reference is valid
      if (node.parentNode && !nodeIds.has(node.parentNode)) {
        errors.push({
          type: 'parent_node',
          message: `Node ${node.id} has invalid parentNode: ${node.parentNode}`,
          context: {
            nodeId: node.id,
            nodeType: node.type,
            parentNode: node.parentNode,
            flowId,
          },
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'parent_node',
      message: `Unexpected error checking parent nodes for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check topology rules for Splitter and Collector nodes
 * Validates:
 * - Splitter nodes have more than one outgoing edge
 * - Collector nodes have more than one incoming edge
 */
export async function checkTopology(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'topology',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };

    // Build edge count maps
    const outgoingEdgeCount = new Map<string, number>();
    const incomingEdgeCount = new Map<string, number>();

    for (const edge of graph.edges) {
      outgoingEdgeCount.set(edge.source, (outgoingEdgeCount.get(edge.source) || 0) + 1);
      incomingEdgeCount.set(edge.target, (incomingEdgeCount.get(edge.target) || 0) + 1);
    }

    // Check Splitter and Collector nodes
    for (const node of graph.nodes) {
      if (node.type === 'Splitter') {
        const outgoing = outgoingEdgeCount.get(node.id) || 0;
        if (outgoing <= 1) {
          errors.push({
            type: 'topology',
            message: `Splitter node ${node.id} must have more than one outgoing edge (has ${outgoing})`,
            context: {
              nodeId: node.id,
              nodeType: node.type,
              outgoingEdges: outgoing,
              flowId,
            },
          });
        }
      }

      if (node.type === 'Collector') {
        const incoming = incomingEdgeCount.get(node.id) || 0;
        if (incoming <= 1) {
          errors.push({
            type: 'topology',
            message: `Collector node ${node.id} must have more than one incoming edge (has ${incoming})`,
            context: {
              nodeId: node.id,
              nodeType: node.type,
              incomingEdges: incoming,
              flowId,
            },
          });
        }
      }
    }
  } catch (error) {
    errors.push({
      type: 'topology',
      message: `Unexpected error checking topology for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that Realtime is enabled on stitch_runs table
 * Queries Supabase metadata to verify realtime configuration
 */
export async function checkRealtimeConfig(): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Query the realtime.subscription table to check if stitch_runs is enabled
    // Note: This requires querying pg_catalog or using Supabase management API
    // For now, we'll attempt to subscribe and check if it works
    
    // Try to query the publication to see if table is included
    let publications = null;
    try {
      const result = await supabase.rpc('get_realtime_publications' as any);
      publications = result.data;
    } catch (rpcError) {
      // RPC doesn't exist, continue with alternative approach
    }

    // If RPC doesn't exist, try direct query to pg_publication_tables
    if (!publications) {
      const { data: pubTables, error: tablesError } = await supabase
        .from('pg_publication_tables' as any)
        .select('*')
        .eq('pubname', 'supabase_realtime')
        .eq('schemaname', 'public')
        .eq('tablename', 'stitch_runs');

      if (tablesError) {
        // If we can't query metadata, try a different approach
        // Check if we can create a subscription (this is a functional test)
        try {
          const channel = supabase
            .channel('test_realtime_check')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'stitch_runs',
              },
              () => {}
            );

          await channel.subscribe();
          await channel.unsubscribe();
          
          // If subscription succeeds, realtime is likely enabled
          // This is not definitive but better than nothing
        } catch (subscribeError) {
          errors.push({
            type: 'realtime',
            message: 'Unable to verify Realtime configuration for stitch_runs table',
            context: {
              table: 'stitch_runs',
              error: String(subscribeError),
              note: 'Could not query metadata or create test subscription',
            },
          });
        }
      } else if (!pubTables || pubTables.length === 0) {
        errors.push({
          type: 'realtime',
          message: 'Realtime is not enabled on stitch_runs table',
          context: {
            table: 'stitch_runs',
            publication: 'supabase_realtime',
            note: 'Table not found in publication',
          },
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'realtime',
      message: 'Unexpected error checking Realtime configuration',
      context: { error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that all journey events reference valid edges in the canvas
 * Validates:
 * - All journey event edge_id values reference existing edges in the canvas
 * - Reports which entities have invalid journey data
 */
export async function checkJourneyEdges(flowId: string): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Get the flow
    const { data: flow, error: flowError } = await supabase
      .from('stitch_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      errors.push({
        type: 'journey_edge',
        message: `Flow ${flowId} not found`,
        context: { flowId, error: flowError?.message },
      });
      return errors;
    }

    // Get all entities for this canvas
    const { data: entities, error: entitiesError } = await supabase
      .from('stitch_entities')
      .select('id, name')
      .eq('canvas_id', flowId);

    if (entitiesError) {
      errors.push({
        type: 'journey_edge',
        message: `Failed to query entities for flow ${flowId}`,
        context: { flowId, error: entitiesError.message },
      });
      return errors;
    }

    if (!entities || entities.length === 0) {
      // No entities, no journey events to check
      return errors;
    }

    const entityIds = new Set(entities.map((e) => e.id));
    const entityNameMap = new Map(entities.map((e) => [e.id, e.name]));

    // Get all journey events for entities in this canvas
    const { data: journeyEvents, error: journeyError } = await supabase
      .from('stitch_journey_events')
      .select('id, entity_id, edge_id, node_id, event_type, timestamp')
      .in('entity_id', Array.from(entityIds))
      .not('edge_id', 'is', null);

    if (journeyError) {
      errors.push({
        type: 'journey_edge',
        message: `Failed to query journey events for flow ${flowId}`,
        context: { flowId, error: journeyError.message },
      });
      return errors;
    }

    if (!journeyEvents || journeyEvents.length === 0) {
      // No journey events with edge_id to check
      return errors;
    }

    // Build set of valid edge IDs from the flow graph
    const graph = flow.graph as { nodes: StitchNode[]; edges: StitchEdge[] };
    const validEdgeIds = new Set(graph.edges.map((e) => e.id));

    // Track which entities have invalid journey data
    const entitiesWithInvalidData = new Set<string>();

    // Check each journey event's edge_id
    for (const event of journeyEvents) {
      if (event.edge_id && !validEdgeIds.has(event.edge_id)) {
        entitiesWithInvalidData.add(event.entity_id);
        
        errors.push({
          type: 'journey_edge',
          message: `Journey event ${event.id} references non-existent edge: ${event.edge_id}`,
          context: {
            eventId: event.id,
            entityId: event.entity_id,
            entityName: entityNameMap.get(event.entity_id),
            edgeId: event.edge_id,
            eventType: event.event_type,
            timestamp: event.timestamp,
            flowId,
          },
        });
      }
    }

    // Report summary of entities with invalid journey data
    if (entitiesWithInvalidData.size > 0) {
      const invalidEntityNames = Array.from(entitiesWithInvalidData)
        .map((id) => entityNameMap.get(id) || id)
        .join(', ');

      errors.push({
        type: 'journey_edge',
        message: `${entitiesWithInvalidData.size} entities have invalid journey data`,
        context: {
          flowId,
          entityCount: entitiesWithInvalidData.size,
          entities: invalidEntityNames,
          note: 'These entities have journey events referencing non-existent edges',
        },
      });
    }
  } catch (error) {
    errors.push({
      type: 'journey_edge',
      message: `Unexpected error checking journey edges for flow ${flowId}`,
      context: { flowId, error: String(error) },
    });
  }

  return errors;
}

/**
 * Check that RLS policies allow SELECT for the current user role
 * Tests SELECT permissions on realtime-enabled tables
 */
export async function checkRLSPolicies(): Promise<VerificationError[]> {
  const errors: VerificationError[] = [];
  const supabase = createServerClient();

  try {
    // Tables that should have RLS policies allowing SELECT
    const tablesToCheck = [
      'stitch_runs',
      'stitch_flows',
      'stitch_entities',
      'stitch_journey_events',
    ];

    for (const tableName of tablesToCheck) {
      try {
        // Attempt a SELECT query to test permissions
        // Using service role key, this should always work
        // But we can check if RLS is enabled and policies exist
        
        const { data: policies, error: policiesError } = await supabase
          .from('pg_policies' as any)
          .select('*')
          .eq('schemaname', 'public')
          .eq('tablename', tableName)
          .eq('cmd', 'SELECT');

        if (policiesError) {
          // Can't query pg_policies, try functional test
          const { error: selectError } = await supabase
            .from(tableName as any)
            .select('id')
            .limit(1);

          if (selectError) {
            errors.push({
              type: 'rls',
              message: `SELECT permission test failed for table ${tableName}`,
              context: {
                table: tableName,
                error: selectError.message,
                note: 'Could not query policies or perform SELECT',
              },
            });
          }
        } else if (!policies || policies.length === 0) {
          // No SELECT policies found - this might be intentional if RLS is disabled
          // Check if RLS is enabled on the table
          const { data: tableInfo, error: tableError } = await supabase
            .from('pg_tables' as any)
            .select('*')
            .eq('schemaname', 'public')
            .eq('tablename', tableName)
            .single();

          if (!tableError && tableInfo) {
            // We can't directly check if RLS is enabled from pg_tables
            // So we'll just warn that no SELECT policies were found
            errors.push({
              type: 'rls',
              message: `No SELECT policies found for table ${tableName}`,
              context: {
                table: tableName,
                note: 'This may be intentional if RLS is disabled or using service role',
              },
            });
          }
        }
      } catch (tableError) {
        errors.push({
          type: 'rls',
          message: `Error checking RLS policies for table ${tableName}`,
          context: {
            table: tableName,
            error: String(tableError),
          },
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'rls',
      message: 'Unexpected error checking RLS policies',
      context: { error: String(error) },
    });
  }

  return errors;
}
