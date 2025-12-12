# Testing Guide

## Overview

This guide covers testing patterns and practices for the Stitch orchestration platform. Stitch uses **Vitest** as the testing framework and **fast-check** for property-based testing. Tests are organized into unit tests, integration tests, property-based tests, and end-to-end workflow tests.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Organization](#test-organization)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Property-Based Testing](#property-based-testing)
6. [Integration Testing](#integration-testing)
7. [Worker Testing](#worker-testing)
8. [Workflow Testing](#workflow-testing)
9. [Mocking Strategies](#mocking-strategies)
10. [Best Practices](#best-practices)

## Testing Philosophy

Stitch follows these testing principles:

- **Database as Source of Truth**: Tests should verify database state, not in-memory state
- **Edge-Walking Validation**: Tests should verify the edge-walking execution model
- **Entity Movement**: Tests should validate entity tracking and journey events
- **Async Worker Pattern**: Tests should handle the fire-and-callback pattern
- **Property-Based Testing**: Use PBT for universal properties that should hold across all inputs
- **Integration Over Mocking**: Prefer integration tests with real database operations when possible

## Test Organization

Tests are co-located with source code in `__tests__` directories:

```
src/
├── lib/
│   ├── engine/
│   │   ├── handlers/
│   │   │   ├── __tests__/
│   │   │   │   ├── worker.test.ts              # Unit tests
│   │   │   │   ├── worker-integration.test.ts  # Integration tests
│   │   │   │   ├── splitter.property.test.ts   # Property-based tests
│   │   │   │   └── collector.property.test.ts
│   │   │   ├── worker.ts
│   │   │   ├── splitter.ts
│   │   │   └── collector.ts
│   ├── workers/
│   │   ├── __tests__/
│   │   │   ├── testing.test.ts
│   │   │   └── claude.test.ts
│   │   └── claude.ts
├── app/
│   ├── api/
│   │   ├── __tests__/
│   │   │   ├── end-to-end-workflows.test.ts
│   │   │   └── error-handling-integration.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test src/lib/engine/handlers/__tests__/worker.test.ts

# Run tests matching a pattern
npm test -- --grep "Worker"
```

### Configuration

Tests are configured in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/lib/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Unit Testing

Unit tests verify individual functions and modules in isolation.

### Basic Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    const input = { data: 'test' };
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Example: Testing Entity Movement

```typescript
import { describe, it, expect, vi } from 'vitest';
import { applyEntityMovement } from '../worker';
import * as runs from '@/lib/db/runs';
import * as entities from '@/lib/db/entities';

vi.mock('@/lib/db/runs');
vi.mock('@/lib/db/entities');

describe('Worker Entity Movement', () => {
  it('should apply onSuccess movement when worker completes', async () => {
    const config = {
      webhookUrl: 'https://example.com',
      entityMovement: {
        onSuccess: {
          targetSectionId: 'section-success',
          completeAs: 'success',
        },
      },
    };

    vi.mocked(runs.getRunAdmin).mockResolvedValue({
      id: 'run-123',
      entity_id: 'entity-456',
      // ... other fields
    });

    vi.mocked(entities.moveEntityToSection).mockResolvedValue({
      id: 'entity-456',
      current_node_id: 'section-success',
      // ... other fields
    });

    await applyEntityMovement('run-123', 'worker-1', config, 'completed');

    expect(entities.moveEntityToSection).toHaveBeenCalledWith(
      'entity-456',
      'section-success',
      'success',
      expect.any(Object),
      undefined
    );
  });
});
```

## Property-Based Testing

Property-based tests verify universal properties that should hold across all inputs using **fast-check**.

### When to Use Property-Based Testing

Use PBT for:
- **Invariants**: Properties that remain constant (e.g., array length after map)
- **Round-trip properties**: Serialize/deserialize, encode/decode
- **Idempotence**: Operations where f(x) = f(f(x))
- **Metamorphic properties**: Relationships between inputs/outputs
- **Order independence**: Operations where order doesn't matter

### Basic Structure

```typescript
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Property Tests', () => {
  it('**Feature: feature-name, Property N: Description**', () => {
    fc.assert(
      fc.property(
        // Generators
        fc.array(fc.integer()),
        fc.string(),
        // Test function
        (numbers, text) => {
          const result = functionToTest(numbers, text);
          // Assert property
          expect(result).toSatisfyProperty();
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });
});
```

### Example: Splitter Property Tests

```typescript
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createParallelPathStates } from '../splitter';

// Generator for downstream node IDs
const downstreamNodeIdsArb = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('_')),
  { minLength: 1, maxLength: 5 }
).map(ids => Array.from(new Set(ids))); // Ensure unique

describe('Splitter Handler Property Tests', () => {
  it('**Feature: core-architecture, Property 14: Splitter creates parallel paths**', () => {
    fc.assert(
      fc.property(
        downstreamNodeIdsArb,
        fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
        (downstreamNodeIds, arrayElements) => {
          const parallelStates = createParallelPathStates(
            downstreamNodeIds,
            arrayElements
          );
          
          // Property: For N elements and M nodes, create N * M paths
          const expectedPathCount = arrayElements.length * downstreamNodeIds.length;
          expect(Object.keys(parallelStates).length).toBe(expectedPathCount);
          
          // Property: Each path should exist with correct suffix
          for (let i = 0; i < arrayElements.length; i++) {
            for (const nodeId of downstreamNodeIds) {
              const augmentedNodeId = `${nodeId}_${i}`;
              expect(parallelStates[augmentedNodeId]).toBeDefined();
              expect(parallelStates[augmentedNodeId].output).toEqual(arrayElements[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Custom Generators

Create custom generators for domain-specific types:

```typescript
// Generator for valid node configurations
const nodeConfigArb = fc.record({
  webhookUrl: fc.webUrl(),
  entityMovement: fc.option(
    fc.record({
      onSuccess: fc.record({
        targetSectionId: fc.string(),
        completeAs: fc.constantFrom('success', 'neutral', 'failure'),
      }),
    })
  ),
});

// Generator for execution graphs
const executionGraphArb = fc.record({
  nodes: fc.dictionary(
    fc.string(),
    fc.record({
      id: fc.string(),
      type: fc.constantFrom('Worker', 'Splitter', 'Collector', 'UX'),
      config: fc.object(),
    })
  ),
  edges: fc.array(
    fc.record({
      source: fc.string(),
      target: fc.string(),
    })
  ),
});
```

## Integration Testing

Integration tests verify multiple components working together, often with real database operations.

### Database Integration Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFlow, getFlow, deleteFlow } from '@/lib/db/flows';
import { createRun, updateNodeState } from '@/lib/db/runs';

describe('Flow and Run Integration', () => {
  let testFlowId: string;

  beforeEach(async () => {
    // Create test flow
    const flow = await createFlow({
      name: 'Test Flow',
      canvas: { nodes: [], edges: [] },
    });
    testFlowId = flow.id;
  });

  afterEach(async () => {
    // Cleanup
    await deleteFlow(testFlowId);
  });

  it('should create run and update node states', async () => {
    // Create run
    const run = await createRun({
      flow_id: testFlowId,
      trigger: { type: 'manual' },
    });

    expect(run.id).toBeTruthy();
    expect(run.flow_id).toBe(testFlowId);

    // Update node state
    await updateNodeState(run.id, 'node-1', {
      status: 'completed',
      output: { result: 'success' },
    });

    // Verify state was persisted
    const updatedRun = await getRunAdmin(run.id);
    expect(updatedRun.node_states['node-1'].status).toBe('completed');
    expect(updatedRun.node_states['node-1'].output).toEqual({ result: 'success' });
  });
});
```

### API Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { POST as createCanvas } from '../canvas/route';
import { POST as runCanvas } from '../canvas/[id]/run/route';
import { NextRequest } from 'next/server';

describe('Canvas API Integration', () => {
  it('should create and execute canvas', async () => {
    // Create canvas
    const createRequest = new NextRequest('http://localhost:3000/api/canvas', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Canvas',
        format: 'json',
        content: {
          nodes: [
            { id: 'ux-1', type: 'UX', position: { x: 0, y: 0 }, data: {} },
            { id: 'worker-1', type: 'Worker', position: { x: 100, y: 0 }, data: {} },
          ],
          edges: [{ id: 'e1', source: 'ux-1', target: 'worker-1' }],
        },
      }),
    });

    const createResponse = await createCanvas(createRequest);
    expect(createResponse.status).toBe(201);
    
    const { id: canvasId } = await createResponse.json();

    // Execute canvas
    const runRequest = new NextRequest(
      `http://localhost:3000/api/canvas/${canvasId}/run`,
      {
        method: 'POST',
        body: JSON.stringify({ input: {} }),
      }
    );

    const runResponse = await runCanvas(runRequest, { params: { id: canvasId } });
    expect(runResponse.status).toBe(200);
    
    const { runId, status } = await runResponse.json();
    expect(runId).toBeTruthy();
    expect(status).toBe('running');
  });
});
```

## Worker Testing

Workers can be tested in two modes: **mock mode** (without API keys) and **live mode** (with real API calls).

### Worker Testing Infrastructure

Stitch provides a testing utility for workers:

```typescript
import { testWorker, testAllWorkers } from '@/lib/workers/testing';

// Test single worker in mock mode
const result = await testWorker({
  workerName: 'claude',
  mockMode: true,
  testInput: { prompt: 'Generate a scene' },
});

console.log(result.success); // true
console.log(result.output);  // Mock output
console.log(result.duration); // Execution time

// Test all workers
const results = await testAllWorkers(true); // true = mock mode
```

### Mock Mode Testing

Mock mode allows testing without API keys:

```typescript
describe('Worker Testing', () => {
  it('should test worker in mock mode', async () => {
    const result = await testWorker({
      workerName: 'claude',
      mockMode: true,
      testInput: { prompt: 'test' },
    });

    expect(result.success).toBe(true);
    expect(result.apiKeyPresent).toBe(false);
    expect(result.callbackReceived).toBe(true);
    expect(result.output).toBeDefined();
  });

  it('should generate appropriate mock output for claude', async () => {
    const result = await testWorker({
      workerName: 'claude',
      mockMode: true,
      testInput: { prompt: 'test' },
    });

    expect(result.output).toHaveProperty('scenes');
    expect(Array.isArray(result.output.scenes)).toBe(true);
    expect(result.output.scenes[0]).toHaveProperty('visual_prompt');
    expect(result.output.scenes[0]).toHaveProperty('voice_text');
  });
});
```

### Live Mode Testing

Live mode tests real API calls (requires API keys):

```typescript
describe('Worker Live Tests', () => {
  it('should call real Claude API', async () => {
    // Skip if API key not present
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping: ANTHROPIC_API_KEY not set');
      return;
    }

    const result = await testWorker({
      workerName: 'claude',
      mockMode: false,
      testInput: {
        prompt: 'Generate a 5-second video about AI testing',
      },
    });

    expect(result.success).toBe(true);
    expect(result.apiKeyPresent).toBe(true);
    expect(result.output.scenes).toBeDefined();
    expect(result.output.scenes.length).toBeGreaterThan(0);
  });
});
```

### Testing Worker Integration

Test workers integrated into the execution engine:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleWorkerNode } from '../worker';
import { getWorker } from '@/lib/workers/registry';

describe('Worker Integration', () => {
  it('should use integrated worker when workerType is set', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockWorker = { execute: mockExecute };
    
    vi.spyOn(getWorker, 'getWorker').mockReturnValue(mockWorker);

    await handleWorkerNode({
      runId: 'run-123',
      nodeId: 'worker-1',
      config: {
        workerType: 'testing',
        delay: 100,
      },
      input: { data: 'test' },
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-123',
        nodeId: 'worker-1',
        input: { data: 'test' },
      })
    );
  });

  it('should fall back to webhook when workerType not set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    await handleWorkerNode({
      runId: 'run-123',
      nodeId: 'worker-1',
      config: {
        webhookUrl: 'https://example.com/webhook',
      },
      input: { data: 'test' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('run-123'),
      })
    );
  });
});
```

## Workflow Testing

Workflow tests verify complete end-to-end execution flows.

### Simple Workflow Test

```typescript
describe('Simple Workflow Execution', () => {
  it('should execute linear workflow', async () => {
    // Create workflow
    const flow = await createFlow({
      name: 'Linear Workflow',
      canvas: {
        nodes: [
          { id: 'ux-1', type: 'UX', data: {} },
          { id: 'worker-1', type: 'Worker', data: { worker_type: 'testing' } },
          { id: 'worker-2', type: 'Worker', data: { worker_type: 'testing' } },
        ],
        edges: [
          { source: 'ux-1', target: 'worker-1' },
          { source: 'worker-1', target: 'worker-2' },
        ],
      },
    });

    // Execute workflow
    const run = await startRun(flow.id, { input: {} });

    // Wait for completion (in real tests, use polling or callbacks)
    await waitForCompletion(run.id);

    // Verify all nodes completed
    const finalRun = await getRunAdmin(run.id);
    expect(finalRun.node_states['ux-1'].status).toBe('completed');
    expect(finalRun.node_states['worker-1'].status).toBe('completed');
    expect(finalRun.node_states['worker-2'].status).toBe('completed');
  });
});
```

### Parallel Workflow Test (Splitter/Collector)

```typescript
describe('Parallel Workflow Execution', () => {
  it('should execute splitter-collector pattern', async () => {
    const flow = await createFlow({
      name: 'Parallel Workflow',
      canvas: {
        nodes: [
          { id: 'splitter-1', type: 'Splitter', data: { arrayPath: 'items' } },
          { id: 'worker-1', type: 'Worker', data: { worker_type: 'testing' } },
          { id: 'worker-2', type: 'Worker', data: { worker_type: 'testing' } },
          { id: 'collector-1', type: 'Collector', data: {} },
        ],
        edges: [
          { source: 'splitter-1', target: 'worker-1' },
          { source: 'splitter-1', target: 'worker-2' },
          { source: 'worker-1', target: 'collector-1' },
          { source: 'worker-2', target: 'collector-1' },
        ],
      },
    });

    const run = await startRun(flow.id, {
      input: { items: ['a', 'b', 'c'] },
    });

    await waitForCompletion(run.id);

    const finalRun = await getRunAdmin(run.id);
    
    // Verify parallel paths were created
    expect(finalRun.node_states['worker-1_0']).toBeDefined();
    expect(finalRun.node_states['worker-1_1']).toBeDefined();
    expect(finalRun.node_states['worker-1_2']).toBeDefined();
    
    // Verify collector waited for all paths
    expect(finalRun.node_states['collector-1'].status).toBe('completed');
    expect(finalRun.node_states['collector-1'].output).toBeInstanceOf(Array);
  });
});
```

### Entity Movement Workflow Test

```typescript
describe('Entity Movement Workflow', () => {
  it('should move entity through sections', async () => {
    // Create BMC with sections
    const bmc = await createFlow({
      name: 'BMC',
      canvas: {
        nodes: [
          { id: 'section-marketing', type: 'Section', data: { label: 'Marketing' } },
          { id: 'section-sales', type: 'Section', data: { label: 'Sales' } },
        ],
        edges: [],
      },
    });

    // Create workflow with entity movement
    const workflow = await createFlow({
      name: 'Lead Qualification',
      canvas: {
        nodes: [
          {
            id: 'worker-qualify',
            type: 'Worker',
            data: {
              worker_type: 'testing',
              entityMovement: {
                onSuccess: {
                  targetSectionId: 'section-sales',
                  completeAs: 'success',
                  setEntityType: 'customer',
                },
              },
            },
          },
        ],
        edges: [],
      },
    });

    // Create entity
    const entity = await createEntity({
      canvas_id: bmc.id,
      name: 'Test Lead',
      entity_type: 'lead',
      current_node_id: 'section-marketing',
    });

    // Execute workflow with entity
    const run = await startRun(workflow.id, {
      input: {},
      entity_id: entity.id,
    });

    await waitForCompletion(run.id);

    // Verify entity moved to sales section
    const updatedEntity = await getEntity(entity.id);
    expect(updatedEntity.current_node_id).toBe('section-sales');
    expect(updatedEntity.entity_type).toBe('customer');
    
    // Verify journey event was created
    expect(updatedEntity.journey.length).toBeGreaterThan(0);
    expect(updatedEntity.journey[0].event_type).toBe('section_entry');
  });
});
```

## Mocking Strategies

### When to Mock

Mock external dependencies:
- External API calls (workers, webhooks)
- Database operations (for pure unit tests)
- Time-dependent operations
- File system operations

Don't mock:
- Internal business logic
- Database operations (for integration tests)
- Type definitions

### Mocking Database Operations

```typescript
import { vi } from 'vitest';
import * as runs from '@/lib/db/runs';

vi.mock('@/lib/db/runs');

// Mock specific function
vi.mocked(runs.getRunAdmin).mockResolvedValue({
  id: 'run-123',
  flow_id: 'flow-456',
  // ... other fields
});

// Mock with different return values
vi.mocked(runs.updateNodeState)
  .mockResolvedValueOnce({ success: true })
  .mockResolvedValueOnce({ success: false });
```

### Mocking Workers

```typescript
import { vi } from 'vitest';
import { getWorker } from '@/lib/workers/registry';

vi.mock('@/lib/workers/registry');

const mockWorker = {
  execute: vi.fn().mockResolvedValue(undefined),
};

vi.mocked(getWorker).mockReturnValue(mockWorker);
```

### Mocking Fetch

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ result: 'success' }),
});

