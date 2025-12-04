/**
 * Tests for workflow creation type definitions
 * Validates that the types are properly structured and can be used correctly
 */

import { describe, it, expect } from 'vitest';
import type { WorkflowCreationRequest, NodeConfig } from '../workflow-creation';
import type { VisualGraph } from '../canvas-schema';

describe('WorkflowCreationRequest', () => {
  it('should support Mermaid-only workflow creation', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A[Start] --> B[Process]'
    };
    
    expect(request.mermaid).toBeDefined();
    expect(request.graph).toBeUndefined();
    expect(request.nodeConfigs).toBeUndefined();
    expect(request.edgeMappings).toBeUndefined();
  });

  it('should support full graph workflow creation', () => {
    const graph: VisualGraph = {
      nodes: [
        {
          id: 'start',
          type: 'ux',
          position: { x: 0, y: 0 },
          data: { label: 'Start' }
        }
      ],
      edges: []
    };

    const request: WorkflowCreationRequest = {
      graph
    };
    
    expect(request.graph).toBeDefined();
    expect(request.mermaid).toBeUndefined();
  });

  it('should support hybrid Mermaid + nodeConfigs', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A --> B',
      nodeConfigs: {
        'A': {
          workerType: 'claude',
          config: { model: 'claude-3-sonnet-20240229' }
        }
      }
    };
    
    expect(request.mermaid).toBeDefined();
    expect(request.nodeConfigs).toBeDefined();
    expect(request.nodeConfigs?.['A'].workerType).toBe('claude');
  });

  it('should support hybrid Mermaid + edgeMappings', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A --> B',
      edgeMappings: {
        'A->B': {
          prompt: 'output.text'
        }
      }
    };
    
    expect(request.mermaid).toBeDefined();
    expect(request.edgeMappings).toBeDefined();
    expect(request.edgeMappings?.['A->B'].prompt).toBe('output.text');
  });

  it('should support full hybrid approach with all options', () => {
    const request: WorkflowCreationRequest = {
      mermaid: 'flowchart LR\n  A --> B --> C',
      nodeConfigs: {
        'A': {
          workerType: 'claude',
          config: { model: 'claude-3-sonnet-20240229' },
          entityMovement: {
            onSuccess: {
              targetSectionId: 'production',
              completeAs: 'success'
            }
          }
        },
        'B': {
          workerType: 'minimax',
          config: { duration: 5 }
        }
      },
      edgeMappings: {
        'A->B': {
          prompt: 'output.script.scenes[0].description'
        },
        'B->C': {
          videoUrl: 'output.videoUrl'
        }
      }
    };
    
    expect(request.mermaid).toBeDefined();
    expect(request.nodeConfigs).toBeDefined();
    expect(request.edgeMappings).toBeDefined();
    expect(Object.keys(request.nodeConfigs!)).toHaveLength(2);
    expect(Object.keys(request.edgeMappings!)).toHaveLength(2);
  });
});

describe('NodeConfig', () => {
  it('should support worker type configuration', () => {
    const config: NodeConfig = {
      workerType: 'claude'
    };
    
    expect(config.workerType).toBe('claude');
  });

  it('should support worker-specific config', () => {
    const config: NodeConfig = {
      workerType: 'claude',
      config: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 1000
      }
    };
    
    expect(config.config?.model).toBe('claude-3-sonnet-20240229');
    expect(config.config?.temperature).toBe(0.7);
  });

  it('should support entity movement configuration', () => {
    const config: NodeConfig = {
      workerType: 'claude',
      entityMovement: {
        onSuccess: {
          targetSectionId: 'production',
          completeAs: 'success',
          setEntityType: 'customer'
        },
        onFailure: {
          targetSectionId: 'support',
          completeAs: 'failure'
        }
      }
    };
    
    expect(config.entityMovement?.onSuccess?.targetSectionId).toBe('production');
    expect(config.entityMovement?.onFailure?.targetSectionId).toBe('support');
  });
});
