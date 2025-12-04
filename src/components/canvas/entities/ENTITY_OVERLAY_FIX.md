# EntityOverlay Component Fix

## Summary

Fixed the EntityOverlay component to correctly calculate entity positions on the canvas by updating the codebase to use React Flow v12's `parentId` property instead of the deprecated `parentNode` property.

## Changes Made

### 1. Updated Type Definitions (`src/types/stitch.ts`)
- Changed `StitchNode` interface to use `parentId?: string` instead of `parentNode?: string`
- Added comment explaining that React Flow v12+ uses `parentId`

### 2. Updated Position Calculation Functions (`src/lib/entities/position.ts`)
- Updated `getEntityNodePosition()` to use `currentNode.parentId` instead of `currentNode.parentNode`
- Updated `getEntityEdgePosition()` to use `currentNode.parentId` for both source and target nodes
- Updated `calculateScreenPosition()` to use `currentNode.parentId`
- All functions now correctly recursively sum parent positions using the correct property name

### 3. Updated BMCCanvas Component (`src/components/canvas/BMCCanvas.tsx`)
- Changed node transformation to pass `parentId: node.parentId` instead of `parentNode: node.parentNode`
- This ensures React Flow receives the correct property name

### 4. Updated Seed Scripts
- **default-bmc.ts**: Changed `parentNode` to `parentId` in item node creation
- **demo-journey.ts**: Changed `parentNode` to `parentId` in item node creation

### 5. Updated Tests (`src/lib/entities/__tests__/position.property.test.ts`)
- Updated all test cases to use `parentId` instead of `parentNode` when creating test nodes
- All 5 property-based tests now pass successfully

## React Flow v12 Migration

According to React Flow's official documentation:
- **v11.11.0**: `parentNode` was deprecated and renamed to `parentId`
- **v12.0.0**: `parentNode` was completely removed
- The property was renamed because it was misleading - it's not a reference to the parent node object, but the ID string of the parent node

## Verification

All verification checks pass:
- ✅ Position property tests (5/5 passing)
- ✅ Canvas component tests (18/18 passing)
- ✅ BMC verification script (6/6 checks passing)

## EntityOverlay Implementation

The EntityOverlay component now correctly:
1. ✅ Uses fixed `calculateScreenPosition` function (via `getEntityNodePosition` and `getEntityEdgePosition`)
2. ✅ Receives viewport transform from React Flow via `useViewport()` hook
3. ✅ Queries entities for canvas from database via `useEntities(canvasId)` hook
4. ✅ Renders entity dots at calculated positions by applying viewport transform

The position calculation correctly handles:
- Nodes without parents (uses node position directly)
- Nodes with single parent (sums parent + child positions)
- Deeply nested hierarchies (recursively sums all ancestor positions)
- Missing parent references (gracefully falls back to node position)
- Viewport transforms (applies zoom and pan correctly)

## Requirements Validated

This implementation satisfies:
- **Requirement 7.1**: EntityOverlay receives correct viewport transform from React Flow ✅
- **Requirement 7.2**: Entities are queried from database with current positions ✅
- **Requirement 7.3**: Entity positions are calculated with viewport transform applied correctly ✅
- **Property 20**: Coordinate transformation correctly applies formula after recursively summing parent positions ✅
