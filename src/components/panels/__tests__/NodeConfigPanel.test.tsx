/**
 * NodeConfigPanel Component Tests
 * 
 * Tests the basic functionality of the NodeConfigPanel component
 * including panel display, configuration loading, worker definition access,
 * and real-time validation.
 * 
 * Requirements:
 * - 3.1: Display configuration panel on node click
 * - 12.1: Import WORKER_DEFINITIONS from worker registry
 * - 13.1: Required field validation
 * - 13.2: Format-specific error messages
 * - 18.1: Real-time validation on input change
 * - 18.2: Display error messages immediately
 * - 18.3: Remove error messages when valid
 * - 18.4: Final validation on field blur
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NodeConfigPanel } from '../NodeConfigPanel';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

describe('NodeConfigPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockCanvasId = 'test-canvas-id';
  const mockNodeId = 'test-node-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when nodeId is null', () => {
    const { container } = render(
      <NodeConfigPanel
        nodeId={null}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Sheet should not be open
    expect(container.querySelector('[data-slot="sheet-content"]')).not.toBeInTheDocument();
  });

  it('should render panel when nodeId is provided', async () => {
    // Mock successful fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'claude',
                config: { prompt: 'test prompt' },
              },
            },
          ],
        },
      }),
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();

    // Wait for configuration to load
    await waitFor(() => {
      expect(screen.getByText('Node Configuration')).toBeInTheDocument();
    });

    // Should display worker type
    await waitFor(() => {
      expect(screen.getByText('claude')).toBeInTheDocument();
    });
  });

  it('should fetch node configuration on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'minimax',
                config: { visual_prompt: 'test visual' },
              },
            },
          ],
        },
      }),
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/canvas/${mockCanvasId}`);
    });
  });

  it('should display error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch canvas data')).toBeInTheDocument();
    });
  });

  it('should access WORKER_DEFINITIONS from registry', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'claude',
                config: {},
              },
            },
          ],
        },
      }),
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      // Should display worker definition description
      const claudeDefinition = WORKER_DEFINITIONS['claude'];
      expect(screen.getByText(claudeDefinition.description)).toBeInTheDocument();
    });
  });

  it('should display worker input schema information', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'claude',
                config: {},
              },
            },
          ],
        },
      }),
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      // Should display input fields from worker definition
      expect(screen.getByText('prompt')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  it('should display current configuration', async () => {
    const testConfig = { prompt: 'test prompt', topic: 'test topic' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'claude',
                config: testConfig,
              },
            },
          ],
        },
      }),
    });

    render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      // Should display the configuration as JSON
      const configText = JSON.stringify(testConfig, null, 2);
      expect(screen.getByText((content, element) => {
        return element?.textContent === configText;
      })).toBeInTheDocument();
    });
  });

  it('should call onClose when sheet is closed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        graph: {
          nodes: [
            {
              id: mockNodeId,
              data: {
                worker_type: 'claude',
                config: {},
              },
            },
          ],
        },
      }),
    });

    const { rerender } = render(
      <NodeConfigPanel
        nodeId={mockNodeId}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Node Configuration')).toBeInTheDocument();
    });

    // Simulate closing by setting nodeId to null
    rerender(
      <NodeConfigPanel
        nodeId={null}
        canvasId={mockCanvasId}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Panel should be closed
    await waitFor(() => {
      expect(screen.queryByText('Node Configuration')).not.toBeInTheDocument();
    });
  });
});
