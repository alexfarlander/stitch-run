# 005: Run Management & Workflow Seeding

## Overview

This spec implements Phase 3 of the Workflow Management UI refactor: Run Management with Workflow Seeding. Users can start and monitor workflow runs, including the process of selecting contacts to create entities when starting workflow runs.

## Status

- **Overall**: 0% Complete
- **Started**: December 10, 2025
- **Last Updated**: December 10, 2025
- **Completed**: Not Started

## Documents

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)

## Task Summaries

[Will be populated as tasks are completed]

## Critical Dependencies

### Prerequisites from Phase 2 (Contact Management)
- ✅ Contact database exists (`stitch_contacts`)
- ✅ ContactManager component available for embedding
- ❌ **MISSING**: `contact_id` foreign key in `stitch_entities` (see Phase 2 known issues)

### Required API Endpoints
- ✅ `POST /api/flows/{flowId}/run` - For starting workflow runs
- ✅ `useCanvasEntities` hook - For fetching entities (avoid double-fetch)
- ✅ Entity CRUD endpoints - Already exist

## Scope Changes from Original Plan

**Updated Scope:** This phase now includes workflow seeding - the process of selecting contacts to create entities when starting workflow runs.

**Key Changes:**
- Added workflow seeding (contact → entity conversion)
- EntityListPanel is for entities (workflow instances), not contacts
- ContactManager is embedded in WorkflowSeedModal for contact selection
- Requires fixing entity-contact relationship first

## Critical Issues

1. **Entity-Contact Relationship**: Missing `contact_id` foreign key in `stitch_entities` table
2. **API Endpoint Consistency**: Must use `POST /api/flows/{flowId}/run` (not `/api/canvas/[id]/run`)
3. **Data Fetching**: Must reuse existing `useCanvasEntities` hook to avoid duplicate fetching

## Next Steps

1. Complete requirements document
2. Complete design document
3. Break down into tasks
4. Fix entity-contact relationship (prerequisite)
5. Begin implementation

## Notes

- EntityListPanel shows entities (workflow instances), not contacts
- ContactManager will be embedded in WorkflowSeedModal for contact selection
- This phase bridges contact management (Phase 2) with workflow execution
- Focus on making workflow runs accessible and monitorable by users