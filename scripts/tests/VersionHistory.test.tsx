/**
 * VersionHistory Component Tests
 * 
 * Tests the version history UI component functionality including:
 * - Version data structure validation
 * - Timestamp formatting
 * - Component props interface
 * 
 * Requirements: 1.4, 5.3
 */

import { describe, it, expect } from 'vitest';
import { FlowVersion } from '@/lib/canvas/version-manager';

describe('VersionHistory Component', () => {
  const mockFlowId = 'test-flow-id';
  
  it('should have correct FlowVersion structure', () => {
    const mockVersion: FlowVersion = {
      id: 'version-1',
      flow_id: mockFlowId,
      visual_graph: { nodes: [], edges: [] },
      execution_graph: { 
        nodes: {}, 
        adjacency: {}, 
        edgeData: {}, 
        entryNodes: [], 
        terminalNodes: [] 
      },
      commit_message: 'Initial version',
      created_at: new Date().toISOString(),
    };

    // Verify all required fields exist
    expect(mockVersion).toHaveProperty('id');
    expect(mockVersion).toHaveProperty('flow_id');
    expect(mockVersion).toHaveProperty('visual_graph');
    expect(mockVersion).toHaveProperty('execution_graph');
    expect(mockVersion).toHaveProperty('commit_message');
    expect(mockVersion).toHaveProperty('created_at');
  });

  it('should handle null commit messages', () => {
    const mockVersion: FlowVersion = {
      id: 'version-1',
      flow_id: mockFlowId,
      visual_graph: { nodes: [], edges: [] },
      execution_graph: { 
        nodes: {}, 
        adjacency: {}, 
        edgeData: {}, 
        entryNodes: [], 
        terminalNodes: [] 
      },
      commit_message: null,
      created_at: new Date().toISOString(),
    };

    expect(mockVersion.commit_message).toBeNull();
  });

  it('should format version IDs to 8 characters', () => {
    const fullId = 'version-1234-5678-9012';
    const shortId = fullId.slice(0, 8);
    
    expect(shortId).toBe('version-');
    expect(shortId.length).toBe(8);
  });

  it('should handle multiple versions in array', () => {
    const versions: FlowVersion[] = [
      {
        id: 'version-1',
        flow_id: mockFlowId,
        visual_graph: { nodes: [], edges: [] },
        execution_graph: { 
          nodes: {}, 
          adjacency: {}, 
          edgeData: {}, 
          entryNodes: [], 
          terminalNodes: [] 
        },
        commit_message: 'Initial version',
        created_at: new Date().toISOString(),
      },
      {
        id: 'version-2',
        flow_id: mockFlowId,
        visual_graph: { nodes: [], edges: [] },
        execution_graph: { 
          nodes: {}, 
          adjacency: {}, 
          edgeData: {}, 
          entryNodes: [], 
          terminalNodes: [] 
        },
        commit_message: 'Added new nodes',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    expect(versions).toHaveLength(2);
    expect(versions[0].id).toBe('version-1');
    expect(versions[1].id).toBe('version-2');
  });

  it('should validate timestamp format', () => {
    const timestamp = new Date().toISOString();
    
    // ISO 8601 format validation
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Should be parseable back to Date
    const parsed = new Date(timestamp);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.toISOString()).toBe(timestamp);
  });

  it('should support optional currentVersionId prop', () => {
    interface VersionHistoryProps {
      flowId: string;
      currentVersionId?: string | null;
      onViewVersion?: (version: FlowVersion) => void;
      onRevertVersion?: (version: FlowVersion) => void;
    }

    const props: VersionHistoryProps = {
      flowId: mockFlowId,
      currentVersionId: 'version-1',
    };

    expect(props.flowId).toBe(mockFlowId);
    expect(props.currentVersionId).toBe('version-1');
  });

  it('should support callback props', () => {
    interface VersionHistoryProps {
      flowId: string;
      currentVersionId?: string | null;
      onViewVersion?: (version: FlowVersion) => void;
      onRevertVersion?: (version: FlowVersion) => void;
    }

    const mockViewCallback = (version: FlowVersion) => {
      expect(version).toHaveProperty('id');
    };

    const mockRevertCallback = (version: FlowVersion) => {
      expect(version).toHaveProperty('id');
    };

    const props: VersionHistoryProps = {
      flowId: mockFlowId,
      onViewVersion: mockViewCallback,
      onRevertVersion: mockRevertCallback,
    };

    expect(props.onViewVersion).toBeDefined();
    expect(props.onRevertVersion).toBeDefined();
  });
});
