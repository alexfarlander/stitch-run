/**
 * Hook for tracking canvas events in real-time
 * 
 * Subscribes to broadcasts for node activations, entity movements,
 * and other canvas events to display in the Events Log.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface CanvasEvent {
  id: string;
  type: 'node_activated' | 'entity_moved' | 'edge_fired' | 'webhook_received' | 'demo_started' | 'demo_stopped' | 'demo_event';
  timestamp: Date;
  description: string;
  emoji: string;
  details?: {
    nodeId?: string;
    entityId?: string;
    entityName?: string;
    edgeId?: string;
    source?: string;
    target?: string;
    activationType?: 'arrival' | 'departure';
  };
}

const MAX_EVENTS = 50;

/**
 * Hook to track real-time canvas events for the Events Log
 */
export function useCanvasEvents(canvasId: string) {
  const [events, setEvents] = useState<CanvasEvent[]>([]);

  // Add a new event to the log
  const addEvent = useCallback((event: Omit<CanvasEvent, 'id' | 'timestamp'>) => {
    const newEvent: CanvasEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setEvents(prev => {
      const updated = [newEvent, ...prev];
      // Keep only the most recent events
      return updated.slice(0, MAX_EVENTS);
    });
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Subscribe to canvas broadcasts - only show business events (demo_event)
  useEffect(() => {
    if (!canvasId) return;

    const channel = supabase
      .channel(`canvas-${canvasId}`)
      .on('broadcast', { event: 'demo_event' }, (payload) => {
        const data = payload.payload;
        
        addEvent({
          type: 'demo_event',
          emoji: extractEmoji(data.description) || '🎬',
          description: removeEmoji(data.description),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canvasId, addEvent]);

  return { events, addEvent, clearEvents };
}

/**
 * Format node ID to a human-readable name
 */
function formatNodeName(nodeId: string): string {
  if (!nodeId) return 'Unknown';
  
  // Remove common prefixes
  let name = nodeId
    .replace('item-', '')
    .replace('section-', '')
    .replace(/-/g, ' ');
  
  // Capitalize words
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract emoji from the beginning of a string
 */
function extractEmoji(text: string): string | null {
  if (!text) return null;
  const emojiMatch = text.match(/^(\p{Emoji})/u);
  return emojiMatch ? emojiMatch[1] : null;
}

/**
 * Remove emoji from the beginning of a string
 */
function removeEmoji(text: string): string {
  if (!text) return '';
  return text.replace(/^(\p{Emoji})\s*/u, '').trim();
}
