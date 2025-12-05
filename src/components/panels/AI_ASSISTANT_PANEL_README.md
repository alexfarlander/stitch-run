# AI Assistant Panel Component

## Overview

The `AIAssistantPanel` component provides a chat-based interface for interacting with the AI Manager to create and modify workflows using natural language.

## Features

- **Toggle Button**: Fixed position chat icon in bottom-right corner
- **Chat Panel**: Slides up from bottom-right when opened
- **Message History**: Scrollable conversation display
- **Real-time Input**: Text input with send button and Enter key support
- **Loading States**: Visual feedback while AI processes requests
- **Graph Updates**: Callback support for workflow modifications

## Usage

```tsx
import { AIAssistantPanel } from '@/components/panels/AIAssistantPanel';

function MyCanvas() {
  const handleGraphUpdate = (graph: { nodes: any[]; edges: any[] }) => {
    // Handle graph updates from AI
    console.log('New graph:', graph);
  };

  return (
    <div>
      {/* Your canvas content */}
      
      <AIAssistantPanel 
        canvasId="your-canvas-id"
        onGraphUpdate={handleGraphUpdate}
      />
    </div>
  );
}
```

## Props

### `canvasId` (required)
- Type: `string`
- The ID of the canvas context for AI operations

### `onGraphUpdate` (optional)
- Type: `(graph: { nodes: any[]; edges: any[] }) => void`
- Callback function invoked when AI creates or modifies workflows
- Receives the updated graph structure with nodes and edges

## Visual Design

- **Toggle Button**: 
  - Fixed at `bottom-4 right-4`
  - Circular button with MessageSquare icon
  - Z-index: 40

- **Chat Panel**:
  - Fixed at `bottom-20 right-4` (above toggle button)
  - Width: 384px (w-96)
  - Height: 500px
  - Dark theme (bg-gray-900, border-gray-800)
  - Z-index: 40

## API Integration

The component calls `/api/ai-manager` with the following payload:

```json
{
  "request": "user message text",
  "canvasId": "canvas-id",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Expected response format:

```json
{
  "message": "AI response text",
  "action": "createWorkflow" | "modifyWorkflow",
  "result": {
    "graph": {
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

## Keyboard Shortcuts

- **Enter**: Send message
- **Escape**: Close panel (when X button is focused)

## Accessibility

- Toggle button has `aria-label="Toggle AI Assistant"`
- Close button has `aria-label="Close AI Assistant"`
- Send button has `aria-label="Send message"`
- Input is disabled during loading state

## Testing

A test page is available at `/test-ai-assistant` to verify:
- Toggle button visibility and functionality
- Panel open/close behavior
- Message input and submission
- Loading states
- Scroll behavior with multiple messages

## Requirements Satisfied

This component satisfies **Requirement 8.1**:
- ✓ Chat icon appears in bottom-right corner
- ✓ Clicking opens AI chat panel
- ✓ Panel displays message history
- ✓ Input field accepts text
- ✓ Send button submits messages
- ✓ Fixed positioning as chat widget
