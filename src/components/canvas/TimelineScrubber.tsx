'use client';

import { useEffect, useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getAdminClient } from '@/lib/supabase/client';
import { JourneyEvent } from '@/types/stitch';
import { Clock, X, CheckCircle2, XCircle } from 'lucide-react';

interface TimelineScrubberProps {
  runId: string;
  onTimestampChange: (timestamp: string | null) => void;
}

/**
 * TimelineScrubber component for time-travel debugging
 * 
 * Displays a horizontal slider that allows users to scrub through workflow execution history.
 * Shows event markers for important events (node_complete, node_failure) and allows jumping
 * to specific timestamps.
 * 
 * Requirements: 6.1
 * 
 * @param runId - The ID of the workflow run to display timeline for
 * @param onTimestampChange - Callback when user changes the timeline position (null = exit time travel)
 */
export function TimelineScrubber({ runId, onTimestampChange }: TimelineScrubberProps) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all journey events for this run
  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = getAdminClient();
        
        // First, get the run to find associated entities
        const { data: run, error: runError } = await supabase
          .from('stitch_runs')
          .select('entity_id')
          .eq('id', runId)
          .single();

        if (runError) {
          throw new Error(`Failed to fetch run: ${runError.message}`);
        }

        if (!run?.entity_id) {
          // No entity associated with this run, no events to show
          setEvents([]);
          setIsLoading(false);
          return;
        }

        // Fetch all journey events for the entity
        const { data, error: eventsError } = await supabase
          .from('stitch_journey_events')
          .select('*')
          .eq('entity_id', run.entity_id)
          .order('timestamp', { ascending: true });

        if (eventsError) {
          throw new Error(`Failed to fetch journey events: ${eventsError.message}`);
        }

        setEvents((data || []) as JourneyEvent[]);
      } catch (_err) {
        console.error('Error fetching timeline events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [runId]);

  // Handle slider value change
  const handleSliderChange = (value: number[]) => {
    const index = value[0];
    setSelectedIndex(index);
    
    if (events[index]) {
      onTimestampChange(events[index].timestamp);
    }
  };

  // Handle marker click to jump to specific event
  const handleMarkerClick = (index: number) => {
    setSelectedIndex(index);
    
    if (events[index]) {
      onTimestampChange(events[index].timestamp);
    }
  };

  // Handle exit time travel
  const handleExitTimeTravel = () => {
    setSelectedIndex(null);
    onTimestampChange(null);
  };

  // Don't render if no events
  if (isLoading) {
    return (
      <div className="timeline-scrubber border-t bg-background p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" />
          Loading timeline...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-scrubber border-t bg-background p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Don't show timeline if no events
  }

  // Calculate current slider value
  const currentValue = selectedIndex !== null ? selectedIndex : events.length - 1;

  // Cluster nearby markers to prevent overlap (Requirements 15.5)
  // Group events that are within 3% of timeline width
  const clusteredMarkers = useMemo(() => {
    const importantEvents = events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => 
        event.event_type === 'node_complete' || event.event_type === 'node_failure'
      );

    if (importantEvents.length === 0) return [];

    const clusters: Array<{
      position: number;
      events: Array<{ event: JourneyEvent; index: number }>;
    }> = [];

    const CLUSTER_THRESHOLD = 3; // 3% of timeline width

    importantEvents.forEach(({ event, index }) => {
      const position = events.length > 1 
        ? (index / (events.length - 1)) * 100 
        : 50;

      // Find existing cluster within threshold
      const existingCluster = clusters.find(
        cluster => Math.abs(cluster.position - position) < CLUSTER_THRESHOLD
      );

      if (existingCluster) {
        existingCluster.events.push({ event, index });
        // Update cluster position to average
        existingCluster.position = 
          existingCluster.events.reduce((sum, e) => {
            const pos = events.length > 1 
              ? (e.index / (events.length - 1)) * 100 
              : 50;
            return sum + pos;
          }, 0) / existingCluster.events.length;
      } else {
        clusters.push({
          position,
          events: [{ event, index }]
        });
      }
    });

    return clusters;
  }, [events]);

  return (
    <div className="timeline-scrubber border-t bg-background p-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-4">
          {/* Timeline label */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Timeline
          </div>

          {/* Slider container with markers */}
          <div className="relative flex-1">
            <Slider
              value={[currentValue]}
              min={0}
              max={Math.max(0, events.length - 1)}
              step={1}
              onValueChange={handleSliderChange}
              className="w-full"
            />

            {/* Event markers (Requirements 15.1, 15.2, 15.3, 15.4, 15.5) */}
            <div className="pointer-events-none absolute inset-0 flex items-center">
              {clusteredMarkers.map((cluster, clusterIndex) => {
                const isSingleEvent = cluster.events.length === 1;
                const firstEvent = cluster.events[0];
                
                // Determine marker color and icon based on event types in cluster
                const hasFailure = cluster.events.some(e => e.event.event_type === 'node_failure');
                const hasComplete = cluster.events.some(e => e.event.event_type === 'node_complete');
                
                let markerColor = 'bg-green-500';
                let MarkerIcon = CheckCircle2;
                let eventTypeLabel = 'Completed';
                
                if (hasFailure && hasComplete) {
                  markerColor = 'bg-yellow-500';
                  MarkerIcon = XCircle;
                  eventTypeLabel = 'Mixed Events';
                } else if (hasFailure) {
                  markerColor = 'bg-red-500';
                  MarkerIcon = XCircle;
                  eventTypeLabel = 'Failed';
                }

                return (
                  <TooltipProvider key={`cluster-${clusterIndex}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="pointer-events-auto absolute -translate-x-1/2 cursor-pointer transition-transform hover:scale-125"
                          style={{ left: `${cluster.position}%` }}
                          onClick={() => handleMarkerClick(firstEvent.index)}
                        >
                          {isSingleEvent ? (
                            <div className={`h-3 w-3 rounded-full border-2 border-background ${markerColor} shadow-sm`} />
                          ) : (
                            <div className="relative">
                              <div className={`h-4 w-4 rounded-full border-2 border-background ${markerColor} shadow-sm flex items-center justify-center`}>
                                <span className="text-[8px] font-bold text-white">
                                  {cluster.events.length}
                                </span>
                              </div>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          {isSingleEvent ? (
                            <>
                              <div className="font-medium flex items-center gap-1">
                                <MarkerIcon className="h-3 w-3" />
                                {eventTypeLabel}
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(firstEvent.event.timestamp).toLocaleTimeString()}
                              </div>
                              {firstEvent.event.node_id && (
                                <div className="text-muted-foreground text-[10px]">
                                  Node: {firstEvent.event.node_id.slice(0, 8)}...
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="font-medium">{cluster.events.length} Events</div>
                              {cluster.events.slice(0, 3).map((e, i) => (
                                <div key={i} className="text-muted-foreground flex items-center gap-1">
                                  {e.event.event_type === 'node_failure' ? (
                                    <XCircle className="h-2 w-2 text-red-500" />
                                  ) : (
                                    <CheckCircle2 className="h-2 w-2 text-green-500" />
                                  )}
                                  {new Date(e.event.timestamp).toLocaleTimeString()}
                                </div>
                              ))}
                              {cluster.events.length > 3 && (
                                <div className="text-muted-foreground text-[10px]">
                                  +{cluster.events.length - 3} more
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {/* Current timestamp display */}
          <div className="text-xs text-muted-foreground min-w-[100px]">
            {events[currentValue] && (
              <div>
                {new Date(events[currentValue].timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Exit time travel button */}
          {selectedIndex !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitTimeTravel}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Exit Time Travel
            </Button>
          )}
        </div>

        {/* Event info */}
        {events[currentValue] && (
          <div className="mt-2 text-xs text-muted-foreground">
            Event {currentValue + 1} of {events.length}: {events[currentValue].event_type}
            {events[currentValue].node_id && ` at node ${events[currentValue].node_id}`}
          </div>
        )}
      </div>
    </div>
  );
}
