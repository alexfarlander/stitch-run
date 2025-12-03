# CanvasRouter Usage Guide

## Overview

The `CanvasRouter` is the central orchestrator for canvas navigation in Stitch. It handles view switching, data fetching, loading states, and smooth transitions between different canvas types.

## Architecture

```
Page (Server) → CanvasView (Client) → CanvasRouter (Client)
                                           ↓
                                    [Navigation State]
                                           ↓
                                    [Data Fetching]
                                           ↓
                                    [View Rendering]
                                           ↓
                        BMCCanvas | WorkflowCanvas | DetailCanvas
```

## Component Hierarchy

### 1. Page Component (Server)
**Location**: `src/app/canvas/[canvasId]/page.tsx`

```typescript
export default async function CanvasPage({ params, searchParams }) {
  const { canvasId } = await params;
  const { runId } = await searchParams;
  
  return <CanvasView flowId={canvasId} runId={runId} />;
}
```

**Purpose**: Minimal server component that extracts route params

### 2. CanvasView (Client)
**Location**: `src/app/canvas/[canvasId]/CanvasView.tsx`

```typescript
export function CanvasView({ flowId, runId }) {
  return <CanvasRouter initialFlowId={flowId} runId={runId} />;
}
```

**Purpose**: Thin wrapper to pass props to router

### 3. CanvasRouter (Client)
**Location**: `src/components/canvas/CanvasRouter.tsx`

**Purpose**: Main orchestrator that handles:
- Navigation state management
- Data fetching with caching
- Loading states
- Error handling
- View rendering
- Smooth transitions

## Features

### 1. Navigation State Management

```typescript
const { currentCanvasId, hydrateFromDatabase } = useCanvasNavigation();

// Use current canvas if navigated, otherwise use initial
const activeCanvasId = currentCanvasId || initialFlowId;

// Hydrate breadcrumbs on mount
useEffect(() => {
  hydrateFromDatabase(initialFlowId);
}, [initialFlowId, hydrateFromDatabase]);
```

### 2. Data Fetching with Caching

```typescript
const { flow, loading, error } = useFlow(activeCanvasId, false);
```

The `useFlow` hook:
- Fetches flow data from Supabase
- Caches results in React state
- Handles loading and error states
- Optional real-time subscriptions

### 3. Loading State - "Frankenstein Skeleton"

Electric-themed loader with:
- Pulsing Zap icon
- Spinning loader
- Animated electric bars
- "Charging the canvas..." message

```typescript
function FrankensteinLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Zap className="w-16 h-16 text-cyan-400 animate-pulse" />
          <div className="absolute inset-0 animate-ping">
            <Zap className="w-16 h-16 text-cyan-400 opacity-20" />
          </div>
        </div>
        {/* ... */}
      </div>
    </div>
  );
}
```

### 4. Error State - "Circuit Overload"

Friendly error display with:
- Red-themed icon
- Clear error message
- Consistent dark theme

### 5. View Rendering Logic

```typescript
const renderCanvas = () => {
  switch (flow.canvas_type) {
    case 'bmc':
      return <BMCCanvas key={flow.id} flow={flow} />;
    
    case 'workflow':
      return <WorkflowCanvas key={flow.id} flow={flow} runId={runId} />;
    
    case 'detail':
      return <DetailCanvas key={flow.id} />;
    
    default:
      return <WorkflowCanvas key={flow.id} flow={flow} runId={runId} />;
  }
};
```

**Key**: Each canvas gets a unique `key={flow.id}` to trigger transitions

### 6. Framer Motion Transitions

```typescript
<AnimatePresence mode="wait">
  <motion.div
    key={activeCanvasId}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }}
    className="w-full h-full"
  >
    {renderCanvas()}
  </motion.div>
</AnimatePresence>
```

**Effect**: Smooth fade + subtle scale on canvas switches

## Canvas Types

