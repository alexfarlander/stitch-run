/**
 * Integration tests for worker node entity movement
 * Tests: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyEntityMovement } from '../worker';
import { NodeConfig } from '@/types/stitch';
import * as runs from '@/lib/db/runs';
import * as entities from '@/lib/db/entities';

// Mock dependencies
vi.mock('@/lib/db/runs');
vi.mock('@/lib/db/entities');

describe('Worker Entity Movement', () => {
  const mockRunId = 'run-123';
  const mockNodeId = 'worker-1';
  const mockEntityId = 'entity-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyEntityMovement', () => {
    it('should apply onSuccess movement when worker completes successfully (Requirement 5.3)', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-success',
            completeAs: 'success',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      vi.mocked(entities.moveEntityToSection).mockResolvedValue({
        id: mockEntityId,
        canvas_id: 'canvas-123',
        name: 'Test Entity',
        avatar_url: null,
        entity_type: 'customer',
        current_node_id: 'section-success',
        current_edge_id: null,
        edge_progress: null,
        journey: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'completed');

      expect(entities.moveEntityToSection).toHaveBeenCalledWith(
        mockEntityId,
        'section-success',
        'success',
        expect.objectContaining({
          run_id: mockRunId,
          node_id: mockNodeId,
          worker_status: 'completed',
        }),
        undefined  // setEntityType not specified
      );
    });

    it('should apply onFailure movement when worker fails (Requirement 5.4)', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onFailure: {
            targetSectionId: 'section-failure',
            completeAs: 'failure',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      vi.mocked(entities.moveEntityToSection).mockResolvedValue({
        id: mockEntityId,
        canvas_id: 'canvas-123',
        name: 'Test Entity',
        avatar_url: null,
        entity_type: 'customer',
        current_node_id: 'section-failure',
        current_edge_id: null,
        edge_progress: null,
        journey: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'failed');

      expect(entities.moveEntityToSection).toHaveBeenCalledWith(
        mockEntityId,
        'section-failure',
        'failure',
        expect.objectContaining({
          run_id: mockRunId,
          node_id: mockNodeId,
          worker_status: 'failed',
        }),
        undefined  // setEntityType not specified
      );
    });

    it('should not apply movement when entityMovement is not configured (Requirement 5.1)', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
      };

      await applyEntityMovement(mockRunId, mockNodeId, config, 'completed');

      expect(runs.getRunAdmin).not.toHaveBeenCalled();
      expect(entities.moveEntityToSection).not.toHaveBeenCalled();
    });

    it('should not apply movement when run has no entity', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-success',
            completeAs: 'success',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: null, // No entity
        node_states: {},
        trigger: { type: 'manual', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'completed');

      expect(entities.moveEntityToSection).not.toHaveBeenCalled();
    });

    it('should not apply movement when no action configured for outcome', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-success',
            completeAs: 'success',
          },
          // No onFailure configured
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'failed');

      expect(entities.moveEntityToSection).not.toHaveBeenCalled();
    });

    it('should handle entity movement errors gracefully', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-success',
            completeAs: 'success',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      vi.mocked(entities.moveEntityToSection).mockRejectedValue(new Error('Database error'));

      // Should not throw - errors should be logged but not propagate
      await expect(applyEntityMovement(mockRunId, mockNodeId, config, 'completed')).resolves.not.toThrow();
    });

    it('should support neutral completion status (Requirement 5.5)', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-neutral',
            completeAs: 'neutral',
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      vi.mocked(entities.moveEntityToSection).mockResolvedValue({
        id: mockEntityId,
        canvas_id: 'canvas-123',
        name: 'Test Entity',
        avatar_url: null,
        entity_type: 'customer',
        current_node_id: 'section-neutral',
        current_edge_id: null,
        edge_progress: null,
        journey: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'completed');

      expect(entities.moveEntityToSection).toHaveBeenCalledWith(
        mockEntityId,
        'section-neutral',
        'neutral',
        expect.any(Object),
        undefined  // setEntityType not specified
      );
    });

    it('should convert entity type when setEntityType is specified', async () => {
      const config: NodeConfig = {
        webhookUrl: 'https://example.com',
        entityMovement: {
          onSuccess: {
            targetSectionId: 'section-customers',
            completeAs: 'success',
            setEntityType: 'customer',  // Convert lead to customer
          },
        },
      };

      vi.mocked(runs.getRunAdmin).mockResolvedValue({
        id: mockRunId,
        flow_id: 'flow-123',
        entity_id: mockEntityId,
        node_states: {},
        trigger: { type: 'webhook', source: null, event_id: null, timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      vi.mocked(entities.moveEntityToSection).mockResolvedValue({
        id: mockEntityId,
        canvas_id: 'canvas-123',
        name: 'Test Entity',
        email: 'test@example.com',
        avatar_url: null,
        entity_type: 'customer',  // Type changed
        current_node_id: 'section-customers',
        current_edge_id: null,
        edge_progress: null,
        journey: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await applyEntityMovement(mockRunId, mockNodeId, config, 'completed');

      expect(entities.moveEntityToSection).toHaveBeenCalledWith(
        mockEntityId,
        'section-customers',
        'success',
        expect.objectContaining({
          run_id: mockRunId,
          node_id: mockNodeId,
          worker_status: 'completed',
        }),
        'customer'  // Entity type conversion specified
      );
    });
  });
});
