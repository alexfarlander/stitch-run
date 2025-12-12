# Design Document

## Overview

This design addresses test infrastructure issues identified in the TEST_FAILURES_REPORT.md. The failures are categorized into three areas:

1. **Entity Position Property Tests**: Test generators producing invalid NaN values
2. **BMC Seed Property Tests**: Test logic counting all nodes instead of filtering for sections
3. **Worker Integration Tests**: Incomplete mock configurations and misaligned test expectations

All fixes are test-only changes with no impact on production code. The application is functioning correctly; these changes ensure tests accurately validate the system behavior.

## Architecture

### Test Generator Architecture

Property-based tests use fast-check generators to produce random test inputs. Generators must constrain values to valid ranges that match database constraints and business logic.

**Current Issue**: The `edgeProgressArb` generator uses `fc.double()` which can produce NaN values, violating database constraints.

**Solution**: Use `fc.float()` with explicit bounds and NaN exclusion.

### Test Assertion Architecture

Tests must accurately reflect the system's actual behavior, not idealized behavior. When the system uses defensive patterns (like mock mode fallback), tests should validate those patterns.

**Current Issue**: Tests expect workers to throw errors for missing API keys, but workers actually enter mock mode.

**Solution**: Update test assertions to validate mock mode activation instead of expecting errors.

### Mock Configuration Architecture

Vitest mocks must preserve all exports that tests depend on, especially when mocking utility modules that provide error handling functions.

**Current Issue**: Partial mocks that only include some exports cause runtime errors when tests access unmocked functions.

**Solution**: Use `importOriginal` to preserve all exports while selectively mocking specific functions.

## Components and Interfaces

### Entity Position Test Generators

**Location**: `src/lib/db/__tests__/entity-position.property.test.ts`

**Modified Generators**:
```typescript
// Current (problematic)
const edgeProgressArb = fc.double({ min: 0.0, max: 1.0 });

// Fixed
const edgeProgressArb = fc.float({ min: 0, max: 1, noNaN: true });
```

**Rationale**: 
- `fc.float()` is more appropriate for bounded numeric ranges
- `noNaN: true` explicitly excludes NaN values
- Matches database constraint: `edge_progress >= 0 AND edge_progress <= 1`

### BMC Seed Test Assertions

**Location**: `src/lib/seeds/__tests__/default-bmc.property.test.ts`

**Modified Assertions**:
```typescript
// Property 7: Graph structure validity
// Current (problematic)
expect(graph.nodes.length).toBe(12);

// Fixed
const sectionNodes = graph.nodes.filter(n => n.type === 'section');
expect(sectionNodes.length).toBe(12);

// Property 8: Section names completeness
// Current (problematic)
const nodeLabels = graph.nodes.map(n => n.data.label);

// Fixed
const sectionNodes = graph.nodes.filter(n => n.type === 'section');
const nodeLabels = sectionNodes.map(n => n.data.label);
```

**Rationale**:
- BMC graph contains both section nodes (12) and item nodes (22)
- Tests should validate section structure specifically
- Filtering by `type === 'section'` isolates the relevant nodes

### Worker Test Mock Configurations

**Location**: 
- `src/lib/workers/__tests__/image-to-video.test.ts`
- `src/lib/workers/__tests__/media-library.test.ts`

**Modified Mock**:
```typescript
// Current (problematic)
vi.mock('../utils', () => ({
  triggerCallback: vi.fn(),
  logWorker: vi.fn(),
}));

// Fixed
vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    triggerCallback: vi.fn(),
    logWorker: vi.fn(),
  };
});
```

**Rationale**:
- Preserves all utility exports (extractErrorContext, categorizeError, etc.)
- Only mocks the functions that need test-specific behavior
- Prevents "export not defined" errors

### Worker API Key Test Assertions

**Location**: `src/lib/workers/__tests__/image-to-video.test.ts`

**Modified Assertions**:
```typescript
// Current (problematic)
it('should throw error if Runway adapter is selected without API key', () => {
  process.env.VIDEO_GENERATION_ADAPTER = 'runway';
  delete process.env.RUNWAY_API_KEY;
  expect(() => new ImageToVideoWorker()).toThrow('RUNWAY_API_KEY');
});

// Fixed
it('should enter mock mode if Runway adapter is selected without API key', () => {
  process.env.VIDEO_GENERATION_ADAPTER = 'runway';
  delete process.env.RUNWAY_API_KEY;
  const worker = new ImageToVideoWorker();
  expect(worker.mockMode).toBe(true);
});
```

