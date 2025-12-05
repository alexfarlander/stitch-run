# Demo Control Panel Component

## Overview

The `DemoControlPanel` component provides a user interface for controlling the Clockwork Canvas demo orchestrator. It features Play and Reset buttons positioned at the bottom-left of the canvas, allowing presenters to trigger automated demo sequences and reset the canvas state.

## Location

- **Component**: `src/components/canvas/DemoControlPanel.tsx`
- **Test Page**: `src/app/test-demo-control-panel/page.tsx`
- **Verification Script**: `scripts/verify-demo-control-panel.ts`

## Features

### 1. Play Button
- Triggers the demo orchestrator by calling `/api/demo/start`
- Executes a scripted sequence of webhook calls with timed delays
- Displays loading state with "Demo running..." indicator
- Automatically re-enables after demo completion
- Shows toast notification with event count and duration

### 2. Reset Button
- Restores all entities to their initial positions
- Calls `/api/demo/reset` endpoint
- Resets financial metrics to initial values
- Shows loading state during reset operation
- Displays success/error toast notifications

### 3. State Management
- `isRunning`: Tracks whether demo is currently executing
- `isResetting`: Tracks whether reset operation is in progress
- Both buttons are disabled during operations to prevent conflicts

### 4. Visual Design
- Fixed positioning at bottom-left of canvas (z-index: 50)
- Semi-transparent dark background with backdrop blur
- Gradient styling for Play button (cyan to blue)
- Outline styling for Reset button
- Responsive to loading states with spinner animations

## Requirements Coverage

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| 6.1 | Play button executes demo script | `handlePlayClick()` calls `/api/demo/start` |
| 6.2 | Show "Demo running..." status | Conditional rendering with `isRunning` state |
| 6.3 | Reset button restores entities | `handleResetClick()` calls `/api/demo/reset` |
| 6.5 | Demo can be replayed | Play button re-enables after completion |
| 14.1 | Display Play and Reset buttons | Both buttons rendered in panel |
| 14.2 | Disable Play while running | `disabled={isRunning \|\| isResetting}` |
| 14.3 | Reset calls API endpoint | Fetch to `/api/demo/reset` |
| 14.4 | Re-enable Play after completion | `setTimeout()` resets `isRunning` |
| 14.5 | Fixed position, no obstruction | `fixed bottom-6 left-6 z-50` |

## Usage

### Basic Usage

```tsx
import { DemoControlPanel } from '@/components/canvas/DemoControlPanel';

export function MyCanvas() {
  return (
    <div className="relative w-full h-full">
      {/* Canvas content */}
      <ReactFlow nodes={nodes} edges={edges}>
        {/* ... */}
      </ReactFlow>
      
      {/* Demo Control Panel */}
      <DemoControlPanel />
    </div>
  );
}
```

### Integration with BMC Canvas

The component is designed to be integrated into the `BMCCanvas` component:

```tsx
// In src/components/canvas/BMCCanvas.tsx
import { DemoControlPanel } from './DemoControlPanel';

export function BMCCanvas({ flow, runId }: BMCCanvasProps) {
  return (
    <div className="w-full h-full bg-[#0a0f1a] text-white relative">
      <ReactFlow /* ... */>
        {/* ... */}
      </ReactFlow>
      
      {/* Add Demo Control Panel */}
      <DemoControlPanel />
    </div>
  );
}
```

## API Dependencies

The component depends on two API endpoints:

### POST /api/demo/start
- Starts the demo orchestrator
- Returns: `{ success: boolean, events: number, duration: number }`
- Implementation: `src/app/api/demo/start/route.ts`

### POST /api/demo/reset
- Resets all entities to initial positions
- Resets financial metrics
- Returns: `{ success: boolean }`
- Implementation: `src/app/api/demo/reset/route.ts`

## Testing

### Verification Script

Run the verification script to check component implementation:

```bash
npx tsx scripts/verify-demo-control-panel.ts
```

This script verifies:
- Component export exists
- Play and Reset button implementations
- State management
- Status display
- Button disabled states
- Fixed positioning
- Icon imports
- Loading states

### Visual Test Page

Visit the test page to verify visual rendering and interactions:

```
http://localhost:3000/test-demo-control-panel
```

The test page provides:
- Visual preview of the component
- Feature checklist
- Requirements coverage matrix
- Interactive testing environment

### Manual Testing Checklist

1. **Play Button**
   - [ ] Click Play button
   - [ ] Verify button shows loading state
   - [ ] Verify "Demo running..." status appears
   - [ ] Verify button is disabled during demo
   - [ ] Verify toast notification appears
   - [ ] Verify button re-enables after completion

2. **Reset Button**
   - [ ] Click Reset button
   - [ ] Verify button shows loading state
   - [ ] Verify button is disabled during reset
   - [ ] Verify toast notification appears
   - [ ] Verify button re-enables after completion

