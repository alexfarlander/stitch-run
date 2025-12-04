# Canvas Versioning Usage Guide

## Overview

The StitchCanvas component now supports full versioning capabilities, allowing you to:
- Save versions of your canvas
- Run workflows with automatic versioning
- View version history
- Revert to previous versions
- Track unsaved changes

## Features

### 1. Save Version Button
Manually save the current state of your canvas as a new version.

**When to use:**
- After making significant changes
- Before experimenting with new layouts
- To create checkpoints during development

**Behavior:**
- Only enabled when there are unsaved changes
- Creates a new version with commit message "Manual save"
- Updates the current version pointer
- Clears the unsaved changes indicator

### 2. Run Button with Auto-Versioning
Start a workflow run with automatic versioning.

**Behavior:**
- Automatically creates a new version if there are unsaved changes
- Links the run to the specific version used
- Navigates to the run view after starting
- Ensures historical runs always reference the correct canvas state

**Requirements:** 5.1, 5.5

### 3. Current Version Indicator
Shows the current version ID (first 8 characters) in a badge.

**Display:**
- Cyan badge with GitBranch icon
- Shows "v{version_id}"
- Only visible when a version exists

### 4. Unsaved Changes Indicator
Alerts you when the canvas has been modified since the last save.

**Display:**
- Amber badge with AlertCircle icon
- Shows "Unsaved changes"
- Appears immediately when nodes or edges are modified

**Detection:**
- Compares current graph state with original saved state
- Uses JSON serialization for deep equality check
- Tracks node positions, data, and edge configurations

### 5. Version History Panel
View and manage all versions of the canvas.

**Features:**
- Timeline view of all versions
- Relative timestamps (e.g., "2 hours ago")
- Commit messages for each version
- Current version highlighted
- View historical versions
- Revert to previous versions

**Actions:**
- **View:** Load a historical version into the canvas (read-only)
- **Revert:** Create a new version based on a historical version

## Usage

### Enable Versioning in Canvas

```tsx
import { StitchCanvas } from '@/components/canvas';

<StitchCanvas 
  flow={flow} 
  editable={true}  // Enable versioning controls
/>
```

### Editable Mode vs View Mode

**Editable Mode (`editable={true}`):**
- Shows versioning controls
- Enables node dragging
- Tracks changes
- Allows saving and running

**View Mode (`editable={false}` or omitted):**
- No versioning controls
- Read-only canvas
- Used for viewing runs or historical versions

## API Integration

### Save Version
```typescript
await createVersion(flowId, visualGraph, 'Manual save');
```

### Run with Auto-Versioning
```typescript
const response = await fetch(`/api/flows/${flowId}/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ visualGraph }),
});
```

The API endpoint automatically:
1. Checks for unsaved changes
2. Creates a new version if needed
3. Links the run to the version
4. Returns the run ID

## Implementation Details

### Change Detection
The component tracks changes by:
1. Storing the original graph state on mount
2. Comparing current state with original on every change
3. Using JSON serialization for deep equality

### Type Conversion
The component handles conversion between:
- `StitchNode` → `VisualNode` (for versioning API)
- `VisualNode` → ReactFlow nodes (for rendering)

### State Management
Uses ReactFlow's built-in state management:
- `useNodesState` for node tracking
- `useEdgesState` for edge tracking
- Enables undo/redo capabilities (future enhancement)

## Requirements Validation

✅ **Requirement 5.1:** Auto-versioning on run with unsaved changes
✅ **Requirement 5.5:** Current version indicator and save functionality

## Future Enhancements

- Commit message input dialog
- Diff view between versions
- Undo/redo functionality
- Keyboard shortcuts (Cmd+S to save)
- Version branching
- Collaborative editing with conflict resolution
