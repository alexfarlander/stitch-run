# Requirements: Foundation Stabilization (Phase 0)

## Overview

This spec covers Phase 0 of the Workflow Management UI refactor: stabilizing the foundation to ensure the application doesn't crash and verifying what infrastructure exists before building new features.

## Glossary

- **Canvas**: A visual workflow representation in the Stitch system
- **Canvas List**: The page displaying all available canvases for a user
- **Canvas Detail Page**: The page showing a specific canvas with its workflow
- **API Route**: A Next.js API endpoint that handles HTTP requests
- **Database Table**: A Supabase PostgreSQL table storing application data
- **Build Process**: The TypeScript compilation and Next.js build process
- **RLS Policy**: Row Level Security policy in Supabase for access control

## User Stories

### US-1: View Canvas List

**As a** user  
**I want** to view a list of my canvases  
**So that** I can navigate to the workflows I need to work with

**Acceptance Criteria** (EARS format):

1. WHEN a user navigates to /canvases THEN the system SHALL display the canvas list page without errors
2. WHEN the canvas list page loads THEN the system SHALL fetch and display all canvases for the current user
3. WHEN a user clicks the "Create Canvas" button THEN the system SHALL open the canvas creation modal
4. WHEN a user creates a new canvas THEN the system SHALL add it to the canvas list

### US-2: View Canvas Detail

**As a** user  
**I want** to navigate to a specific canvas  
**So that** I can view and work with that workflow

**Acceptance Criteria** (EARS format):

1. WHEN a user navigates to /canvas/[id] THEN the system SHALL load the canvas detail page without crashing
2. WHEN the canvas detail page loads THEN the system SHALL display the canvas component
3. WHEN the canvas has nodes and edges THEN the system SHALL render them on the canvas

### US-3: Successful Build

**As a** developer  
**I want** the application to build without errors  
**So that** I can deploy and develop with confidence

**Acceptance Criteria** (EARS format):

1. WHEN the build command is executed THEN the system SHALL complete the TypeScript compilation without errors
2. WHEN the build command is executed THEN the system SHALL complete the Next.js build without errors
3. WHEN TypeScript errors exist THEN the system SHALL report them clearly
4. WHEN import errors exist THEN the system SHALL report them clearly

### US-4: API Route Verification

**As a** developer  
**I want** to verify what API routes exist  
**So that** I know what infrastructure is available for feature development

**Acceptance Criteria** (EARS format):

1. WHEN checking API routes THEN the system SHALL verify and document presence of POST /api/flows/{flowId}/run
2. WHEN checking API routes THEN the system SHALL verify and document presence of entity CRUD endpoints at /api/entities
3. WHEN checking API routes THEN the system SHALL verify and document presence of node management endpoints at /api/canvas/[id]/nodes
4. WHEN checking API routes THEN the system SHALL verify and document presence of edge management endpoints at /api/canvas/[id]/edges
5. WHEN checking API routes THEN the system SHALL verify and document which endpoints exist for function registry, schedules, webhooks, and integrations
6. WHEN API routes are missing THEN the system SHALL record them as gaps for future phases

### US-5: Database Schema Verification

**As a** developer  
**I want** to verify what database migrations have been applied  
**So that** I know what data infrastructure is available

**Acceptance Criteria** (EARS format):

1. WHEN checking the database THEN the system SHALL verify whether migration 019 is applied (adds company column to stitch_entities)
2. WHEN checking the database THEN the system SHALL verify whether migration 015 is applied (adds require_signature column to stitch_webhook_configs)
3. WHEN checking the database THEN the system SHALL verify whether migration 016 is applied (creates stitch_schedules table)
4. WHEN checking the database THEN the system SHALL verify that stitch_runs table exists
5. WHEN checking the database THEN the system SHALL verify that RLS policies exist on core tables
6. WHEN migrations are not applied THEN the system SHALL record which migrations are missing

## Non-Functional Requirements

### Performance
- Canvas list page SHALL load within 2 seconds
- Canvas detail page SHALL load within 2 seconds
- Build process SHALL complete within 5 minutes

### Reliability
- Application SHALL not crash when navigating to any verified page
- API routes SHALL return appropriate HTTP status codes
- Database queries SHALL handle missing data gracefully

### Maintainability
- All broken imports SHALL be removed or fixed
- All TypeScript errors SHALL be resolved
- Documentation SHALL be created for verified infrastructure

## Out of Scope

This spec does NOT include:
- Adding new features or functionality
- Fixing non-critical UI issues
- Performance optimization beyond basic sanity checks
- Adding new API routes (only documenting what exists)
- Creating new database tables (only documenting what exists)
- Modifying database schema
- Implementing authentication or authorization
- Writing automated tests

**Note**: The primary objective is "builds and pages don't crash" - performance targets are sanity goals only.
