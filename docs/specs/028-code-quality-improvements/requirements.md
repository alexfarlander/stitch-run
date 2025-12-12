# Requirements Document

## Introduction

This document defines requirements for critical code quality, performance, and architecture improvements to the Stitch system. These improvements address entity visualization accuracy, memory management, error handling, type safety, and code maintainability issues identified through code analysis. The improvements ensure the system adheres to Stitch's core principles: Visual-First Philosophy, Database as Source of Truth, and proper error handling.

## Glossary

- **Entity Dot**: A visual representation of an entity on the canvas
- **Edge Path**: The SVG path that connects two nodes along which entities travel
- **Edge Progress**: A normalized value (0.0 to 1.0) representing an entity's position along an edge
- **Subscription**: A real-time database listener that receives updates when data changes
- **Subscription Channel**: A Supabase real-time connection for a specific table and filter
- **Demo Session**: A temporary workflow execution created for demonstration purposes
- **Node Status**: The execution state of a node (pending, running, completed, failed, waiting_for_user)
- **Status Transition**: A change from one node status to another
- **Re-render**: A React component update cycle that recalculates and redraws UI elements
- **Viewport**: The visible area of the canvas including zoom level and pan position
- **ARIA Label**: Accessibility attribute that provides text descriptions for screen readers
- **State Machine**: A system that defines valid state transitions and prevents invalid ones
- **Idempotency**: The property that an operation produces the same result when called multiple times

## Requirements

### Requirement 1: Entity Edge Path Following

**User Story:** As a business user, I want to see entities travel along the actual visual edge paths between nodes, so that I can accurately track entity movement through the workflow.

#### Acceptance Criteria

1. WHEN an entity is traveling on an edge THEN the Stitch System SHALL position the entity dot along the SVG path of that edge
2. WHEN calculating entity position THEN the Stitch System SHALL use SVG path interpolation based on edge progress
3. WHEN an edge has a curved or custom path THEN the Stitch System SHALL follow that exact path geometry
4. WHEN edge progress is 0.0 THEN the entity dot SHALL be positioned at the source node
5. WHEN edge progress is 1.0 THEN the entity dot SHALL be positioned at the target node
6. WHEN edge progress is 0.5 THEN the entity dot SHALL be positioned at the midpoint of the SVG path

### Requirement 2: Centralized Subscription Management

**User Story:** As a system architect, I want a centralized subscription manager for real-time database updates, so that subscription lifecycle is managed consistently and memory leaks are prevented.

#### Acceptance Criteria

1. THE Stitch System SHALL provide a reusable subscription hook that manages channel lifecycle
2. WHEN a component mounts and creates a subscription THEN the Stitch System SHALL establish a Supabase channel
3. WHEN a component unmounts THEN the Stitch System SHALL unsubscribe and clean up the channel
4. WHEN multiple components subscribe to the same table and filter THEN the Stitch System SHALL reuse a single channel
5. WHEN a subscription receives an update THEN the Stitch System SHALL invoke the registered callback function
6. THE subscription manager SHALL prevent duplicate subscriptions for the same table and filter combination

### Requirement 3: Demo Session Idempotency

**User Story:** As a system operator, I want demo sessions to be idempotent, so that starting a new demo cleans up previous demo data and prevents entity accumulation.

#### Acceptance Criteria

1. WHEN starting a demo session THEN the Stitch System SHALL check for existing demo entities in the target canvas
2. WHEN existing demo entities are found THEN the Stitch System SHALL delete them before creating new demo entities
3. WHEN creating demo entities THEN the Stitch System SHALL tag them with metadata indicating they are demo entities
4. WHEN a demo session completes THEN the Stitch System SHALL provide a cleanup endpoint to remove demo entities
5. WHEN querying entities THEN the Stitch System SHALL allow filtering to exclude demo entities

### Requirement 4: Type-Safe Journey Events

**User Story:** As a developer, I want strongly-typed journey event handling, so that event processing is type-safe and runtime errors are prevented.

#### Acceptance Criteria

