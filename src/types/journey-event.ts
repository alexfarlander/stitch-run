/**
 * Type-safe journey event definitions
 * Implements discriminated unions for database and fallback journey events
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Journey event from stitch_journey_events table
 * Source of truth for entity movement tracking
 */
export type DatabaseJourneyEvent = {
  source: 'database';
  id: string;
  entity_id: string;
  event_type:
    | 'node_arrival'
    | 'edge_start'
    | 'edge_progress'
    | 'node_complete'
    | 'node_failure'
    | 'manual_move';
  node_id: string | null;
  edge_id: string | null;
  progress: number | null;
  timestamp: string;
  metadata: Record<string, unknown>;
};

/**
 * Journey event from entity.journey field (legacy format)
 * Used as fallback when no events exist in stitch_journey_events
 */
export type FallbackJourneyEvent = {
  source: 'fallback';
  type: string;
  node_id?: string;
  edge_id?: string;
  from_node_id?: string;
  workflow_run_id?: string;
  timestamp: string;
  note?: string;
};

/**
 * Discriminated union of all journey event types
 * Use this type for processing journey events
 */
export type TypedJourneyEvent = DatabaseJourneyEvent | FallbackJourneyEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for database events
 * @param event - Journey event to check
 * @returns true if event is from database
 */
export function isDatabaseEvent(event: TypedJourneyEvent): event is DatabaseJourneyEvent {
  return event.source === 'database';
}

/**
 * Type guard for fallback events
 * @param event - Journey event to check
 * @returns true if event is from fallback journey
 */
export function isFallbackEvent(event: TypedJourneyEvent): event is FallbackJourneyEvent {
  return event.source === 'fallback';
}

/**
 * Normalize raw event data to typed discriminated union
 * Handles both database format and fallback format
 * 
 * @param raw - Raw event data from database or entity.journey
 * @returns Typed journey event with source discriminator
 */
export function normalizeJourneyEvent(raw: unknown): TypedJourneyEvent {
  if (!isRecord(raw)) {
    return {
      source: 'fallback',
      type: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  // Database events have 'event_type' field
  if ('event_type' in raw && raw.event_type) {
    return {
      source: 'database',
      id: typeof raw.id === 'string' ? raw.id : '',
      entity_id: typeof raw.entity_id === 'string' ? raw.entity_id : '',
      event_type: raw.event_type as DatabaseJourneyEvent['event_type'],
      node_id: typeof raw.node_id === 'string' ? raw.node_id : null,
      edge_id: typeof raw.edge_id === 'string' ? raw.edge_id : null,
      progress: typeof raw.progress === 'number' ? raw.progress : null,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
      metadata: isRecord(raw.metadata) ? raw.metadata : {},
    } as DatabaseJourneyEvent;
  }
  
  // Fallback events have 'type' field
  return {
    source: 'fallback',
    type: typeof raw.type === 'string' ? raw.type : 'unknown',
    node_id: typeof raw.node_id === 'string' ? raw.node_id : undefined,
    edge_id: typeof raw.edge_id === 'string' ? raw.edge_id : undefined,
    from_node_id: typeof raw.from_node_id === 'string' ? raw.from_node_id : undefined,
    workflow_run_id: typeof raw.workflow_run_id === 'string' ? raw.workflow_run_id : undefined,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    note: typeof raw.note === 'string' ? raw.note : undefined,
  } as FallbackJourneyEvent;
}

/**
 * Get event type string for display
 * Handles both database and fallback event formats
 * 
 * @param event - Typed journey event
 * @returns Event type string
 */
export function getEventType(event: TypedJourneyEvent): string {
  if (isDatabaseEvent(event)) {
    return event.event_type;
  }
  return event.type;
}

/**
 * Get node ID from event
 * Handles both database and fallback event formats
 * 
 * @param event - Typed journey event
 * @returns Node ID or null
 */
export function getNodeId(event: TypedJourneyEvent): string | null | undefined {
  if (isDatabaseEvent(event)) {
    return event.node_id;
  }
  return event.node_id;
}

/**
 * Get edge ID from event
 * Handles both database and fallback event formats
 * 
 * @param event - Typed journey event
 * @returns Edge ID or null
 */
export function getEdgeId(event: TypedJourneyEvent): string | null | undefined {
  if (isDatabaseEvent(event)) {
    return event.edge_id;
  }
  return event.edge_id;
}

/**
 * Get timestamp from event
 * Handles both database and fallback event formats
 * 
 * @param event - Typed journey event
 * @returns ISO timestamp string
 */
export function getTimestamp(event: TypedJourneyEvent): string {
  return event.timestamp;
}

/**
 * Get metadata from event
 * Only database events have metadata
 * 
 * @param event - Typed journey event
 * @returns Metadata object or null
 */
export function getMetadata(event: TypedJourneyEvent): Record<string, unknown> | null {
  if (isDatabaseEvent(event)) {
    return event.metadata;
  }
  return null;
}

/**
 * Get note from event
 * Only fallback events have notes
 * 
 * @param event - Typed journey event
 * @returns Note string or null
 */
export function getNote(event: TypedJourneyEvent): string | null {
  if (isFallbackEvent(event)) {
    return event.note || null;
  }
  return null;
}

/**
 * Get progress from event
 * Only database events have progress
 * 
 * @param event - Typed journey event
 * @returns Progress value (0-1) or null
 */
export function getProgress(event: TypedJourneyEvent): number | null {
  if (isDatabaseEvent(event)) {
    return event.progress;
  }
  return null;
}