// Verify fetch was called
expect(fetch).toHaveBeenCalledWith(
  'https://example.com/api',
  expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({
      'Content-Type': 'application/json',
    }),
  })
);
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should move entity to success section when worker completes successfully')

// Bad
it('test entity movement')
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should calculate entity position correctly', () => {
  // Arrange
  const node = { id: 'node-1', position: { x: 100, y: 200 } };
  const viewport = { x: 50, y: 50, zoom: 1 };
  
  // Act
  const position = calculateEntityPosition(node, viewport);
  
  // Assert
  expect(position).toEqual({ x: 150, y: 250 });
});
```

### 3. Test Isolation

Each test should be independent:

```typescript
describe('Flow Operations', () => {
  let testFlowId: string;

  beforeEach(async () => {
    // Create fresh test data
    const flow = await createFlow({ name: 'Test' });
    testFlowId = flow.id;
  });

  afterEach(async () => {
    // Clean up
    await deleteFlow(testFlowId);
  });

  it('test 1', async () => {
    // Uses testFlowId
  });

  it('test 2', async () => {
    // Uses different testFlowId (created in beforeEach)
  });
});
```

### 4. Property Test Configuration

Configure property tests appropriately:

```typescript
fc.assert(
  fc.property(/* ... */),
  {
    numRuns: 100,        // Run 100 random test cases
    seed: 42,            // Optional: for reproducibility
    endOnFailure: true,  // Stop on first failure
  }
);
```

### 5. Test Requirements Traceability

Link tests to requirements:

```typescript
/**
 * Tests: Requirements 5.1, 5.2, 5.3
 */