3. **Visual Positioning**
   - [ ] Verify panel is at bottom-left
   - [ ] Verify panel doesn't obscure canvas content
   - [ ] Verify panel has proper z-index
   - [ ] Verify backdrop blur effect

4. **Error Handling**
   - [ ] Test with API endpoints unavailable
   - [ ] Verify error toast appears
   - [ ] Verify buttons re-enable after error

## Styling

The component uses Tailwind CSS with the following key classes:

- **Container**: `fixed bottom-6 left-6 z-50` - Fixed positioning
- **Background**: `bg-slate-900/95 backdrop-blur-sm` - Semi-transparent with blur
- **Border**: `border border-slate-700 rounded-lg` - Subtle border
- **Shadow**: `shadow-xl` - Elevated appearance
- **Play Button**: `bg-gradient-to-r from-cyan-500 to-blue-500` - Gradient styling
- **Reset Button**: `border-slate-600 hover:bg-slate-800` - Outline styling

## Dependencies

- **React**: State management with `useState`
- **lucide-react**: Icons (Play, RotateCcw, Loader2)
- **@/components/ui/button**: Button component
- **sonner**: Toast notifications

## Future Enhancements

Potential improvements for future iterations:

1. **Progress Indicator**: Show progress bar during demo execution
2. **Event Timeline**: Display which events are currently executing
3. **Pause/Resume**: Add ability to pause and resume demo
4. **Speed Control**: Allow adjusting demo playback speed
5. **Event Selection**: Choose which events to include in demo
6. **Keyboard Shortcuts**: Add keyboard controls (Space for Play, R for Reset)
7. **Demo Presets**: Multiple demo scripts to choose from

## Troubleshooting

### Buttons Don't Work

**Problem**: Clicking buttons has no effect

**Solutions**:
1. Check browser console for errors
2. Verify API endpoints are implemented
3. Check network tab for failed requests
4. Ensure Supabase connection is active

### Panel Not Visible

**Problem**: Panel doesn't appear on canvas

**Solutions**:
1. Check z-index conflicts
2. Verify component is imported and rendered
3. Check for CSS conflicts
4. Inspect DOM to see if element exists

### Demo Doesn't Complete

**Problem**: Demo starts but never finishes

**Solutions**:
1. Check demo script duration in API response
2. Verify setTimeout is working correctly
3. Check for JavaScript errors during execution
4. Verify webhook endpoints are responding

## Related Components

- **DemoModeButton**: Alternative demo trigger (top-right position)
- **BMCCanvas**: Main canvas component that hosts the panel
- **EntityOverlay**: Displays entities moving during demo
- **SystemEdge**: Shows system edge pulse animations during demo

## Related Files

- `src/lib/demo/demo-script.ts` - Demo event definitions
- `src/app/api/demo/start/route.ts` - Demo start endpoint
- `src/app/api/demo/reset/route.ts` - Demo reset endpoint
- `src/lib/metrics/financial-updates.ts` - Financial metric updates
- `src/lib/seeds/clockwork-entities.ts` - Initial entity positions

## Implementation Notes

### Task Completion

This component completes **Task 12** from the Clockwork Canvas implementation plan:

- ✅ Created `src/components/canvas/DemoControlPanel.tsx`
- ✅ Added state management for `isRunning`
- ✅ Implemented Play button calling `/api/demo/start`
- ✅ Implemented Reset button calling `/api/demo/reset`
- ✅ Added "Demo running..." status indicator
- ✅ Disabled Play button while demo is running
- ✅ Positioned panel fixed at bottom-left of canvas

### Design Decisions

1. **Separate from DemoModeButton**: While there's an existing `DemoModeButton`, this component provides more comprehensive controls with both Play and Reset functionality.

2. **Bottom-Left Positioning**: Chosen to avoid conflicts with other UI elements (DemoModeButton is top-right, controls are typically top-right).

3. **Toast Notifications**: Used for user feedback instead of inline messages to keep the panel compact.

4. **Gradient Styling**: Play button uses cyan-to-blue gradient to match the "living canvas" theme and differentiate from the Reset button.

5. **Disabled State Management**: Both buttons are disabled during any operation to prevent race conditions and ensure clean state transitions.

## Verification

Run the verification script to confirm proper implementation:

```bash
npx tsx scripts/verify-demo-control-panel.ts
```

Expected output:
```
✅ Component export exists (Req: 14.1)
✅ Play button implementation (Req: 6.1, 14.1)
✅ Reset button implementation (Req: 6.3, 14.3)
✅ isRunning state management (Req: 14.2)
✅ Demo running status display (Req: 6.2)
✅ Play button disabled when running (Req: 14.2)
✅ Fixed positioning at bottom-left (Req: 14.5)
✅ Play icon imported (Req: 14.1)
✅ Reset icon imported (Req: 14.1)
✅ Loading state for Play button (Req: 6.2)

📊 Results: 10 passed, 0 failed out of 10 checks
✨ All checks passed! Demo Control Panel component is properly implemented.
```
