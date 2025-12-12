# Testing Gaps Analysis

## Overview

This document identifies areas of the Stitch codebase that lack adequate test coverage. While Stitch has a solid testing foundation with **90 test files** covering approximately **40%** of the codebase (90 test files for 226 source files), there are significant gaps in unit tests, integration tests, and end-to-end testing.

**Current Test Distribution:**
- Unit Tests: ~45 files
- Property-Based Tests: 24 files
- Integration Tests: ~15 files
- End-to-End Tests: 2 files

## Table of Contents

1. [Critical Gaps (High Priority)](#critical-gaps-high-priority)
2. [Backend Testing Gaps](#backend-testing-gaps)
3. [Frontend Testing Gaps](#frontend-testing-gaps)
4. [Integration Testing Gaps](#integration-testing-gaps)
5. [Property-Based Testing Opportunities](#property-based-testing-opportunities)
6. [End-to-End Testing Gaps](#end-to-end-testing-gaps)
7. [Test Infrastructure Improvements](#test-infrastructure-improvements)
8. [Recommendations](#recommendations)

---

## Critical Gaps (High Priority)

These gaps represent the highest risk areas that should be addressed first.

### 1. Webhook Adapters (Zero Coverage)

**Location:** `src/lib/webhooks/adapters/`

**Missing Tests:**
- `calendly.ts` - No tests
- `stripe.ts` - No tests
- `typeform.ts` - No tests
- `n8n.ts` - No tests
- `generic.ts` - No tests

**Impact:** HIGH - Webhook adapters are critical for entity creation and workflow triggering. Bugs here affect the entire entity tracking system.

**Recommended Tests:**
- Unit tests for each adapter's `transform()` method
- Property tests for entity extraction across various webhook payloads
- Integration tests for complete webhook → entity creation flow
- Tests for signature verification (Stripe, Typeform)

**Example Test Needed:**
```typescript
describe('Stripe Webhook Adapter', () => {
  it('should extract customer entity from charge.succeeded event', () => {
    const payload = {
      type: 'charge.succeeded',
      data: {
        object: {
          customer: 'cus_123',
          amount: 5000,
          // ...
        }
      }
    };
    
    const result = stripeAdapter.transform(payload);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe('cus_123');
  });
});
```

### 2. Edge Walker (Minimal Coverage)

**Location:** `src/lib/engine/edge-walker.ts`

**Current Coverage:** No dedicated test file

**Missing Tests:**
- Edge traversal logic
- Parallel path handling
- Circular dependency detection
- Error propagation through edges

**Impact:** HIGH - Edge-walker is the core execution orchestrator. Bugs affect all workflow execution.

**Recommended Tests:**
- Unit tests for `walkEdges()` function
- Property tests for graph traversal invariants
- Integration tests with various graph topologies

### 3. Entity Movement Validation (Partial Coverage)

**Location:** `src/lib/entities/travel.ts`

**Current Coverage:** No dedicated test file

**Missing Tests:**
- Entity movement between sections
- Journey event creation
- Movement validation rules
- Concurrent movement handling

**Impact:** HIGH - Entity movement is a core feature. Bugs affect the Living Canvas experience.

### 4. Demo Manager (Zero Coverage)

**Location:** `src/lib/demo/demo-manager.ts`

**Current Coverage:** No tests

**Missing Tests:**
- Demo mode activation/deactivation
- Demo data generation
- Demo state management
- Cleanup after demo

**Impact:** MEDIUM - Demo mode is important for user onboarding and presentations.

---

## Backend Testing Gaps

### Database Layer

**Location:** `src/lib/db/`

#### Missing Tests:

1. **`webhook-configs.ts`** - No tests
   - CRUD operations for webhook configurations
   - Configuration validation
   - Endpoint slug uniqueness

2. **`utils.ts`** - No tests
   - Database utility functions
   - Connection management
   - Error handling

3. **`entities.ts`** - Partial coverage
   - Missing: Concurrent entity updates
   - Missing: Journey event pagination
   - Missing: Entity filtering and search

#### Recommended Tests:

```typescript
// webhook-configs.test.ts
describe('Webhook Config Operations', () => {
  it('should prevent duplicate endpoint slugs', async () => {
    await createWebhookConfig({ endpoint_slug: 'stripe-prod' });
    
    await expect(
      createWebhookConfig({ endpoint_slug: 'stripe-prod' })
    ).rejects.toThrow('Duplicate endpoint slug');
  });
});
```

### Canvas System

**Location:** `src/lib/canvas/`

#### Missing Tests:

1. **`auto-layout.ts`** - Minimal coverage
   - Missing: Complex graph layouts
   - Missing: Layout optimization
   - Missing: Collision detection

2. **`mermaid-generator.ts`** - Partial coverage
   - Missing: Edge case handling (empty graphs, single nodes)
   - Missing: Special character escaping
   - Missing: Large graph generation

#### Recommended Property Tests:

```typescript
// auto-layout.property.test.ts
it('**Feature: canvas-system, Property: Layout preserves connectivity**', () => {
  fc.assert(
    fc.property(graphArb, (graph) => {
      const layout = autoLayout(graph);
      
      // Property: All edges should still connect valid nodes
      for (const edge of layout.edges) {
        expect(layout.nodes.find(n => n.id === edge.source)).toBeDefined();
        expect(layout.nodes.find(n => n.id === edge.target)).toBeDefined();
      }
    })
  );
});
```

### Workers

**Location:** `src/lib/workers/`

#### Missing Tests:

1. **`minimax.ts`** - No tests
   - Worker execution
   - API integration
   - Error handling

2. **`base.ts`** - No tests
   - Base worker interface
   - Common worker utilities

3. **Worker Registry** - Partial coverage
   - Missing: Dynamic worker registration
   - Missing: Worker not found handling

### Navigation

**Location:** `src/lib/navigation/`

#### Missing Tests:

1. **`canvas-navigation.ts`** - No tests
   - Drill-down navigation
   - Breadcrumb generation
   - Navigation history

**Impact:** MEDIUM - Navigation is important for UX but less critical than execution.

---

## Frontend Testing Gaps

### React Hooks (Minimal Coverage)

**Location:** `src/hooks/`

**Current Coverage:** Only `useRunStatus.ts` has tests (1 of 13 hooks)

#### Missing Tests:

1. **`useFlow.ts`** - No tests
   - Flow data fetching
   - Loading states
   - Error handling

2. **`useEntities.ts`** - No tests
   - Entity list fetching
   - Real-time entity updates
   - Entity filtering

3. **`useCanvasNavigation.ts`** - No tests
   - Navigation state management
   - Drill-down/drill-up
   - Breadcrumb updates

4. **`useRealtimeSubscription.ts`** - No tests
   - Supabase subscription lifecycle
   - Connection handling
   - Reconnection logic

5. **`useEntityMovement.ts`** - No tests
   - Entity movement tracking
   - Animation triggers
   - Movement validation

6. **`useJourneyHistory.ts`** - No tests
   - Journey event fetching
   - History pagination
   - Event filtering

7. **`useDemoManager.ts`** - No tests
   - Demo mode state
   - Demo data management

8. **`useMediaLibrary.ts`** - No tests
   - Media fetching
   - Upload handling
   - Media selection

9. **`useEntityPosition.ts`** - No tests
   - Position calculations
   - Viewport transformations

10. **`useCanvasEntities.ts`** - No tests
    - Entity overlay management
    - Entity filtering by canvas

11. **`use-mobile.ts`** - No tests
    - Mobile detection
    - Responsive behavior

**Impact:** HIGH - Hooks are critical for frontend functionality. Untested hooks lead to UI bugs.

#### Recommended Tests:

```typescript
// useFlow.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useFlow } from '../useFlow';

describe('useFlow', () => {
  it('should fetch flow data', async () => {
    const { result } = renderHook(() => useFlow('flow-123'));
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.flow).toBeDefined();
    });
  });

  it('should handle fetch errors', async () => {
    const { result } = renderHook(() => useFlow('invalid-id'));
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

### Canvas Components (Partial Coverage)

**Location:** `src/components/canvas/`

**Current Coverage:** 4 test files (BMCCanvas, MermaidImportExport, VersionHistory, utils)

#### Missing Tests:

1. **`CanvasRouter.tsx`** - No tests
   - Route handling
   - View switching (BMC ↔ Workflow)
   - Navigation state

2. **`WorkflowCanvas.tsx`** - No tests
   - Workflow rendering
   - Node interactions
   - Edge rendering

3. **`StitchCanvas.tsx`** - No tests
   - Canvas initialization
   - React Flow integration
   - Event handling

4. **`RunStatusOverlay.tsx`** - No tests
   - Status display
   - Real-time updates
   - Error states

5. **`JourneyHistoryPanel.tsx`** - No tests
   - History display
   - Event filtering
   - Timeline rendering

6. **`CanvasBreadcrumbs.tsx`** - No tests
   - Breadcrumb generation
   - Navigation clicks
   - Path display

7. **`DemoModeButton.tsx`** - No tests
   - Demo activation
   - State management
   - UI feedback

### Node Components (Minimal Coverage)

**Location:** `src/components/canvas/nodes/`

**Current Coverage:** Only `FallbackNode.test.tsx` exists

#### Missing Tests:

- `WorkerNode.tsx` - No tests
- `SplitterNode.tsx` - No tests
- `CollectorNode.tsx` - No tests
- `UXNode.tsx` - No tests
- `SectionNode.tsx` - No tests
- `ItemNode.tsx` - No tests
- `BaseNode.tsx` - No tests

**Impact:** MEDIUM - Node rendering bugs affect visual representation but not execution.

### Entity Visualization (Partial Coverage)

**Location:** `src/components/canvas/entities/`

**Current Coverage:** EntityDot and EntityOverlay have tests

#### Missing Tests:

- Entity animation transitions
- Multiple entity rendering
- Entity clustering
- Performance with many entities

### Media Components (Zero Coverage)

**Location:** `src/components/media/`

**Missing Tests:**
- `MediaPicker.tsx` - No tests
- `MediaUploader.tsx` - No tests
- `MediaGrid.tsx` - No tests
- `MediaCard.tsx` - No tests
- `MediaPreview.tsx` - No tests
- `MediaList.tsx` - No tests

**Impact:** MEDIUM - Media library is a newer feature, needs test coverage.

### Layout Components (Zero Coverage)

**Location:** `src/components/`

**Missing Tests:**
- `Navigation.tsx` - No tests
- `FlowLayout.tsx` - No tests
- `HomeLayout.tsx` - No tests
- `RunViewer.tsx` - No tests
- `UXInteractionPanel.tsx` - No tests
- `ErrorBoundary.tsx` - No tests
- `EntityDetailPanel.tsx` - No tests

**Impact:** MEDIUM - Layout components are important for UX.

---

## Integration Testing Gaps

### API Endpoint Integration

**Current Coverage:** Limited integration tests exist

#### Missing Integration Tests:

1. **Canvas Versioning Flow**
   - Create canvas → Edit → Create version → Compile OEG
   - Test complete version lifecycle

2. **Webhook to Entity Flow**
   - Receive webhook → Extract entity → Create entity → Trigger workflow
   - Test with all webhook adapters

3. **Entity Movement Flow**
   - Create entity → Execute workflow → Move to section → Verify journey
   - Test with various movement configurations

4. **AI Manager Workflow Creation**
   - Natural language request → Parse → Create canvas → Validate
   - Test with various workflow types

5. **Demo Mode Flow**
   - Activate demo → Generate data → Execute demo workflow → Cleanup
   - Test demo isolation

6. **Media Library Flow**
   - Upload media → Store → Retrieve → Use in workflow
   - Test with various media types

#### Recommended Integration Tests:

```typescript
// webhook-entity-integration.test.ts
describe('Webhook to Entity Integration', () => {
  it('should create entity from Stripe webhook and trigger workflow', async () => {
    // Setup webhook config
    const config = await createWebhookConfig({
      endpoint_slug: 'stripe-test',
      source: 'stripe',
      canvas_id: bmcId,
      target_section_id: 'section-marketing',
      workflow_id: qualificationWorkflowId,
    });

    // Send webhook
    const response = await POST(
      new NextRequest('http://localhost/api/webhooks/stripe-test', {
        method: 'POST',
        body: JSON.stringify(stripeChargeSucceededPayload),
      })
    );

    expect(response.status).toBe(200);

    // Verify entity created
    const entities = await getEntitiesByCanvas(bmcId);
    expect(entities).toHaveLength(1);
    expect(entities[0].current_node_id).toBe('section-marketing');

    // Verify workflow triggered
    const runs = await getRunsByEntity(entities[0].id);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('running');
  });
});
```

### Database Transaction Tests

**Missing Tests:**
- Concurrent run updates
- Race condition handling in collector nodes
- Atomic entity movements
- Version creation conflicts

### Real-time Subscription Tests

**Missing Tests:**
- Subscription lifecycle
- Multiple client subscriptions
- Subscription error handling
- Reconnection logic

---

## Property-Based Testing Opportunities

### Current Property Tests (24 files)

Existing property tests cover:
- Canvas compilation (OEG)
- Mermaid round-trip
- Splitter/Collector logic
- Worker validation
- Entity position calculations
- Metrics calculations

### Missing Property Tests

#### 1. Graph Validation Properties

```typescript
// validate-graph.property.test.ts
it('**Feature: canvas-system, Property: Valid graphs have no orphaned nodes**', () => {
  fc.assert(
    fc.property(graphArb, (graph) => {
      const validation = validateGraph(graph);
      
      if (validation.valid) {
        // Property: Every node (except start) should have incoming edge
        const nodesWithIncoming = new Set(graph.edges.map(e => e.target));
        const startNodes = graph.nodes.filter(n => n.type === 'UX');
        
        for (const node of graph.nodes) {
          if (!startNodes.includes(node)) {
            expect(nodesWithIncoming.has(node.id)).toBe(true);
          }
        }
      }
    })
  );
});
```

#### 2. Entity Movement Properties

```typescript
// entity-movement.property.test.ts
it('**Feature: entity-tracking, Property: Entity journey is append-only**', () => {
  fc.assert(
    fc.property(
      fc.array(movementArb, { minLength: 1, maxLength: 10 }),
      async (movements) => {
        const entity = await createEntity({ /* ... */ });
        
        for (const movement of movements) {
          await moveEntityToSection(entity.id, movement.targetSection);
        }
        
        const finalEntity = await getEntity(entity.id);
        
        // Property: Journey length should equal number of movements
        expect(finalEntity.journey.length).toBe(movements.length);
        
        // Property: Journey should be chronologically ordered
        for (let i = 1; i < finalEntity.journey.length; i++) {
          expect(finalEntity.journey[i].timestamp)
            .toBeGreaterThan(finalEntity.journey[i-1].timestamp);
        }
      }
    )
  );
});
```

#### 3. Webhook Adapter Properties

```typescript
// webhook-adapters.property.test.ts
it('**Feature: webhook-system, Property: All adapters extract valid entities**', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('stripe', 'typeform', 'calendly', 'n8n'),
      fc.object(), // Random webhook payload
      (adapterName, payload) => {
        const adapter = getAdapter(adapterName);
        const result = adapter.transform(payload);
        
        // Property: Extracted entities should have required fields
        for (const entity of result.entities) {
          expect(entity).toHaveProperty('name');
          expect(entity).toHaveProperty('entity_type');
          expect(typeof entity.name).toBe('string');
          expect(entity.name.length).toBeGreaterThan(0);
        }
      }
    )
  );
});
```

#### 4. Navigation Properties

```typescript
// navigation.property.test.ts
it('**Feature: canvas-navigation, Property: Drill-down then drill-up returns to original**', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
      (path) => {
        const nav = createNavigation();
        
        // Drill down
        for (const segment of path) {
          nav.drillDown(segment);
        }
        
        // Drill up same number of times
        for (let i = 0; i < path.length; i++) {
          nav.drillUp();
        }
        
        // Property: Should be back at root
        expect(nav.getCurrentPath()).toEqual([]);
      }
    )
  );
});
```

#### 5. Auto-Layout Properties

```typescript
// auto-layout.property.test.ts
it('**Feature: canvas-system, Property: Layout prevents node overlap**', () => {
  fc.assert(
    fc.property(graphArb, (graph) => {
      const layout = autoLayout(graph);
      
      // Property: No two nodes should overlap
      for (let i = 0; i < layout.nodes.length; i++) {
        for (let j = i + 1; j < layout.nodes.length; j++) {
          const node1 = layout.nodes[i];
          const node2 = layout.nodes[j];
          
          const distance = Math.sqrt(
            Math.pow(node1.position.x - node2.position.x, 2) +
            Math.pow(node1.position.y - node2.position.y, 2)
          );
          
          expect(distance).toBeGreaterThan(MIN_NODE_DISTANCE);
        }
      }
    })
  );
});
```

---

## End-to-End Testing Gaps

### Current E2E Tests

**Location:** `src/app/api/__tests__/`

**Current Coverage:**
- `end-to-end-workflows.test.ts` - Basic workflow execution
- `error-handling-integration.test.ts` - Error scenarios

### Missing E2E Tests

#### 1. Complete User Journeys

**Missing:**
- User creates BMC → Adds sections → Creates workflow → Executes → Views results
- User receives webhook → Entity created → Workflow triggered → Entity moves → Journey visualized
- User uploads media → Uses in workflow → Generates output → Downloads result

#### 2. Multi-Canvas Scenarios

**Missing:**
- Multiple canvases with shared entities
- Cross-canvas entity movement
- Canvas versioning and rollback

#### 3. Real-time Collaboration

**Missing:**
- Multiple users viewing same canvas
- Real-time updates propagation
- Concurrent edits handling

#### 4. Performance Tests

**Missing:**
- Large graph execution (100+ nodes)
- Many concurrent runs (10+ simultaneous)
- High entity count (1000+ entities)
- Real-time updates with many subscribers

#### 5. Error Recovery

**Missing:**
- Worker failure and retry
- Database connection loss
- Partial execution recovery
- Webhook replay

#### Recommended E2E Tests:

```typescript
// complete-user-journey.e2e.test.ts
describe('Complete User Journey E2E', () => {
  it('should handle full BMC creation and execution flow', async () => {
    // 1. Create BMC
    const bmc = await createCanvas({
      name: 'My Business',
      type: 'bmc',
    });

    // 2. Add sections
    await addSection(bmc.id, { label: 'Marketing', type: 'marketing' });
    await addSection(bmc.id, { label: 'Sales', type: 'sales' });

    // 3. Create workflow
    const workflow = await createCanvas({
      name: 'Lead Qualification',
      type: 'workflow',
      parent_id: bmc.id,
    });

    await addNode(workflow.id, {
      type: 'Worker',
      config: { worker_type: 'claude' },
    });

    // 4. Configure webhook
    await createWebhookConfig({
      endpoint_slug: 'typeform-leads',
      canvas_id: bmc.id,
      workflow_id: workflow.id,
    });

    // 5. Simulate webhook
    await sendWebhook('typeform-leads', typeformPayload);

    // 6. Wait for execution
    await waitForWorkflowCompletion(workflow.id);

    // 7. Verify entity moved
    const entities = await getEntitiesByCanvas(bmc.id);
    expect(entities[0].current_node_id).toBe('section-sales');

    // 8. Verify journey
    expect(entities[0].journey.length).toBeGreaterThan(0);
  });
});
```

---

## Test Infrastructure Improvements

### 1. Test Utilities

**Missing:**
- Shared test fixtures for common data structures
- Test data builders for complex objects
- Assertion helpers for domain-specific checks

**Recommended:**

```typescript
// test/builders.ts
export class FlowBuilder {
  private flow: Partial<Flow> = {};

  withName(name: string) {
    this.flow.name = name;
    return this;
  }

  withNodes(...nodes: Node[]) {
    this.flow.canvas = { nodes, edges: [] };
    return this;
  }

  async build() {
    return await createFlow(this.flow);
  }
}

// Usage
const flow = await new FlowBuilder()
  .withName('Test Flow')
  .withNodes(
    { id: 'ux-1', type: 'UX' },
    { id: 'worker-1', type: 'Worker' }
  )
  .build();
```

### 2. Test Database Management

**Missing:**
- Automated test database setup/teardown
- Test data isolation between test suites
- Database snapshot/restore for faster tests

### 3. Mock Server for Workers

**Missing:**
- Mock server for external worker APIs
- Configurable response delays
- Error injection for testing failure scenarios

### 4. Visual Regression Testing

**Missing:**
- Screenshot comparison for canvas rendering
- Visual diff for node components
- Layout regression detection

### 5. Performance Benchmarking

**Missing:**
- Automated performance benchmarks
- Regression detection for slow operations
- Memory leak detection

---

## Recommendations

### Immediate Priorities (Next Sprint)

1. **Add webhook adapter tests** - Critical for entity creation
2. **Test all React hooks** - Critical for frontend stability
3. **Add edge-walker tests** - Critical for execution reliability
4. **Add entity movement tests** - Critical for core feature

### Short-term (Next Month)

1. Add property tests for graph validation
2. Add integration tests for complete flows
3. Test all node components
4. Add media library tests
5. Add navigation tests

### Medium-term (Next Quarter)

1. Comprehensive E2E test suite
2. Performance testing framework
3. Visual regression testing
4. Test infrastructure improvements
5. Increase overall coverage to 70%+

### Testing Metrics Goals

**Current State:**
- Test Files: 90
- Source Files: 226
- Coverage: ~40%
- Property Tests: 24

**Target State (3 months):**
- Test Files: 150+
- Coverage: 70%+
- Property Tests: 40+
- E2E Tests: 10+
- Integration Tests: 30+

### Testing Best Practices to Adopt

1. **Test-Driven Development** for new features
2. **Property-based testing** for all data transformations
3. **Integration tests** for all API endpoints
4. **E2E tests** for critical user journeys
5. **Visual regression tests** for UI components
6. **Performance benchmarks** for critical paths

---

## Related Documentation

- [Testing Guide](../guides/testing-guide.md) - Testing patterns and practices
- [Architecture Overview](../architecture/overview.md) - System architecture
- [Backend Gaps](./backend-gaps.md) - Backend implementation gaps
- [Frontend Gaps](./frontend-gaps.md) - Frontend implementation gaps

## Summary

Stitch has a solid testing foundation with 90 test files and good coverage of core execution logic. However, significant gaps exist in:

1. **Webhook adapters** (0% coverage) - HIGH PRIORITY
2. **React hooks** (8% coverage) - HIGH PRIORITY
3. **Frontend components** (20% coverage) - MEDIUM PRIORITY
4. **Integration tests** (limited) - MEDIUM PRIORITY
5. **E2E tests** (minimal) - MEDIUM PRIORITY

Addressing these gaps will significantly improve code quality, reduce bugs, and increase confidence in the system's reliability. The recommended approach is to prioritize critical backend components first (webhooks, edge-walker, entity movement), then expand frontend testing, and finally build comprehensive integration and E2E test suites.
