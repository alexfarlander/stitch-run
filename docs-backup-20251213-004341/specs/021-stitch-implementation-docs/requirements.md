# Requirements Document

## Introduction

This specification defines the requirements for creating comprehensive implementation documentation for the Stitch orchestration platform. The documentation will map the entire backend architecture, frontend components, data flows, and identify implementation gaps to guide frontend developers in building on the existing foundation.

## Glossary

- **Stitch**: A Living Business Model Canvas orchestration platform that executes workflows and tracks entities
- **Canvas**: A visual graph representation of workflows or Business Model Canvas sections
- **Entity**: A tracked customer, lead, or churned user moving through the canvas
- **Worker**: An execution node that delegates work to external services (Claude, MiniMax, etc.)
- **Edge-Walking**: The execution model where completed nodes trigger downstream nodes by traversing edges
- **OEG**: Optimized Execution Graph - a compiled, runtime-optimized version of the visual graph
- **BMC**: Business Model Canvas - the top-level 12-section view
- **Visual Graph**: The UI representation with positions, styles, and React Flow properties
- **Execution Graph**: The stripped-down runtime representation with O(1) lookup structures

## Requirements

### Requirement 1: Architecture Documentation

**User Story:** As a developer, I want comprehensive architecture documentation, so that I can understand how Stitch components interact and make informed implementation decisions.

#### Acceptance Criteria

1. WHEN reviewing architecture docs THEN the system SHALL provide a complete overview of the backend architecture including all major subsystems
2. WHEN examining data flow THEN the system SHALL document how data moves from API requests through the execution engine to database persistence
3. WHEN studying component relationships THEN the system SHALL include Mermaid diagrams showing component dependencies and interactions
4. WHEN understanding execution flow THEN the system SHALL document the edge-walking execution model with sequence diagrams
5. WHEN reviewing the type system THEN the system SHALL document all core TypeScript interfaces and their relationships

### Requirement 2: Backend Component Mapping

**User Story:** As a backend developer, I want detailed documentation of each backend component, so that I can understand what each module does and how to extend it.

#### Acceptance Criteria

1. WHEN examining the execution engine THEN the system SHALL document edge-walker, node handlers, and status transitions
2. WHEN reviewing the database layer THEN the system SHALL document all database operations for flows, runs, entities, and versions
3. WHEN studying the worker system THEN the system SHALL document the worker registry, base interfaces, and all integrated workers
4. WHEN examining the canvas system THEN the system SHALL document version management, OEG compilation, and graph validation
5. WHEN reviewing the webhook system THEN the system SHALL document webhook processing, adapters, and entity creation
6. WHEN studying the AI Manager THEN the system SHALL document LLM integration, context building, and action execution

### Requirement 3: Frontend Component Mapping

**User Story:** As a frontend developer, I want detailed documentation of all React components, so that I can understand the UI architecture and build new features.

#### Acceptance Criteria

1. WHEN examining canvas components THEN the system SHALL document BMCCanvas, WorkflowCanvas, and CanvasRouter
2. WHEN reviewing node components THEN the system SHALL document all node types (Worker, Splitter, Collector, UX, Section, Item)
3. WHEN studying entity visualization THEN the system SHALL document EntityOverlay, EntityDot, and journey animations
4. WHEN examining hooks THEN the system SHALL document useFlow, useEntities, useRunStatus, and useCanvasNavigation
5. WHEN reviewing real-time features THEN the system SHALL document Supabase subscriptions and state management

### Requirement 4: API Documentation

**User Story:** As an API consumer, I want complete API documentation, so that I can integrate with Stitch programmatically.

#### Acceptance Criteria

1. WHEN reviewing REST endpoints THEN the system SHALL document all API routes with request/response schemas
2. WHEN examining canvas operations THEN the system SHALL document GET /api/canvas, POST /api/canvas, and canvas management
3. WHEN studying workflow execution THEN the system SHALL document run creation, status checking, and callback handling
4. WHEN reviewing webhook integration THEN the system SHALL document webhook configuration and processing
5. WHEN examining AI Manager THEN the system SHALL document natural language workflow creation and modification