1. THE Stitch System SHALL define discriminated union types for database journey events and fallback journey events
2. WHEN normalizing journey events THEN the Stitch System SHALL convert raw events to typed discriminated unions
3. WHEN accessing event properties THEN the Stitch System SHALL use type guards to ensure correct property access
4. THE Stitch System SHALL NOT use `any` type for journey event processing
5. WHEN displaying journey events THEN the Stitch System SHALL handle both database and fallback event types correctly

### Requirement 5: Optimized Entity Position Calculations

**User Story:** As a user viewing a canvas with many entities, I want smooth performance when panning and zooming, so that the interface remains responsive.

#### Acceptance Criteria

1. WHEN the viewport changes THEN the Stitch System SHALL only recalculate positions for entities that have moved
2. WHEN an entity's position data has not changed THEN the Stitch System SHALL use memoized position calculations
3. WHEN calculating entity screen coordinates THEN the Stitch System SHALL memoize based on entity position and viewport state
4. THE Stitch System SHALL avoid recalculating all entity positions on every viewport change
5. WHEN 100 entities are displayed THEN viewport changes SHALL complete within 16ms to maintain 60fps

### Requirement 6: User-Visible Error Handling

**User Story:** As a workflow operator, I want to see error messages in the UI when run status fails to load, so that I can understand and respond to system issues.

#### Acceptance Criteria

1. WHEN run status loading fails THEN the Stitch System SHALL display an error message in the UI
2. THE error message SHALL include a user-friendly description of the failure
3. THE error message SHALL be visually distinct with appropriate styling (color, icon)
4. WHEN an error occurs THEN the Stitch System SHALL log detailed error information for debugging
5. THE Stitch System SHALL NOT silently fail and return null without user notification

### Requirement 7: Node Status Transition Validation

**User Story:** As a system architect, I want node status transitions to be validated by a state machine, so that invalid state changes are prevented.

#### Acceptance Criteria

1. THE Stitch System SHALL define valid status transitions for each node status
2. WHEN attempting to change node status THEN the Stitch System SHALL validate the transition is allowed
3. WHEN a transition from 'completed' to 'pending' is attempted THEN the Stitch System SHALL reject it
4. WHEN a transition from 'failed' to 'running' is attempted THEN the Stitch System SHALL allow it (retry case)
5. WHEN an invalid transition is attempted THEN the Stitch System SHALL return an error without modifying state
6. THE Stitch System SHALL allow transitions from 'pending' to 'running', 'running' to 'completed', 'running' to 'failed', and 'running' to 'waiting_for_user'

### Requirement 8: Accessibility for Node Status Indicators

**User Story:** As a user relying on screen readers, I want node status indicators to have ARIA labels, so that I can understand node states through assistive technology.

#### Acceptance Criteria

1. WHEN rendering a node status indicator THEN the Stitch System SHALL include an ARIA label describing the status
2. THE ARIA label SHALL use the format "Node status: {status_name}"
3. THE status indicator SHALL have role="status" attribute
4. THE status indicator SHALL have aria-live="polite" to announce status changes
5. WHEN node status changes THEN screen readers SHALL announce the new status

### Requirement 9: Elimination of Code Duplication

**User Story:** As a developer, I want BMC generation logic to exist in a single location, so that changes are consistent and maintenance is simplified.

#### Acceptance Criteria

1. THE Stitch System SHALL define BMC generation logic in the lib/seeds directory
2. WHEN scripts need to generate BMC data THEN they SHALL import functions from lib/seeds
3. THE Stitch System SHALL NOT duplicate BMC structure definitions across multiple files
4. WHEN BMC structure changes THEN only one source file SHALL require updates
5. THE seed scripts SHALL contain only orchestration and verification logic, not generation logic

### Requirement 10: Separation of Concerns in Demo Mode

**User Story:** As a developer, I want demo orchestration logic separated from UI components, so that the architecture follows Single Responsibility Principle.

#### Acceptance Criteria

1. THE Stitch System SHALL provide a DemoManager class that handles demo orchestration
2. THE DemoModeButton component SHALL delegate demo operations to the DemoManager
3. THE DemoManager SHALL handle API calls, state management, and error handling
4. THE DemoModeButton component SHALL only handle UI rendering and user interactions
5. WHEN demo logic changes THEN the DemoModeButton component SHALL NOT require modifications
