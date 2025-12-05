/**
 * AI Manager API Integration Tests
 * 
 * These tests verify the AI Manager endpoint works end-to-end
 * Note: These tests require ANTHROPIC_API_KEY to be set
 */

import { describe, it, expect } from 'vitest';

describe('POST /api/ai-manager - Integration Tests', () => {
  // Skip these tests if ANTHROPIC_API_KEY is not set
  const skipIfNoApiKey = !process.env.ANTHROPIC_API_KEY;

  it('should create a simple workflow from natural language', { skip: skipIfNoApiKey, timeout: 30000 }, async () => {
    const response = await fetch('http://localhost:3000/api/ai-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: 'Create a simple workflow with a UX input node and a Claude worker node'
      }),
    });

    expect(response.status).toBe(200);
    
    const _data = await response.json();
    
    expect(data.action).toBe('CREATE_WORKFLOW');
    expect(data.result).toBeDefined();
    expect(data.result.canvasId).toBeDefined();
    expect(data.result.canvas).toBeDefined();
    expect(data.result.canvas.nodes.length).toBeGreaterThan(0);
  });

  it('should modify an existing workflow', { skip: skipIfNoApiKey, timeout: 60000 }, async () => {
    // First create a workflow
    const createResponse = await fetch('http://localhost:3000/api/ai-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: 'Create a workflow with a UX input node'
      }),
    });

    const createData = await createResponse.json();
    const canvasId = createData.result.canvasId;

    // Then modify it
    const modifyResponse = await fetch('http://localhost:3000/api/ai-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: 'Add a Claude worker node after the input',
        canvasId: canvasId
      }),
    });

    expect(modifyResponse.status).toBe(200);
    
    const modifyData = await modifyResponse.json();
    
    expect(modifyData.action).toBe('MODIFY_WORKFLOW');
    expect(modifyData.result).toBeDefined();
    expect(modifyData.result.canvas.nodes.length).toBeGreaterThan(1);
  });
});
