# Requirements Document

## Introduction

This specification addresses test infrastructure and test logic issues identified in the TEST_FAILURES_REPORT.md. Currently, 9 tests are failing across three feature areas (entity tracking, BMC database, and worker integrations). All failures are test-related issues, not functional bugs in the application code. The system is working correctly with a 97% test pass rate (319/328 tests passing).

## Glossary

- **Property-Based Test (PBT)**: A testing approach that validates properties across randomly generated inputs using a testing library (fast-check).
- **Test Generator**: A function in property-based testing that produces random test inputs.
- **Mock Configuration**: Test setup that replaces real dependencies with controlled test doubles.
- **NaN**: "Not a Number" - an invalid numeric value in JavaScript/TypeScript.
- **Section Node**: A node in the BMC graph representing one of the 12 Business Model Canvas sections.
- **Item Node**: A node in the BMC graph representing a visual item within a section.
- **Mock Mode**: A worker operational mode that simulates external API calls without requiring API keys.

## Requirements

### Requirement 1

**User Story:** As a developer, I want property-based tests for entity position tracking to generate valid test data, so that tests accurately validate the system's handling of edge cases.

#### Acceptance Criteria

1. WHEN the entity position property test generates edge progress values, THE test generator SHALL exclude NaN values
2. WHEN the entity position property test generates edge progress values, THE test generator SHALL constrain values to the range 0 to 1 inclusive
3. WHEN the entity position property test runs, THE test SHALL validate position mutual exclusivity without encountering invalid numeric values
4. WHEN the entity position property test runs, THE test SHALL validate edge progress bounds without encountering NaN values

### Requirement 2

**User Story:** As a developer, I want BMC seed property tests to correctly count section nodes, so that tests accurately validate the Business Model Canvas structure.

#### Acceptance Criteria

1. WHEN the BMC graph structure property test counts sections, THE test SHALL filter nodes by type to include only section nodes
2. WHEN the BMC graph structure property test validates section count, THE test SHALL expect exactly 12 section nodes
3. WHEN the BMC section names property test extracts section names, THE test SHALL filter nodes by type to include only section nodes
4. WHEN the BMC section names property test validates completeness, THE test SHALL verify all 12 standard BMC section names are present

### Requirement 3

**User Story:** As a developer, I want worker integration tests to have complete mock configurations, so that tests can properly validate error handling behavior.

#### Acceptance Criteria

1. WHEN worker integration tests mock the utils module, THE mock configuration SHALL include all exported utility functions
2. WHEN worker integration tests mock the utils module, THE mock configuration SHALL preserve the extractErrorContext function
3. WHEN worker integration tests mock the utils module, THE mock configuration SHALL preserve the categorizeError function
4. WHEN worker integration tests execute error handling paths, THE tests SHALL have access to all required utility functions

### Requirement 4

**User Story:** As a developer, I want worker API key validation tests to align with the actual worker behavior, so that tests accurately reflect the system's mock mode design.

#### Acceptance Criteria

1. WHEN a worker is instantiated without required API keys, THE worker SHALL enter mock mode rather than throwing an error
2. WHEN worker tests validate API key requirements, THE tests SHALL verify mock mode activation for missing API keys
3. WHEN worker tests validate Runway adapter initialization, THE test SHALL check for mock mode rather than expecting an error
4. WHEN worker tests validate Pika adapter initialization, THE test SHALL check for mock mode rather than expecting an error
5. WHEN worker tests validate Kling adapter initialization, THE test SHALL check for mock mode rather than expecting an error