describe('Entity Movement', () => {
  it('should apply onSuccess movement (Requirement 5.3)', async () => {
    // Test implementation
  });
});
```

### 6. Error Testing

Test error conditions explicitly:

```typescript
it('should handle database errors gracefully', async () => {
  vi.mocked(runs.getRunAdmin).mockRejectedValue(new Error('DB error'));

  // Should not throw
  await expect(
    applyEntityMovement('run-123', 'node-1', config, 'completed')
  ).resolves.not.toThrow();
});
```

### 7. Async Testing

Handle async operations properly:

```typescript
// Good
it('should complete async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});

// Bad - missing await
it('should complete async operation', () => {
  const result = asyncFunction(); // Returns Promise, not result!
  expect(result).toBe(expected);  // Will fail
});
```

### 8. Property Test Generators

Create reusable generators:

```typescript
// generators.ts
export const nodeArb = fc.record({
  id: fc.string({ minLength: 1 }),
  type: fc.constantFrom('Worker', 'Splitter', 'Collector', 'UX'),
  config: fc.object(),
});

export const graphArb = fc.record({
  nodes: fc.array(nodeArb, { minLength: 1 }),
  edges: fc.array(edgeArb),
});

// test file
import { graphArb } from './generators';

it('property test', () => {
  fc.assert(
    fc.property(graphArb, (graph) => {
      // Test with generated graph
    })
  );
});
```

### 9. Test Coverage

Focus on:
- **Critical paths**: Edge-walking, entity movement, worker execution
- **Error handling**: Failed workers, invalid graphs, missing data
- **Edge cases**: Empty arrays, null values, circular references
- **Integration points**: API endpoints, database operations, worker callbacks

### 10. Performance Testing

For performance-critical code:

```typescript
it('should complete within time limit', async () => {
  const start = Date.now();
  
  await performanceIntensiveOperation();
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // Should complete in < 1s
});
```

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Execution Model](../architecture/execution-model.md) - Edge-walking execution
- [Worker System](../backend/worker-system.md) - Worker implementation
- [Adding Workers](./adding-workers.md) - Creating new workers
- [Entity Features](./entity-features.md) - Entity tracking and movement

## Summary

Stitch uses a comprehensive testing strategy:

- **Unit tests** for isolated function testing
- **Property-based tests** for universal properties
- **Integration tests** for component interaction
- **Worker tests** in mock and live modes
- **Workflow tests** for end-to-end execution

Follow the patterns in this guide to maintain high code quality and catch bugs early. Remember: the database is the source of truth, so integration tests with real database operations are often more valuable than heavily mocked unit tests.
