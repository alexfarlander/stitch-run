import { supabase } from '@/lib/supabase/client';

interface EdgeStats {
  edgeId: string;
  totalEntered: number; // Entities that started this edge
  totalCompleted: number; // Entities that finished this edge
  currentlyTraveling: number; // Entities on this edge now
  conversionRate: number; // totalCompleted / totalEntered
  averageDuration?: number; // Average time to traverse (ms)
}

export async function calculateEdgeStats(canvasId: string): Promise<Map<string, EdgeStats>> {
  const { data: entities } = await supabase
    .from('stitch_entities')
    .select('*')
    .eq('canvas_id', canvasId);

  if (!entities) return new Map();

  const statsMap = new Map<string, EdgeStats>();

  // Count currently traveling
  entities.forEach((entity) => {
    if (entity.current_edge_id) {
      const existing = statsMap.get(entity.current_edge_id) || createEmptyStats(entity.current_edge_id);
      existing.currentlyTraveling++;
      statsMap.set(entity.current_edge_id, existing);
    }
  });

  // Count from journey histories
  entities.forEach((entity) => {
    entity.journey.forEach((event: any, index: number) => {
      if (event.type === 'started_edge' && event.edge_id) {
        const existing = statsMap.get(event.edge_id) || createEmptyStats(event.edge_id);
        existing.totalEntered++;

        // Check if next event is entered_node (completed the edge)
        const nextEvent = entity.journey[index + 1];
        if (nextEvent?.type === 'entered_node') {
          existing.totalCompleted++;
        }

        statsMap.set(event.edge_id, existing);
      }
    });
  });

  // Calculate conversion rates
  statsMap.forEach((stats, edgeId) => {
    stats.conversionRate = stats.totalEntered > 0 ? stats.totalCompleted / stats.totalEntered : 0;
  });

  return statsMap;
}

function createEmptyStats(edgeId: string): EdgeStats {
  return {
    edgeId,
    totalEntered: 0,
    totalCompleted: 0,
    currentlyTraveling: 0,
    conversionRate: 0
  };
}

/**
 * Convert stats to edge intensity (0-1) for visual glow
 */
export function calculateEdgeIntensity(stats: EdgeStats, maxTraffic: number): number {
  const traffic = stats.totalEntered + stats.currentlyTraveling * 2; // Weight current higher
  return Math.min(traffic / maxTraffic, 1);
}