### BMC Canvas
- **Type**: `'bmc'`
- **Component**: `<BMCCanvas />`
- **Purpose**: Top-level Business Model Canvas with 12 sections
- **Features**: Entity tracking, section drill-down

### Workflow Canvas
- **Type**: `'workflow'`
- **Component**: `<WorkflowCanvas />`
- **Purpose**: Detailed workflow graphs
- **Features**: Real-time execution status, back button, node interactions

### Detail Canvas
- **Type**: `'detail'`
- **Component**: `<DetailCanvas />`
- **Purpose**: Future - detailed item views
- **Status**: Placeholder (shows "Coming soon...")

## Navigation Flow

### Example: BMC → Section → Item → Workflow

1. **User on BMC** (`/canvas/bmc-123`)
   - CanvasRouter renders `<BMCCanvas />`
   - User double-clicks "Marketing" section

2. **Navigation triggered**
   ```typescript
   drillInto('marketing-workflow-456', 'Marketing', 'workflow');
   ```

3. **State updates**
   - `currentCanvasId` changes to `'marketing-workflow-456'`
   - CanvasRouter detects change

4. **Data fetching**
   - `useFlow` fetches new flow data
   - Shows `<FrankensteinLoader />` during fetch

5. **View transition**
   - Framer Motion fades out BMC
   - Fades in `<WorkflowCanvas />`
   - Breadcrumbs update automatically

6. **User clicks item** with `linked_workflow_id`
   - Process repeats for deeper drill-down

## URL Structure

```
/canvas/[canvasId]              # View any canvas
/canvas/[canvasId]?runId=xyz    # View with run tracking
```

**Note**: URL doesn't change during navigation - state is in memory + sessionStorage

## State Persistence

### SessionStorage
- Navigation stack persists across page refreshes
- Key: `'stitch_canvas_stack'`
- Format: `CanvasStackItem[]`

### Hydration
- On direct URL access, walks up `parent_id` chain
- Reconstructs full breadcrumb path
- Ensures consistent navigation state

## Performance Optimizations

1. **Client-side routing**: No server round-trips during navigation
2. **React state caching**: Flow data cached in `useFlow` hook
3. **Conditional fetching**: Only fetches when `activeCanvasId` changes
4. **Smooth transitions**: 300ms fade prevents jarring switches
5. **Key-based rendering**: React efficiently unmounts/mounts canvases

## Error Handling

### Flow not found
```typescript
if (error || !flow) {
  return <ErrorState message={error || 'Canvas not found...'} />;
}
```

### Network errors
- Caught by `useFlow` hook
- Displayed in `<ErrorState />`
- User-friendly messages

### Missing canvas types
- Default to `<WorkflowCanvas />`
- Prevents crashes from invalid data

## Future Enhancements

1. **DetailCanvas implementation**: Rich item detail views
2. **Prefetching**: Load child canvases on hover
3. **Transition variants**: Different animations per canvas type
4. **Loading progress**: Show fetch progress for large graphs
5. **Error recovery**: Retry buttons, fallback views

## Testing

```typescript
// Test navigation
drillInto('canvas-123', 'Test Canvas', 'workflow');
expect(currentCanvasId).toBe('canvas-123');

// Test loading state
const { result } = renderHook(() => useFlow('loading-canvas'));
expect(result.current.loading).toBe(true);

// Test error state
const { result } = renderHook(() => useFlow('invalid-id'));
expect(result.current.error).toBeTruthy();

// Test view rendering
const { container } = render(<CanvasRouter initialFlowId="bmc-123" />);
expect(container.querySelector('.bmc-canvas')).toBeInTheDocument();
```

## Best Practices

1. **Always provide initialFlowId**: Required for hydration
2. **Use canvas_type correctly**: Determines which view renders
3. **Set parent_id**: Enables breadcrumb reconstruction
4. **Handle loading states**: Users should see feedback during fetches
5. **Test transitions**: Ensure smooth UX during navigation
6. **Monitor performance**: Watch for slow fetches or janky animations
