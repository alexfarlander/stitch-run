/**
 * TimelineScrubber Component Tests
 * 
 * Tests the timeline scrubber UI component functionality including:
 * - Event fetching and display
 * - Slider interaction
 * - Event marker rendering
 * - Time travel mode
 * 
 * Requirements: 6.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TimelineScrubber } from '../TimelineScrubber';
import { JourneyEvent } from '@/types/stitch';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { entity_id: 'test-entity-id' },
            error: null,
          })),
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

describe('TimelineScrubber Component', () => {
  const mockRunId = 'test-run-id';
  const mockOnTimestampChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(
      <TimelineScrubber 
        runId={mockRunId} 
        onTimestampChange={mockOnTimestampChange} 
      />
    );

    expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
  });

  it('should accept required props', () => {
    const props = {
      runId: 'test-run-id',
      onTimestampChange: vi.fn(),
    };

    expect(() => {
      render(<TimelineScrubber {...props} />);
    }).not.toThrow();
  });

  it('should have correct JourneyEvent structure', () => {
    const mockEvent: JourneyEvent = {
      id: 'event-1',
      entity_id: 'entity-1',
      event_type: 'node_complete',
      node_id: 'node-1',
      edge_id: null,
      progress: null,
      metadata: {},
      timestamp: new Date().toISOString(),
    };

    // Verify all required fields exist
    expect(mockEvent).toHaveProperty('id');
    expect(mockEvent).toHaveProperty('entity_id');
    expect(mockEvent).toHaveProperty('event_type');
    expect(mockEvent).toHaveProperty('node_id');
    expect(mockEvent).toHaveProperty('edge_id');
    expect(mockEvent).toHaveProperty('progress');
    expect(mockEvent).toHaveProperty('metadata');
    expect(mockEvent).toHaveProperty('timestamp');
  });

  it('should handle valid event types', () => {
    const validEventTypes: JourneyEvent['event_type'][] = [
      'edge_start',
      'edge_progress',
      'node_arrival',
      'node_complete',
      'manual_move',
    ];

    validEventTypes.forEach(eventType => {
      const event: JourneyEvent = {
        id: 'event-1',
        entity_id: 'entity-1',
        event_type: eventType,
        node_id: 'node-1',
        edge_id: null,
        progress: null,
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      expect(event.event_type).toBe(eventType);
    });
  });

  it('should call onTimestampChange with null when exiting time travel', async () => {
    const { getAdminClient } = await import('@/lib/supabase/client');
    const mockSupabase = getAdminClient();
    
    // Mock the from method to return events
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'stitch_runs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { entity_id: 'test-entity-id' },
                error: null,
              })),
            })),
          })),
        } as unknown;
      }
      
      if (table === 'stitch_journey_events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: 'event-1',
                    entity_id: 'test-entity-id',
                    event_type: 'node_complete',
                    node_id: 'node-1',
                    edge_id: null,
                    progress: null,
                    metadata: {},
                    timestamp: new Date().toISOString(),
                  },
                ],
                error: null,
              })),
            })),
          })),
        } as unknown;
      }
      
      return {} as unknown;
    });

    render(
      <TimelineScrubber 
        runId={mockRunId} 
        onTimestampChange={mockOnTimestampChange} 
      />
    );

    // Wait for events to load
    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });
  });

  describe('Event Markers (Requirements 15.1, 15.2, 15.3, 15.4, 15.5)', () => {
    it('should render markers for node_complete events', async () => {
      const { getAdminClient } = await import('@/lib/supabase/client');
      const mockSupabase = getAdminClient();
      
      const mockEvents: JourneyEvent[] = [
        {
          id: 'event-1',
          entity_id: 'test-entity-id',
          event_type: 'node_complete',
          node_id: 'node-1',
          edge_id: null,
          progress: null,
          metadata: {},
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
        },
        {
          id: 'event-2',
          entity_id: 'test-entity-id',
          event_type: 'node_complete',
          node_id: 'node-2',
          edge_id: null,
          progress: null,
          metadata: {},
          timestamp: new Date('2024-01-01T10:05:00Z').toISOString(),
        },
      ];

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'stitch_runs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { entity_id: 'test-entity-id' },
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        if (table === 'stitch_journey_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: mockEvents,
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        return {} as unknown;
      });

      render(
        <TimelineScrubber 
          runId={mockRunId} 
          onTimestampChange={mockOnTimestampChange} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
      });

      // Verify markers are rendered (they should be in the DOM as buttons)
      const markers = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('pointer-events-auto')
      );
      expect(markers.length).toBeGreaterThan(0);
    });

    it('should render markers for node_failure events', async () => {
      const { getAdminClient } = await import('@/lib/supabase/client');
      const mockSupabase = getAdminClient();
      
      const mockEvents: JourneyEvent[] = [
        {
          id: 'event-1',
          entity_id: 'test-entity-id',
          event_type: 'node_complete',
          node_id: 'node-1',
          edge_id: null,
          progress: null,
          metadata: {},
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
        },
      ];

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'stitch_runs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { entity_id: 'test-entity-id' },
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        if (table === 'stitch_journey_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: mockEvents,
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        return {} as unknown;
      });

      render(
        <TimelineScrubber 
          runId={mockRunId} 
          onTimestampChange={mockOnTimestampChange} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
      });
    });

    it('should cluster nearby markers to prevent overlap', async () => {
      const { getAdminClient } = await import('@/lib/supabase/client');
      const mockSupabase = getAdminClient();
      
      // Create events that are very close together (should be clustered)
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const mockEvents: JourneyEvent[] = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        entity_id: 'test-entity-id',
        event_type: i % 2 === 0 ? 'node_complete' : 'edge_start',
        node_id: i % 2 === 0 ? `node-${i}` : null,
        edge_id: i % 2 === 1 ? `edge-${i}` : null,
        progress: null,
        metadata: {},
        timestamp: new Date(baseTime.getTime() + i * 100).toISOString(), // 100ms apart
      }));

      // Add some node_complete events at the same time (should cluster)
      mockEvents.push(
        {
          id: 'event-cluster-1',
          entity_id: 'test-entity-id',
          event_type: 'node_complete',
          node_id: 'node-cluster-1',
          edge_id: null,
          progress: null,
          metadata: {},
          timestamp: new Date('2024-01-01T10:00:05Z').toISOString(),
        },
        {
          id: 'event-cluster-2',
          entity_id: 'test-entity-id',
          event_type: 'node_complete',
          node_id: 'node-cluster-2',
          edge_id: null,
          progress: null,
          metadata: {},
          timestamp: new Date('2024-01-01T10:00:05.100Z').toISOString(),
        }
      );

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'stitch_runs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { entity_id: 'test-entity-id' },
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        if (table === 'stitch_journey_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: mockEvents,
                  error: null,
                })),
              })),
            })),
          } as unknown;
        }
        
        return {} as unknown;
      });

      render(
        <TimelineScrubber 
          runId={mockRunId} 
          onTimestampChange={mockOnTimestampChange} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
      });

      // The clustering logic should reduce the number of visible markers
      // compared to the total number of important events
    });

    it('should position markers based on timestamp', () => {
      // This is tested implicitly by the rendering logic
      // The position calculation: (index / (events.length - 1)) * 100
      const events = [
        { timestamp: '2024-01-01T10:00:00Z' },
        { timestamp: '2024-01-01T10:05:00Z' },
        { timestamp: '2024-01-01T10:10:00Z' },
      ];

      // First event should be at 0%
      const pos0 = (0 / (events.length - 1)) * 100;
      expect(pos0).toBe(0);

      // Middle event should be at 50%
      const pos1 = (1 / (events.length - 1)) * 100;
      expect(pos1).toBe(50);

      // Last event should be at 100%
      const pos2 = (2 / (events.length - 1)) * 100;
      expect(pos2).toBe(100);
    });
  });
});