### Requirement 5: Data Flow Documentation

**User Story:** As a system architect, I want data flow diagrams, so that I can understand how information moves through the system.

#### Acceptance Criteria

1. WHEN examining workflow execution THEN the system SHALL provide sequence diagrams showing the complete execution flow
2. WHEN reviewing entity movement THEN the system SHALL document how entities move from webhooks through workflows to sections
3. WHEN studying version management THEN the system SHALL document the flow from visual graph to execution graph
4. WHEN examining real-time updates THEN the system SHALL document how database changes propagate to the UI
5. WHEN reviewing worker callbacks THEN the system SHALL document the async worker pattern and callback flow

### Requirement 6: Implementation Gap Analysis

**User Story:** As a product manager, I want to know what features are missing, so that I can prioritize development work.

#### Acceptance Criteria

1. WHEN reviewing frontend gaps THEN the system SHALL identify unimplemented UI components and features
2. WHEN examining backend gaps THEN the system SHALL identify missing API endpoints or incomplete features
3. WHEN studying entity tracking THEN the system SHALL identify gaps in entity movement and journey visualization
4. WHEN reviewing testing THEN the system SHALL identify areas lacking test coverage
5. WHEN examining documentation THEN the system SHALL identify undocumented features or unclear implementations

### Requirement 7: Developer Onboarding Guide

**User Story:** As a new developer, I want a clear onboarding guide, so that I can quickly understand the codebase and start contributing.

#### Acceptance Criteria

1. WHEN starting development THEN the system SHALL provide a quick-start guide with setup instructions
2. WHEN learning the architecture THEN the system SHALL provide a high-level overview with links to detailed docs
3. WHEN understanding workflows THEN the system SHALL provide example workflows with explanations
4. WHEN learning patterns THEN the system SHALL document common patterns (edge-walking, async workers, entity movement)
5. WHEN contributing code THEN the system SHALL provide guidelines for adding new workers, nodes, or features

### Requirement 8: File Organization

**User Story:** As a documentation maintainer, I want well-organized documentation files, so that information is easy to find and update.

#### Acceptance Criteria

1. WHEN browsing documentation THEN the system SHALL organize files in a logical hierarchy under /docs/implementation
2. WHEN searching for information THEN the system SHALL use clear, descriptive file names that indicate content
3. WHEN navigating docs THEN the system SHALL provide a master index/README linking to all documentation
4. WHEN viewing diagrams THEN the system SHALL store Mermaid diagrams in separate files for reusability
5. WHEN updating docs THEN the system SHALL avoid monolithic files by breaking content into focused documents

### Requirement 9: Mermaid Diagram Coverage

**User Story:** As a visual learner, I want comprehensive diagrams, so that I can understand system architecture and flows visually.

#### Acceptance Criteria

1. WHEN reviewing architecture THEN the system SHALL provide component dependency diagrams
2. WHEN studying execution THEN the system SHALL provide sequence diagrams for workflow execution
3. WHEN examining data models THEN the system SHALL provide entity-relationship diagrams
4. WHEN understanding flows THEN the system SHALL provide flowcharts for complex processes
5. WHEN reviewing the type system THEN the system SHALL provide class diagrams showing type relationships

### Requirement 10: Frontend Development Guide

**User Story:** As a frontend developer, I want clear instructions on building UI features, so that I can extend the canvas and entity visualization.

#### Acceptance Criteria

1. WHEN adding new node types THEN the system SHALL document the process for creating custom nodes
2. WHEN implementing entity features THEN the system SHALL document how to add entity interactions and animations
3. WHEN building canvas features THEN the system SHALL document React Flow integration patterns
4. WHEN adding real-time features THEN the system SHALL document Supabase subscription patterns
5. WHEN styling components THEN the system SHALL document the Tailwind CSS approach and design system