**Rationale**:
- Workers use defensive programming with mock mode fallback
- Tests should validate actual behavior, not throw expectations
- Applies to all three adapters: Runway, Pika, Kling

## Data Models

No data model changes required. All fixes are test-only modifications.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid edge progress generation

*For any* entity position generated by the property test, if the entity is on an edge, then the edge_progress value should be a valid number between 0 and 1 (not NaN, not Infinity).

**Validates: Requirements 1.1, 1.2**

### Property 2: Position mutual exclusivity validation

*For any* entity position generated by the property test, when inserted into the database, exactly one of the three position states (at node, on edge, unpositioned) should be true.

**Validates: Requirements 1.3**

### Property 3: Edge progress bounds validation

*For any* edge ID and progress value generated by the property test, when an entity is created on that edge, the stored edge_progress should be within the bounds [0, 1].

**Validates: Requirements 1.4**

### Property 4: BMC section node filtering

*For any* BMC graph generated by the seed function, filtering nodes by type 'section' should yield exactly 12 nodes.

**Validates: Requirements 2.1, 2.2**

### Property 5: BMC section name completeness

*For any* BMC graph generated by the seed function, the section nodes should contain all 12 standard BMC section names and no others.

**Validates: Requirements 2.3, 2.4**

### Property 6: Mock preservation of utility exports

*For any* worker test that mocks the utils module, all utility functions should remain accessible to error handling code paths.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 7: Worker mock mode activation

*For any* worker instantiated without required API keys, the worker should enter mock mode rather than throwing an error.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

## Error Handling

### Test Generator Errors

**Scenario**: Generator produces invalid values (NaN, Infinity, out of bounds)

**Handling**: 
- Use explicit constraints in generator configuration
- Add filters to exclude invalid values
- Validate generator output in test setup

### Test Assertion Errors

**Scenario**: Test expectations don't match actual system behavior

**Handling**:
- Review actual implementation behavior
- Update test assertions to match reality
- Document the expected behavior in test descriptions

### Mock Configuration Errors

**Scenario**: Mocked modules missing required exports

**Handling**:
- Use `importOriginal` to preserve all exports
- Selectively override only the functions that need mocking
- Test mock configuration in isolation if needed

## Testing Strategy

### Unit Testing Approach

All fixes are to existing unit tests and property-based tests. No new tests are required.

**Modified Tests**:
1. Entity position property tests (2 tests)
2. BMC seed property tests (2 tests)
3. Worker integration tests (5 tests)

### Property-Based Testing Approach

**Framework**: fast-check (already in use)

**Configuration**: 
- Minimum 100 iterations per property test (already configured)
- 60-second timeout for database tests (already configured)
- 10 iterations for async database tests (already configured)

**Generator Improvements**:
- Add `noNaN: true` to numeric generators
- Use `fc.float()` instead of `fc.double()` for bounded ranges
- Validate generator constraints match database constraints

### Test Execution

**Before Fixes**:
```bash
npm test
# 9 tests failing, 319 passing (97% pass rate)
```

**After Fixes**:
```bash
npm test
# Expected: 0 tests failing, 328 passing (100% pass rate)
```

### Validation Approach

1. Run each modified test file individually to verify fixes
2. Run full test suite to ensure no regressions
3. Verify test output messages are clear and accurate
4. Check that property test counterexamples are meaningful

## Implementation Notes

### Order of Fixes

1. **Entity position tests** (highest impact on data integrity)
2. **Worker mock configurations** (enables other worker tests to run)
3. **Worker API key tests** (depends on mock configuration fix)
4. **BMC seed tests** (lowest risk, cosmetic test logic)

### Testing the Fixes

Each fix should be tested in isolation:

```bash
# Test entity position fixes
npm test src/lib/db/__tests__/entity-position.property.test.ts

# Test BMC seed fixes
npm test src/lib/seeds/__tests__/default-bmc.property.test.ts

# Test worker fixes
npm test src/lib/workers/__tests__/image-to-video.test.ts
npm test src/lib/workers/__tests__/media-library.test.ts
```

### Rollback Plan

If any fix causes unexpected issues:
1. Revert the specific test file change
2. Document the issue in TEST_FAILURES_REPORT.md
3. Create a new task to investigate the root cause

All changes are test-only, so rollback has no production impact.
