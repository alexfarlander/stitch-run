# Implementation Plan

- [x] 1. Fix entity position property test generators
  - Update edge progress generator to use `fc.float()` with `noNaN: true` constraint
  - Ensure generator produces values between 0 and 1 inclusive
  - Verify generator matches database constraint requirements
  - _Requirements: 1.1, 1.2_

- [x] 2. Run entity position property tests to verify fixes
  - Execute property tests for position mutual exclusivity
  - Execute property tests for edge progress bounds
  - Confirm no NaN values are generated in test runs
  - Verify all 100 test iterations pass successfully
  - _Requirements: 1.3, 1.4_

- [x] 3. Fix BMC seed property test assertions
  - Add node type filtering to Property 7 (graph structure validity)
  - Add node type filtering to Property 8 (section names completeness)
  - Filter for `type === 'section'` before counting nodes
  - Extract labels only from section nodes
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Run BMC seed property tests to verify fixes
  - Execute Property 7 test to verify section count
  - Execute Property 8 test to verify section names
  - Confirm tests correctly identify 12 sections
  - Verify all expected section names are validated
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Fix worker test mock configurations
  - Update image-to-video test mock to use `importOriginal`
  - Update media-library test mock to use `importOriginal`
  - Preserve all utility exports while mocking specific functions
  - Ensure extractErrorContext and categorizeError remain accessible
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Fix worker API key validation test assertions
  - Update Runway adapter test to check mock mode instead of expecting error
  - Update Pika adapter test to check mock mode instead of expecting error
  - Update Kling adapter test to check mock mode instead of expecting error
  - Verify worker.mockMode property is accessible in tests
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Run worker integration tests to verify fixes
  - Execute image-to-video worker tests
  - Execute media-library worker tests
  - Confirm all mock configurations work correctly
  - Verify API key validation tests pass with mock mode checks
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Run full test suite to verify all fixes
  - Execute complete test suite with `npm test`
  - Verify 0 tests failing, 328 tests passing (100% pass rate)
  - Confirm no regressions in previously passing tests
  - Update TEST_FAILURES_REPORT.md to reflect successful fixes
  - _Requirements: All_
