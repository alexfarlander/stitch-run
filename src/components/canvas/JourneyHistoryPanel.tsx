'use client';

import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useJourneyHistory } from '@/hooks/useJourneyHistory';
import { supabase } from '@/lib/supabase/client';
import {
  TypedJourneyEvent,
  FallbackJourneyEvent,
  DatabaseJourneyEvent,
  normalizeJourneyEvent,
  isDatabaseEvent,
  getEventType,
  getNodeId,
  getEdgeId,
  getTimestamp,
  getMetadata,
  getNote,
  getProgress,
} from '@/types/journey-event';

interface Props {
  entityId: string | null;
  entityName?: string;
  fallbackJourney?: Array<{
    timestamp: string;
    type: string;
    node_id?: string;
    edge_id?: string;
    from_node_id?: string;
    workflow_run_id?: string;
    note?: string;
  }>;
}

/**
 * Calculate dwell time between consecutive events at the same node
 * Requirements: 10.3
 */
function calculateDwellTime(
  currentEvent: DatabaseJourneyEvent,
  events: DatabaseJourneyEvent[],
  currentIndex: number
): number | null {
  // Only calculate dwell time for node_arrival events
  if (currentEvent.event_type !== 'node_arrival' || !currentEvent.node_id) {
    return null;
  }

  // Find the next event where the entity leaves this node
  // This could be another node_arrival (moved to different node) or edge_start (started traveling)
  const nextEvent = events
    .slice(currentIndex + 1)
    .find((e) => {
      // Entity left if it arrived at a different node
      if (e.event_type === 'node_arrival' && e.node_id !== currentEvent.node_id) {
        return true;
      }
      // Entity left if it started traveling on an edge
      if (e.event_type === 'edge_start') {
        return true;
      }
      return false;
    });

  if (!nextEvent) {
    return null; // Entity is still at this node
  }

  const entryTime = new Date(currentEvent.timestamp).getTime();
  const exitTime = new Date(nextEvent.timestamp).getTime();
  return exitTime - entryTime;
}

/**
 * Format milliseconds into human-readable duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp for display - more human readable
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // If within last hour, show "X minutes ago"
  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  }

  // If within last 24 hours, show "X hours ago"
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  // If within last week, show "X days ago"
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Otherwise show full date
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get icon for event type
 * Handles both database event types and fallback journey types
 */
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'node_arrival':
    case 'entered_node':
      return <MapPin className="w-4 h-4" />;
    case 'edge_start':
    case 'started_edge':
      return <ArrowRight className="w-4 h-4" />;
    case 'edge_progress':
      return <ArrowRight className="w-4 h-4" />;
    case 'node_complete':
    case 'left_node':
      return <MapPin className="w-4 h-4" />;
    case 'completed_edge':
      return <ArrowRight className="w-4 h-4" />;
    case 'manual_move':
      return <MapPin className="w-4 h-4" />;
    case 'converted':
      return <MapPin className="w-4 h-4" />;
    case 'churned':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

/**
 * Get color for event type
 * Handles both database event types and fallback journey types
 */
function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'node_arrival':
    case 'entered_node':
      return 'text-green-400';
    case 'edge_start':
    case 'started_edge':
      return 'text-blue-400';
    case 'edge_progress':
      return 'text-cyan-400';
    case 'node_complete':
    case 'left_node':
      return 'text-purple-400';
    case 'completed_edge':
      return 'text-blue-400';
    case 'manual_move':
      return 'text-yellow-400';
    case 'converted':
      return 'text-green-500';
    case 'churned':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Journey History Panel Component
 * Displays complete journey history with timestamps and dwell times
 * Falls back to entity.journey if no events in stitch_journey_events table
 * 
 * Requirements: 9.5, 10.1, 10.2, 10.3, 10.5
 */
