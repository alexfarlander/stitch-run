# VersionHistory Component Usage

The `VersionHistory` component displays and manages flow versions with a timeline-style interface.

## Features

- **Timeline View**: Displays versions in chronological order with visual timeline
- **Current Version Indicator**: Highlights the currently active version
- **View Historical Versions**: Click the eye icon to view any previous version
- **Revert to Previous Version**: Click the revert icon to create a new version from historical content
- **Relative Timestamps**: Shows "2 hours ago" style timestamps with full date on hover
- **Commit Messages**: Displays commit messages for each version
- **Empty State**: Graceful handling when no versions exist
- **Error Handling**: Clear error messages if loading fails

## Basic Usage

```tsx
import { VersionHistory } from '@/components/canvas';

function MyCanvas() {
  const flowId = 'my-flow-id';
  const currentVersionId = 'current-version-id';

  return (
    <VersionHistory 
      flowId={flowId}
      currentVersionId={currentVersionId}
    />
  );
}
```

## With Callbacks

```tsx
import { VersionHistory } from '@/components/canvas';
import { FlowVersion } from '@/lib/canvas/version-manager';

function MyCanvas() {
  const flowId = 'my-flow-id';
  const currentVersionId = 'current-version-id';

  const handleViewVersion = (version: FlowVersion) => {
    console.log('Viewing version:', version.id);
    // Load the visual graph from version.visual_graph
    // Display it in the canvas
  };

  const handleRevertVersion = (version: FlowVersion) => {
    console.log('Reverted to version:', version.id);
    // Reload the canvas to show the new version
    // The component automatically creates a new version
  };

  return (
    <VersionHistory 
      flowId={flowId}
      currentVersionId={currentVersionId}
      onViewVersion={handleViewVersion}
      onRevertVersion={handleRevertVersion}
    />
  );
}
```

## Integration with Canvas Editor

```tsx
import { useState } from 'react';
import { VersionHistory } from '@/components/canvas';
import { FlowVersion } from '@/lib/canvas/version-manager';
import { VisualGraph } from '@/types/canvas-schema';

function CanvasEditor({ flowId }: { flowId: string }) {
  const [currentGraph, setCurrentGraph] = useState<VisualGraph | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

  const handleViewVersion = (version: FlowVersion) => {
    // Load historical version into canvas (read-only mode)
    setCurrentGraph(version.visual_graph);
  };

  const handleRevertVersion = (version: FlowVersion) => {
    // Reload the page or refetch the flow to get the new current version
    window.location.reload();
  };

  return (
    <div className="flex gap-4">
      {/* Canvas Editor */}
      <div className="flex-1">
        {/* Your canvas component here */}
      </div>

      {/* Version History Sidebar */}
      <div className="w-96">
        <VersionHistory
          flowId={flowId}
          currentVersionId={currentVersionId}
          onViewVersion={handleViewVersion}
          onRevertVersion={handleRevertVersion}
        />
      </div>
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `flowId` | `string` | Yes | The ID of the flow to show versions for |
| `currentVersionId` | `string \| null` | No | The ID of the currently active version (will be highlighted) |
| `onViewVersion` | `(version: FlowVersion) => void` | No | Callback when user clicks to view a version |
| `onRevertVersion` | `(version: FlowVersion) => void` | No | Callback after successfully reverting to a version |

## Styling

The component uses the project's design system:
- Dark theme with slate colors
- Cyan accent for current version
- Timeline-style layout with connecting lines
- Hover effects for interactive elements
- Responsive scroll area for long version lists

## Performance Optimization

The component uses a two-tier loading strategy to minimize bandwidth:

1. **Initial Load**: Fetches lightweight metadata (`FlowVersionMetadata`) for all versions
   - Only includes: `id`, `flow_id`, `commit_message`, `created_at`
   - Excludes large `visual_graph` and `execution_graph` data

2. **On-Demand Loading**: Fetches full version data (`FlowVersion`) only when needed
   - When viewing a version (click eye icon)
   - When reverting to a version (click revert icon)
   - Includes complete `visual_graph` and `execution_graph`

This approach significantly reduces initial load time and bandwidth usage, especially for flows with many versions.

## Requirements Validated

- **Requirement 1.4**: Historical runs preserve version - Users can view exact versions that were executed
- **Requirement 5.3**: Version immutability - Modifying canvas doesn't affect historical versions