export function JourneyHistoryPanel({ entityId, entityName, fallbackJourney }: Props) {
  const { events, loading, error } = useJourneyHistory(entityId);
  const [nodeLabels, setNodeLabels] = useState<Record<string, string>>({});
  const [edgeLabels, setEdgeLabels] = useState<Record<string, string>>({});
  const [labelsLoading, setLabelsLoading] = useState(true);

  if (!entityId) {
    return null;
  }

  // Normalize fallback journey to typed events
  const normalizedFallback: FallbackJourneyEvent[] = (fallbackJourney || []).map(raw =>
    normalizeJourneyEvent(raw) as FallbackJourneyEvent
  );

  // Use fallback journey if no events found in database
  const displayEvents: TypedJourneyEvent[] = events.length > 0 ? events : normalizedFallback;
  const usingFallback = events.length === 0 && normalizedFallback.length > 0;

  // Fetch node and edge labels
  useEffect(() => {
    let mounted = true;

    async function fetchLabels() {
      if (displayEvents.length === 0) {
        if (mounted) {
          setLabelsLoading(false);
        }
        return;
      }

      // Collect all unique node and edge IDs
      const nodeIds = new Set<string>();
      const edgeIds = new Set<string>();

      displayEvents.forEach((event) => {
        const nodeId = getNodeId(event);
        const edgeId = getEdgeId(event);
        if (nodeId) nodeIds.add(nodeId);
        if (edgeId) edgeIds.add(edgeId);
      });

      // Fetch node labels from the canvas
      if (nodeIds.size > 0) {
        const { data: entity } = await supabase
          .from('stitch_entities')
          .select('canvas_id')
          .eq('id', entityId)
          .single();

        if (entity?.canvas_id && mounted) {
          const { data: canvas } = await supabase
            .from('stitch_flows')
            .select('graph')
            .eq('id', entity.canvas_id)
            .single();

          if (canvas?.graph && mounted) {
            const labels: Record<string, string> = {};
            const edgeLabelsMap: Record<string, string> = {};

            // Extract node labels
            if (canvas.graph.nodes) {
              canvas.graph.nodes.forEach((node: { id: string; data?: { label?: string } }) => {
                if (nodeIds.has(node.id)) {
                  labels[node.id] = node.data?.label || node.id;
                }
              });
            }

            // Extract edge labels (use source -> target as label)
            if (canvas.graph.edges) {
              canvas.graph.edges.forEach((edge: { id: string; source: string; target: string }) => {
                if (edgeIds.has(edge.id)) {
                  const sourceNode = canvas.graph.nodes?.find((n: { id: string; data?: { label?: string } }) => n.id === edge.source);
                  const targetNode = canvas.graph.nodes?.find((n: { id: string; data?: { label?: string } }) => n.id === edge.target);
                  const sourceLabel = sourceNode?.data?.label || edge.source;
                  const targetLabel = targetNode?.data?.label || edge.target;
                  edgeLabelsMap[edge.id] = `${sourceLabel} → ${targetLabel}`;
                }
              });
            }

            setNodeLabels(labels);
            setEdgeLabels(edgeLabelsMap);
          }
        }
      }

      if (mounted) {
        setLabelsLoading(false);
      }
    }

    fetchLabels();

    return () => {
      mounted = false;
    };
  }, [entityId, displayEvents.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-200">
          Journey History {entityName && `- ${entityName}`}
        </h3>
      </div>

      {(loading || labelsLoading) && (
        <div className="text-sm text-gray-400 py-4">Loading journey history...</div>
      )}

      {!loading && !labelsLoading && error && (
        <div className="text-sm text-red-400 py-4 bg-red-500/10 rounded px-3">
          Error: {error}
        </div>
      )}

      {!loading && !labelsLoading && !error && displayEvents.length === 0 && (
        <div className="text-sm text-gray-400 py-4">No journey events recorded yet.</div>
      )}

      {!loading && !labelsLoading && !error && displayEvents.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {usingFallback && (
            <div className="text-xs text-gray-500 italic mb-2">
              Showing journey from entity record (legacy format)
            </div>
          )}
          {displayEvents.map((event: TypedJourneyEvent, index: number) => {
            // Use type-safe accessors
            const eventType = getEventType(event);
            const nodeId = getNodeId(event);
            const edgeId = getEdgeId(event);
            const timestamp = getTimestamp(event);
            const eventId = isDatabaseEvent(event) ? event.id : `fallback-${index}`;
            const note = getNote(event);
            const metadata = getMetadata(event);
            const progress = getProgress(event);
            
            // Get human-readable labels
            const nodeLabel = nodeId ? (nodeLabels[nodeId] || nodeId) : null;
            const edgeLabel = edgeId ? (edgeLabels[edgeId] || edgeId) : null;
            
            const dwellTime = isDatabaseEvent(event) ? calculateDwellTime(event, events, index) : null;
            const eventColor = getEventColor(eventType);

            return (
              <div key={eventId} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center ${eventColor}`}>
                    {getEventIcon(eventType)}
                  </div>
                  {index < displayEvents.length - 1 && (
                    <div className="w-px h-full bg-gray-700 mt-1 min-h-[20px]" />
                  )}
                </div>

                {/* Event details */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {/* Main label - show node/edge name as the header */}
                      {nodeLabel && (
                        <p className={`text-sm font-semibold ${eventColor}`}>
                          {nodeLabel}
                        </p>
                      )}
                      {edgeLabel && (
                        <p className={`text-sm font-semibold ${eventColor}`}>
                          {edgeLabel}
                        </p>
                      )}

                      {/* Metadata - display meaningful business context */}
                      {metadata && Object.keys(metadata).length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                          {metadata.started_date && (
                            <div>
                              Started: {new Date(metadata.started_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                          {metadata.ends_date && (
                            <div>
                              Ends: {new Date(metadata.ends_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                          {metadata.scheduled_date && (
                            <div>
                              Scheduled: {new Date(metadata.scheduled_date).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          {metadata.account_manager && (
                            <div>Account Manager: {metadata.account_manager}</div>
                          )}
                          {metadata.assigned_to && (
                            <div>Assigned to: {metadata.assigned_to}</div>
                          )}
                          {metadata.campaign && (
                            <div>Campaign: {metadata.campaign}</div>
                          )}
                          {metadata.source && (
                            <div>Source: {metadata.source}</div>
                          )}
                          {metadata.plan && (
                            <div>Plan: {metadata.plan}</div>
                          )}
                          {metadata.amount !== undefined && (
                            <div>Amount: ${metadata.amount}</div>
                          )}
                          {metadata.status && (
                            <div>Status: {metadata.status}</div>
                          )}
                          {metadata.note && (
                            <div className="italic">{metadata.note}</div>
                          )}
                          {/* Show other metadata fields that aren't in the special list */}
                          {Object.entries(metadata)
                            .filter(([key]) => !['started_date', 'ends_date', 'scheduled_date', 'account_manager', 'assigned_to', 'campaign', 'source', 'plan', 'amount', 'status', 'note', 'completion_status', 'movement_type', 'entity_type_changed'].includes(key))
                            .map(([key, value]) => (
                              <div key={key}>
                                {key.replace(/_/g, ' ')}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Note (for fallback events) */}
                      {note && (
                        <p className="text-xs text-gray-400 mt-1 italic">{note}</p>
                      )}

                      {/* Progress for edge events (only for database events) */}
                      {progress !== null && progress !== undefined && (
                        <p className="text-xs text-gray-400 mt-1">
                          Progress: {Math.round(progress * 100)}%
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimestamp(timestamp)}
                      </p>
                    </div>

                    {/* Dwell time badge (only for database events) */}
                    {dwellTime !== null && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                        <Clock className="w-3 h-3" />
                        {formatDuration(dwellTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
