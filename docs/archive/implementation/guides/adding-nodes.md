# Adding New Node Types

**Last Updated:** December 5, 2024  
**Related Files:**
- [Node Components](../frontend/node-components.md)
- [Execution Engine](../backend/execution-engine.md)
- [Canvas Components](../frontend/canvas-components.md)
- [Worker System](../backend/worker-system.md)

## Overview

This guide walks you through creating custom node types for Stitch canvases. Nodes are the visual and functional building blocks of workflows and the Business Model Canvas. Whether you're adding a new workflow operation, a BMC section item, or a specialized component, this guide covers the complete process.

## Node Architecture

Stitch nodes have three layers:

1. **Frontend Component** - React component that renders the node visually
2. **Node Registration** - Adding the node to the canvas type registry
3. **Backend Handler** (optional) - Execution logic for workflow nodes

## Quick Start Checklist

- [ ] Create node component in `src/components/canvas/nodes/`
- [ ] Define TypeScript interface for node data
- [ ] Implement visual rendering with BaseNode or custom design
- [ ] Register node type in appropriate canvas (BMC or Workflow)
- [ ] Add backend handler if node requires execution logic
- [ ] Test node in canvas with real data
- [ ] Document node behavior and configuration

## Part 1: Creating the Frontend Component

### Step 1: Choose Your Node Type

**Workflow Nodes** - Execute operations in workflows
- Worker, Splitter, Collector, UX, MediaSelect
- Use BaseNode wrapper for consistent styling
- Include status indicators and handles

**BMC Nodes** - Visual elements in Business Model Canvas
- Section, SectionItem, Production Items
- Custom styling for BMC aesthetic
- May not need execution logic

### Step 2: Create the Component File

Create a new file in `src/components/canvas/nodes/`:

```typescript
// src/components/canvas/nodes/CustomNode.tsx
```


### Step 3: Define the Node Data Interface

Every node needs a TypeScript interface defining its data structure:

```typescript
import { StitchRun } from '@/types/stitch';

interface CustomNodeData {
  // Required for all workflow nodes
  label?: string;                          // Display name
  node_states?: StitchRun['node_states'];  // Execution status
  
  // Custom fields specific to your node
  customField?: string;
  configuration?: {
    option1: boolean;
    option2: number;
  };
}
```

**Common Fields:**
- `label` - Display name shown in the node
- `node_states` - Execution status from the run (for workflow nodes)
- `child_canvas_id` - Link to another canvas (for drill-down)
- `linked_workflow_id` - Link to a workflow canvas

### Step 4: Implement the Component

#### Option A: Workflow Node (Using BaseNode)

For nodes that execute in workflows, use the BaseNode wrapper:

```typescript
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface CustomNodeData {
  label?: string;
  customField?: string;
  node_states?: StitchRun['node_states'];
}

export const CustomNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  
  // Get aggregated status across parallel instances
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      {/* Input connection point */}
      <Handle type="target" position={Position.Top} />
      
      {/* Node visual wrapper */}
      <BaseNode 
        id={id} 
        type="Custom" 
        status={status} 
        label={label}
      >
        {/* Node content */}
        <div className="space-y-2">
          <div className="font-semibold">
            {nodeData.label || 'Custom Node'}
          </div>
          {nodeData.customField && (
            <div className="text-xs text-slate-400">
              {nodeData.customField}
            </div>
          )}
        </div>
      </BaseNode>
      
      {/* Output connection point */}
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

CustomNode.displayName = 'CustomNode';
```


#### Option B: BMC Node (Custom Styling)

For Business Model Canvas nodes, create custom styling:

```typescript
import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Package } from 'lucide-react';

interface CustomBMCNodeData {
  label: string;
  icon?: string;
  status?: 'idle' | 'active' | 'running' | 'error';
}

export const CustomBMCNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CustomBMCNodeData;

  return (
    <div className="
      w-[120px] h-[60px] p-2
      bg-slate-900/90 backdrop-blur-sm
      border-2 border-slate-700 hover:border-cyan-500
      rounded-lg
      transition-all duration-200
      cursor-pointer
    ">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-300">
          {nodeData.label}
        </span>
      </div>
      
      {/* Status indicator */}
      <div className={`
        mt-1 w-2 h-2 rounded-full
        ${nodeData.status === 'active' ? 'bg-green-500' : 'bg-slate-600'}
      `} />
    </div>
  );
});

CustomBMCNode.displayName = 'CustomBMCNode';
```

### Step 5: Add Connection Handles

Handles define where edges can connect to your node:

```typescript
import { Handle, Position } from '@xyflow/react';

// Top handle (input)
<Handle 
  type="target" 
  position={Position.Top}
  id="input"  // Optional: for multiple handles
/>

// Bottom handle (output)
<Handle 
  type="source" 
  position={Position.Bottom}
  id="output"
/>

// Multiple handles example
<Handle type="target" position={Position.Top} id="input-1" />
<Handle type="target" position={Position.Top} id="input-2" 
  style={{ left: '75%' }} 
/>
<Handle type="source" position={Position.Bottom} id="output-1" />
<Handle type="source" position={Position.Bottom} id="output-2" 
  style={{ left: '75%' }} 
/>
```

**Handle Types:**
- `target` - Input connection point
- `source` - Output connection point

**Handle Positions:**
- `Position.Top` - Top of node
- `Position.Bottom` - Bottom of node
- `Position.Left` - Left side of node
- `Position.Right` - Right side of node


### Step 6: Use the useNodeStatus Hook

For workflow nodes that execute, use `useNodeStatus` to aggregate status across parallel instances:

```typescript
import { useNodeStatus } from '../hooks/useNodeStatus';

const { status, label } = useNodeStatus(id, nodeData.node_states);

// Returns:
// status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_for_user'
// label: 'Pending' | 'Running (2/5)' | 'Completed (5)' | 'Failed' | 'Waiting'
```

**Why This Matters:**

When a Splitter node creates parallel instances (`nodeId_0`, `nodeId_1`, etc.), the hook aggregates their status:
- If ANY instance is failed → Status: 'failed'
- If ANY instance is running → Status: 'running'
- If ALL instances are completed → Status: 'completed'
- Otherwise → Status: 'running' with progress count

### Step 7: Add Interactivity (Optional)

#### Drill-Down Navigation

For nodes that link to other canvases:

```typescript
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

export const CustomNode = memo(({ id, data }: NodeProps) => {
  const { drillInto } = useCanvasNavigation();
  
  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.child_canvas_id) {
      drillInto(data.child_canvas_id, data.label, 'workflow');
    }
  };

  return (
    <div onDoubleClick={handleDrillDown}>
      {/* Node content */}
    </div>
  );
});
```

#### Custom Actions

For nodes with custom interactions:

```typescript
const handleCustomAction = async () => {
  // Perform action
  const result = await performAction(nodeData.config);
  
  // Update node data
  updateNodeData(id, {
    ...nodeData,
    result: result,
  });
};

return (
  <BaseNode {...props}>
    <button 
      onClick={handleCustomAction}
      className="px-2 py-1 bg-cyan-500 rounded text-xs"
    >
      Execute Action
    </button>
  </BaseNode>
);
```

## Part 2: Registering the Node

### Step 1: Import the Component

Add the import to the appropriate canvas file:

```typescript
// For workflow nodes: src/components/canvas/WorkflowCanvas.tsx
import { CustomNode } from './nodes/CustomNode';

// For BMC nodes: src/components/canvas/BMCCanvas.tsx
import { CustomBMCNode } from './nodes/CustomBMCNode';
```


### Step 2: Add to Node Type Registry

#### Workflow Canvas Registry

```typescript
// src/components/canvas/WorkflowCanvas.tsx

const nodeTypes: NodeTypes = {
  Worker: WorkerNode as any,
  Collector: CollectorNode as any,
  UX: UXNode as any,
  Splitter: SplitterNode as any,
  MediaSelect: MediaSelectNode as any,
  
  // Add your custom node
  Custom: CustomNode as any,
};
```

#### BMC Canvas Registry

```typescript
// src/components/canvas/BMCCanvas.tsx

const nodeTypes = useMemo<NodeTypes>(() => ({
  // Section containers
  section: SectionNode,
  
  // Section items
  'section-item': SectionItemNode,
  
  // Production items
  'integration-item': IntegrationItem,
  'person-item': PersonItem,
  'code-item': CodeItem,
  'data-item': DataItem,
  
  // Add your custom BMC node
  'custom-item': CustomBMCNode,
  
  // Financial sections
  'costs-section': CostsSectionNode,
  'revenue-section': RevenueSectionNode,
  
  // Workflow nodes (for embedded workflows)
  Worker: WorkerNode,
  Collector: CollectorNode,
  UX: UXNode,
  Splitter: SplitterNode,
  MediaSelect: MediaSelectNode,
  
  // Fallback
  fallback: FallbackNode,
}), []);
```

**Important:** The key in the registry must match the `type` field in your node data.

### Step 3: Use the Node in Graph Data

When creating or modifying flows, use your node type:

```typescript
const flow = {
  name: 'My Workflow',
  graph: {
    nodes: [
      {
        id: 'custom-1',
        type: 'Custom',  // Must match registry key
        position: { x: 100, y: 100 },
        data: {
          label: 'My Custom Node',
          customField: 'value',
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'start',
        target: 'custom-1',
      },
    ],
  },
};
```


## Part 3: Adding Backend Execution Logic

If your node needs to execute operations (like Worker nodes), add a backend handler.

### Step 1: Create the Handler Function

Create a handler in `src/lib/engine/handlers/`:

```typescript
// src/lib/engine/handlers/custom-handler.ts

/**
 * Handles execution of Custom nodes
 */
export async function handleCustomNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>,
  runId: string
): Promise<Record<string, any>> {
  console.log(`[Custom Handler] Processing node ${nodeId}`);
  
  try {
    // Extract configuration
    const { customField, option1, option2 } = config;
    
    // Process the node logic
    const result = await performCustomOperation(input, {
      customField,
      option1,
      option2,
    });
    
    // Return output (input + new fields)
    return {
      ...input,  // Pass through all input fields
      customResult: result,  // Add new output
      processedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error(`[Custom Handler] Error:`, error);
    throw error;
  }
}

async function performCustomOperation(
  input: Record<string, any>,
  config: Record<string, any>
): Promise<any> {
  // Your custom logic here
  // Could be API calls, data transformation, etc.
  
  return {
    status: 'success',
    data: 'processed',
  };
}
```

### Step 2: Register Handler in Edge-Walker

Add your handler to the edge-walker's node type switch:

```typescript
// src/lib/engine/edge-walker.ts

import { handleCustomNode } from './handlers/custom-handler';

async function executeNode(
  nodeId: string,
  nodeType: string,
  input: Record<string, any>,
  config: Record<string, any>,
  runId: string
): Promise<Record<string, any>> {
  
  switch (nodeType) {
    case 'Worker':
      return await handleWorkerNode(nodeId, input, config, runId);
    
    case 'Splitter':
      return await handleSplitterNode(nodeId, input, config, runId);
    
    case 'Collector':
      return await handleCollectorNode(nodeId, input, config, runId);
    
    case 'UX':
      return await handleUXNode(nodeId, input, config, runId);
    
    // Add your custom handler
    case 'Custom':
      return await handleCustomNode(nodeId, input, config, runId);
    
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}
```


### Step 3: Handle Async Operations (Optional)

For nodes that call external services (like Worker nodes), use the async pattern:

```typescript
export async function handleCustomNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>,
  runId: string
): Promise<Record<string, any>> {
  
  // Build callback URL
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stitch/callback/${runId}/${nodeId}`;
  
  // Prepare webhook payload
  const payload = {
    runId,
    nodeId,
    config,
    input,
    callbackUrl,
  };
  
  // Fire webhook to external service
  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  // Return immediately - node stays in "running" state
  // External service will call back when done
  return input;  // No output yet
}
```

**Async Pattern Flow:**
1. Node fires webhook to external service
2. Node marked as "running" in database
3. Edge-walker returns (doesn't wait)
4. External service processes asynchronously
5. External service calls callback URL with results
6. Callback handler updates node to "completed"
7. Edge-walker resumes from that node

### Step 4: Create Callback Handler (For Async Nodes)

If using async pattern, create a callback endpoint:

```typescript
// src/app/api/stitch/callback/[runId]/[nodeId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { completeNode } from '@/lib/engine/edge-walker';

export async function POST(
  request: NextRequest,
  { params }: { params: { runId: string; nodeId: string } }
) {
  const { runId, nodeId } = params;
  const body = await request.json();
  
  const { status, output, error } = body;
  
  if (status === 'completed') {
    // Resume edge-walking from this node
    await completeNode(runId, nodeId, output);
    
    return NextResponse.json({ success: true });
  } else {
    // Mark node as failed
    await failNode(runId, nodeId, error);
    
    return NextResponse.json({ success: false, error });
  }
}
```


## Part 4: Testing Your Node

### Step 1: Create Test Flow

Create a test flow that uses your node:

```typescript
// scripts/test-custom-node.ts

import { supabase } from '@/lib/supabase/client';

async function testCustomNode() {
  // Create test flow
  const { data: flow, error } = await supabase
    .from('stitch_flows')
    .insert({
      name: 'Custom Node Test',
      graph: {
        nodes: [
          {
            id: 'start',
            type: 'Worker',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
          {
            id: 'custom-1',
            type: 'Custom',
            position: { x: 100, y: 200 },
            data: {
              label: 'Test Custom Node',
              customField: 'test value',
            },
          },
          {
            id: 'end',
            type: 'Worker',
            position: { x: 100, y: 300 },
            data: { label: 'End' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'custom-1' },
          { id: 'e2', source: 'custom-1', target: 'end' },
        ],
      },
    })
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('Test flow created:', flow.id);
  
  // Create test run
  const response = await fetch(`/api/canvas/${flow.id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { testData: 'hello' },
    }),
  });
  
  const run = await response.json();
  console.log('Test run created:', run.id);
  
  return { flowId: flow.id, runId: run.id };
}

testCustomNode();
```

### Step 2: Visual Testing

1. Navigate to the canvas page: `/canvas/{flowId}`
2. Verify node renders correctly
3. Check status indicators work
4. Test interactions (clicks, hovers, drill-downs)
5. Verify handles connect properly

### Step 3: Execution Testing

1. Create a run: `POST /api/canvas/{flowId}/run`
2. Watch node status change in real-time
3. Verify output is correct
4. Check error handling
5. Test parallel execution (if using Splitter)

### Step 4: Integration Testing

Create a test file:

```typescript
// src/components/canvas/nodes/__tests__/CustomNode.test.tsx

import { render, screen } from '@testing-library/react';
import { CustomNode } from '../CustomNode';

describe('CustomNode', () => {
  it('renders with label', () => {
    const props = {
      id: 'test-1',
      data: {
        label: 'Test Node',
        customField: 'test',
      },
      type: 'Custom',
    };
    
    render(<CustomNode {...props} />);
    
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });
  
  it('shows status indicator', () => {
    const props = {
      id: 'test-1',
      data: {
        label: 'Test Node',
        node_states: {
          'test-1': {
            status: 'completed',
            output: {},
          },
        },
      },
      type: 'Custom',
    };
    
    render(<CustomNode {...props} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
```


## Common Node Patterns

### Pattern 1: Data Transformation Node

Node that transforms input data:

```typescript
export async function handleTransformNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>
): Promise<Record<string, any>> {
  
  const { transformType, fields } = config;
  
  let transformed = { ...input };
  
  switch (transformType) {
    case 'uppercase':
      fields.forEach(field => {
        if (transformed[field]) {
          transformed[field] = transformed[field].toUpperCase();
        }
      });
      break;
    
    case 'filter':
      transformed = Object.fromEntries(
        Object.entries(transformed).filter(([key]) => 
          fields.includes(key)
        )
      );
      break;
  }
  
  return transformed;
}
```

### Pattern 2: Conditional Branch Node

Node that routes based on conditions:

```typescript
export async function handleConditionalNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>
): Promise<Record<string, any>> {
  
  const { condition, field, value } = config;
  
  let conditionMet = false;
  
  switch (condition) {
    case 'equals':
      conditionMet = input[field] === value;
      break;
    case 'greater_than':
      conditionMet = input[field] > value;
      break;
    case 'contains':
      conditionMet = input[field]?.includes(value);
      break;
  }
  
  return {
    ...input,
    conditionMet,
    branchTaken: conditionMet ? 'true' : 'false',
  };
}
```

**Frontend Component:**

```typescript
export const ConditionalNode = memo(({ id, data }: NodeProps) => {
  const { status, label } = useNodeStatus(id, data.node_states);
  
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode id={id} type="Conditional" status={status} label={label}>
        <div className="text-xs">
          If {data.field} {data.condition} {data.value}
        </div>
      </BaseNode>
      {/* Two output handles for true/false branches */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true"
        style={{ left: '25%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false"
        style={{ left: '75%' }}
      />
    </>
  );
});
```

### Pattern 3: Aggregation Node

Node that combines multiple inputs:

```typescript
export async function handleAggregationNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>
): Promise<Record<string, any>> {
  
  const { aggregationType, field } = config;
  
  // Input should be an array from Collector
  const items = input.items || [];
  
  let result;
  
  switch (aggregationType) {
    case 'sum':
      result = items.reduce((sum, item) => sum + (item[field] || 0), 0);
      break;
    
    case 'average':
      const sum = items.reduce((s, item) => s + (item[field] || 0), 0);
      result = items.length > 0 ? sum / items.length : 0;
      break;
    
    case 'concat':
      result = items.map(item => item[field]).join(', ');
      break;
  }
  
  return {
    ...input,
    aggregatedValue: result,
  };
}
```


### Pattern 4: API Integration Node

Node that calls external APIs:

```typescript
export async function handleAPINode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>
): Promise<Record<string, any>> {
  
  const { apiUrl, method, headers, bodyTemplate } = config;
  
  // Replace template variables with input values
  const body = replaceTemplateVariables(bodyTemplate, input);
  
  const response = await fetch(apiUrl, {
    method: method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    ...input,
    apiResponse: data,
  };
}

function replaceTemplateVariables(
  template: any,
  values: Record<string, any>
): any {
  const str = JSON.stringify(template);
  const replaced = str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return values[key] || '';
  });
  return JSON.parse(replaced);
}
```

### Pattern 5: State Management Node

Node that maintains state across executions:

```typescript
export async function handleStateNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>,
  runId: string
): Promise<Record<string, any>> {
  
  const { stateKey, operation } = config;
  
  // Get current state from database
  const { data: run } = await supabase
    .from('stitch_runs')
    .select('metadata')
    .eq('id', runId)
    .single();
  
  const state = run?.metadata?.state || {};
  
  let newValue;
  
  switch (operation) {
    case 'increment':
      newValue = (state[stateKey] || 0) + 1;
      break;
    
    case 'set':
      newValue = input[config.valueField];
      break;
    
    case 'append':
      newValue = [...(state[stateKey] || []), input[config.valueField]];
      break;
  }
  
  // Update state in database
  await supabase
    .from('stitch_runs')
    .update({
      metadata: {
        ...run?.metadata,
        state: {
          ...state,
          [stateKey]: newValue,
        },
      },
    })
    .eq('id', runId);
  
  return {
    ...input,
    stateValue: newValue,
  };
}
```


## Styling Guidelines

### Color Palette

Follow Stitch's Frankenstein's Lab aesthetic:

```typescript
// Status colors
const STATUS_COLORS = {
  pending: 'border-slate-700 opacity-50',
  running: 'border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.5)]',
  completed: 'border-[#00ff99] shadow-[0_0_15px_rgba(0,255,153,0.4)]',
  failed: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  waiting_for_user: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]',
};

// Category colors (for BMC)
const CATEGORY_COLORS = {
  Production: 'border-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  Customer: 'border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  Financial: 'border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.3)]',
};
```

### Animation Classes

```typescript
// Pulsing animation for active states
className="animate-pulse"

// Spinning animation for loading
className="animate-spin"

// Smooth transitions
className="transition-all duration-200"

// Hover effects
className="hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
```

### Z-Index Layers

```typescript
// From src/components/canvas/utils.ts
export const Z_INDEX_LAYERS = {
  SECTION_BACKGROUND: -1,      // Section containers
  FINANCIAL_SECTIONS: 10,      // Revenue/Costs sections
  ITEMS: 20,                   // Section items and workflow nodes
  ENTITIES: 100,               // Entity dots and overlays
};
```

### Responsive Sizing

```typescript
// Workflow nodes (using BaseNode)
className="min-w-[200px] rounded-lg border-2 bg-slate-900 p-4"

// BMC items (compact)
className="w-[120px] h-[60px] p-2"

// BMC sections (large containers)
className="w-full h-full p-4"
```

## Best Practices

### Performance

1. **Always use React.memo()** - Prevents unnecessary re-renders
2. **Memoize expensive calculations** - Use useMemo for complex computations
3. **Minimize node data** - Store only essential data in node.data
4. **Use useNodeStatus** - Efficient status aggregation across instances

### Accessibility

1. **Add ARIA labels** - Describe node purpose for screen readers
2. **Keyboard navigation** - Ensure nodes are keyboard accessible
3. **Color contrast** - Maintain WCAG AA contrast ratios
4. **Focus indicators** - Visible focus states for keyboard users

### Error Handling

1. **Validate input data** - Check for required fields
2. **Handle missing config** - Provide sensible defaults
3. **Catch async errors** - Wrap async operations in try-catch
4. **Log errors** - Use console.error for debugging

### Data Management

1. **Immutability** - Never mutate node data directly
2. **Pass through input** - Always include input in output
3. **Type safety** - Use TypeScript interfaces
4. **Validate schemas** - Check data structure before processing


## Troubleshooting

### Node Not Rendering

**Problem:** Node doesn't appear on canvas

**Solutions:**
1. Check if node type is registered in nodeTypes
2. Verify component is imported correctly
3. Check for console errors
4. Ensure node data structure matches interface
5. Verify node has valid position coordinates

```typescript
// Debug: Check if node type exists
console.log('Registered types:', Object.keys(nodeTypes));

// Debug: Check node data
console.log('Node data:', node);
```

### Status Not Updating

**Problem:** Node status doesn't change during execution

**Solutions:**
1. Verify `node_states` is passed to node data
2. Check if `useNodeStatus` hook is used
3. Ensure real-time subscription is active
4. Check database for node state updates
5. Verify runId is correct

```typescript
// Debug: Check node states
console.log('Node states:', nodeData.node_states);
console.log('Current status:', status);
```

### Handles Not Connecting

**Problem:** Can't connect edges to node

**Solutions:**
1. Verify Handle components are rendered
2. Check handle type (target vs source)
3. Ensure handle position is valid
4. Check for z-index issues
5. Verify node is not disabled

```typescript
// Ensure handles are visible
<Handle 
  type="target" 
  position={Position.Top}
  style={{ 
    width: 12, 
    height: 12, 
    background: '#06b6d4',
    border: '2px solid white',
  }}
/>
```

### Execution Errors

**Problem:** Node fails during execution

**Solutions:**
1. Check handler function exists
2. Verify input data structure
3. Check for missing configuration
4. Review error logs
5. Test handler in isolation

```typescript
// Add detailed logging
export async function handleCustomNode(...) {
  console.log('[Custom] Input:', input);
  console.log('[Custom] Config:', config);
  
  try {
    const result = await process(input, config);
    console.log('[Custom] Output:', result);
    return result;
  } catch (error) {
    console.error('[Custom] Error:', error);
    throw error;
  }
}
```

### Styling Issues

**Problem:** Node doesn't look right

**Solutions:**
1. Check Tailwind classes are correct
2. Verify z-index layering
3. Ensure parent container has dimensions
4. Check for CSS conflicts
5. Test in different browsers

```typescript
// Debug: Add visible border
className="border-4 border-red-500"

// Debug: Check dimensions
style={{ width: 200, height: 100, background: 'red' }}
```


## Complete Example: Email Node

Here's a complete example of creating an email sending node:

### Frontend Component

```typescript
// src/components/canvas/nodes/EmailNode.tsx

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { StitchRun } from '@/types/stitch';

interface EmailNodeData {
  label?: string;
  to?: string;
  subject?: string;
  template?: string;
  node_states?: StitchRun['node_states'];
}

export const EmailNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as EmailNodeData;
  const { status, label } = useNodeStatus(id, nodeData.node_states);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      
      <BaseNode id={id} type="Email" status={status} label={label}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">
              {nodeData.label || 'Send Email'}
            </span>
          </div>
          
          {nodeData.to && (
            <div className="text-xs text-slate-400">
              To: {nodeData.to}
            </div>
          )}
          
          {nodeData.subject && (
            <div className="text-xs text-slate-400 truncate">
              Subject: {nodeData.subject}
            </div>
          )}
        </div>
      </BaseNode>
      
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

EmailNode.displayName = 'EmailNode';
```

### Backend Handler

```typescript
// src/lib/engine/handlers/email-handler.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleEmailNode(
  nodeId: string,
  input: Record<string, any>,
  config: Record<string, any>,
  runId: string
): Promise<Record<string, any>> {
  
  console.log(`[Email Handler] Sending email for node ${nodeId}`);
  
  try {
    // Extract configuration
    const { to, subject, template, from } = config;
    
    // Replace template variables
    const emailBody = replaceVariables(template, input);
    const emailSubject = replaceVariables(subject, input);
    const emailTo = replaceVariables(to, input);
    
    // Send email
    const { data, error } = await resend.emails.send({
      from: from || 'noreply@stitch.run',
      to: emailTo,
      subject: emailSubject,
      html: emailBody,
    });
    
    if (error) {
      throw new Error(`Email send failed: ${error.message}`);
    }
    
    console.log(`[Email Handler] Email sent successfully:`, data.id);
    
    return {
      ...input,
      emailSent: true,
      emailId: data.id,
      sentTo: emailTo,
      sentAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error(`[Email Handler] Error:`, error);
    throw error;
  }
}

function replaceVariables(
  template: string,
  values: Record<string, any>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return values[key] || '';
  });
}
```

### Registration

```typescript
// src/components/canvas/WorkflowCanvas.tsx
import { EmailNode } from './nodes/EmailNode';

const nodeTypes: NodeTypes = {
  // ... existing types
  Email: EmailNode as any,
};

// src/lib/engine/edge-walker.ts
import { handleEmailNode } from './handlers/email-handler';

case 'Email':
  return await handleEmailNode(nodeId, input, config, runId);
```

### Usage Example

```typescript
const emailWorkflow = {
  name: 'Welcome Email Flow',
  graph: {
    nodes: [
      {
        id: 'trigger',
        type: 'Worker',
        position: { x: 100, y: 100 },
        data: { label: 'New User Webhook' },
      },
      {
        id: 'send-welcome',
        type: 'Email',
        position: { x: 100, y: 200 },
        data: {
          label: 'Send Welcome Email',
          to: '{{email}}',
          subject: 'Welcome to Stitch, {{name}}!',
          template: `
            <h1>Welcome {{name}}!</h1>
            <p>Thanks for signing up.</p>
          `,
        },
      },
      {
        id: 'complete',
        type: 'Worker',
        position: { x: 100, y: 300 },
        data: { label: 'Mark Onboarded' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'send-welcome' },
      { id: 'e2', source: 'send-welcome', target: 'complete' },
    ],
  },
};
```

## Canvas Feature Development

This section covers advanced patterns for building interactive canvas features, React Flow integration, and custom canvas interactions.

### React Flow Integration Patterns

Stitch uses `@xyflow/react` (React Flow) for canvas rendering. Understanding these patterns is essential for building canvas features.

#### Pattern 1: Custom Node Interactions

React Flow nodes can have custom interactions beyond basic rendering:

```typescript
import { useReactFlow } from '@xyflow/react';

export const InteractiveNode = memo(({ id, data }: NodeProps) => {
  const { setNodes, setEdges, getNode } = useReactFlow();
  
  // Update node data programmatically
  const updateNodeData = (newData: Partial<typeof data>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  };
  
  // Add new edge from this node
  const createEdge = (targetId: string) => {
    setEdges((edges) => [
      ...edges,
      {
        id: `${id}-${targetId}`,
        source: id,
        target: targetId,
        type: 'default',
      },
    ]);
  };
  
  // Get connected nodes
  const getConnectedNodes = () => {
    const node = getNode(id);
    // Logic to find connected nodes
  };
  
  return (
    <BaseNode id={id} type="Interactive" status={data.status}>
      <button onClick={() => updateNodeData({ clicked: true })}>
        Update Data
      </button>
    </BaseNode>
  );
});
```

#### Pattern 2: Custom Edge Types

Create custom edge styles for different connection types:

```typescript
// src/components/canvas/edges/CustomEdge.tsx

import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: data?.isActive ? '#06b6d4' : '#475569',
          strokeWidth: data?.isActive ? 3 : 2,
        }}
      />
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: 12 }}
            startOffset="50%"
            textAnchor="middle"
          >
            {data.label}
          </textPath>
        </text>
      )}
    </>
  );
};

// Register in canvas
const edgeTypes = {
  default: CustomEdge,
  animated: AnimatedEdge,
};
```

#### Pattern 3: Canvas Controls

Add custom controls to the canvas:

```typescript
import { Controls, ControlButton } from '@xyflow/react';
import { Save, Play, Trash } from 'lucide-react';

export const WorkflowCanvas = () => {
  const handleSave = () => {
    // Save canvas state
  };
  
  const handleRun = () => {
    // Execute workflow
  };
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
    >
      <Controls>
        <ControlButton onClick={handleSave} title="Save">
          <Save className="w-4 h-4" />
        </ControlButton>
        <ControlButton onClick={handleRun} title="Run">
          <Play className="w-4 h-4" />
        </ControlButton>
      </Controls>
    </ReactFlow>
  );
};
```

#### Pattern 4: Mini Map

Add a mini map for large canvases:

```typescript
import { MiniMap } from '@xyflow/react';

<ReactFlow nodes={nodes} edges={edges}>
  <MiniMap
    nodeColor={(node) => {
      switch (node.type) {
        case 'Worker': return '#06b6d4';
        case 'Splitter': return '#f59e0b';
        case 'Collector': return '#8b5cf6';
        default: return '#64748b';
      }
    }}
    maskColor="rgba(0, 0, 0, 0.8)"
    style={{
      background: '#0f172a',
      border: '1px solid #334155',
    }}
  />
</ReactFlow>
```

#### Pattern 5: Background Patterns

Customize the canvas background:

```typescript
import { Background } from '@xyflow/react';

<ReactFlow nodes={nodes} edges={edges}>
  <Background
    color="#334155"
    gap={16}
    size={1}
    variant="dots"
  />
</ReactFlow>
```

### Canvas Interaction Patterns

#### Drag and Drop

Implement drag-and-drop to add nodes:

```typescript
import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export const NodePalette = () => {
  const { screenToFlowPosition } = useReactFlow();
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <div className="node-palette">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'Worker')}
        className="palette-item"
      >
        Worker Node
      </div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'Splitter')}
        className="palette-item"
      >
        Splitter Node
      </div>
    </div>
  );
};

export const WorkflowCanvas = () => {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type}` },
      };
      
      setNodes((nodes) => [...nodes, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );
  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  return (
    <div onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
};
```

#### Node Selection

Handle node selection and multi-select:

```typescript
import { useNodesState } from '@xyflow/react';

export const WorkflowCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodes(nodes.map(n => n.id));
  }, []);
  
  const deleteSelected = () => {
    setNodes((nodes) => 
      nodes.filter((node) => !selectedNodes.includes(node.id))
    );
  };
  
  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        multiSelectionKeyCode="Shift"
      />
      {selectedNodes.length > 0 && (
        <button onClick={deleteSelected}>
          Delete {selectedNodes.length} nodes
        </button>
      )}
    </>
  );
};
```

#### Context Menu

Add right-click context menu:

```typescript
import { useCallback, useState } from 'react';

export const WorkflowCanvas = () => {
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    []
  );
  
  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, []);
  
  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
      />
      
      {menu && (
        <div
          style={{
            position: 'absolute',
            top: menu.top,
            left: menu.left,
            zIndex: 1000,
          }}
          className="bg-slate-800 border border-slate-700 rounded-lg p-2"
        >
          <button onClick={() => duplicateNode(menu.id)}>
            Duplicate
          </button>
          <button onClick={() => deleteNode(menu.id)}>
            Delete
          </button>
          <button onClick={() => editNode(menu.id)}>
            Edit
          </button>
        </div>
      )}
    </>
  );
};
```

#### Zoom and Pan Controls

Programmatic viewport control:

```typescript
import { useReactFlow } from '@xyflow/react';

export const ViewportControls = () => {
  const { setViewport, fitView, zoomIn, zoomOut } = useReactFlow();
  
  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };
  
  const focusNode = (nodeId: string) => {
    fitView({
      nodes: [{ id: nodeId }],
      duration: 800,
      padding: 0.2,
    });
  };
  
  return (
    <div className="viewport-controls">
      <button onClick={() => zoomIn()}>Zoom In</button>
      <button onClick={() => zoomOut()}>Zoom Out</button>
      <button onClick={resetView}>Reset</button>
      <button onClick={() => fitView()}>Fit View</button>
    </div>
  );
};
```

### Advanced Canvas Features

#### Auto-Layout

Implement automatic node positioning:

```typescript
// src/lib/canvas/auto-layout.ts

import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

export function autoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });
  
  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: 200,
      height: 100,
    });
  });
  
  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  // Calculate layout
  dagre.layout(dagreGraph);
  
  // Apply positions to nodes
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 50,
      },
    };
  });
}

// Usage in canvas
const handleAutoLayout = () => {
  const layoutedNodes = autoLayout(nodes, edges, 'TB');
  setNodes(layoutedNodes);
};
```

#### Undo/Redo

Implement undo/redo functionality:

```typescript
import { useCallback, useState } from 'react';

export const useUndoRedo = () => {
  const [past, setPast] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]);
  
  const takeSnapshot = useCallback((state: any) => {
    setPast((past) => [...past, state]);
    setFuture([]);
  }, []);
  
  const undo = useCallback(() => {
    if (past.length === 0) return null;
    
    const previous = past[past.length - 1];
    setPast((past) => past.slice(0, -1));
    setFuture((future) => [previous, ...future]);
    
    return previous;
  }, [past]);
  
  const redo = useCallback(() => {
    if (future.length === 0) return null;
    
    const next = future[0];
    setFuture((future) => future.slice(1));
    setPast((past) => [...past, next]);
    
    return next;
  }, [future]);
  
  return { takeSnapshot, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
};

// Usage
const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo();

const onNodesChange = useCallback((changes) => {
  takeSnapshot({ nodes, edges });
  // Apply changes
}, [nodes, edges]);
```

#### Node Grouping

Group nodes together:

```typescript
export const GroupNode = memo(({ id, data }: NodeProps) => {
  return (
    <div
      className="
        min-w-[400px] min-h-[300px]
        border-2 border-dashed border-slate-600
        rounded-lg bg-slate-900/30
        p-4
      "
    >
      <div className="text-sm font-semibold text-slate-400 mb-2">
        {data.label}
      </div>
      {/* Child nodes render inside */}
    </div>
  );
});

// Set parent relationship
const groupedNode = {
  id: 'child-1',
  type: 'Worker',
  position: { x: 50, y: 50 },
  parentNode: 'group-1',  // Links to group
  extent: 'parent',        // Constrain to parent bounds
  data: { label: 'Child Node' },
};
```

#### Connection Validation

Validate edge connections:

```typescript
import { Connection, Edge } from '@xyflow/react';

const isValidConnection = (connection: Connection): boolean => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  // Prevent self-connections
  if (connection.source === connection.target) {
    return false;
  }
  
  // Prevent duplicate edges
  const edgeExists = edges.some(
    e => e.source === connection.source && e.target === connection.target
  );
  if (edgeExists) {
    return false;
  }
  
  // Type-specific validation
  if (sourceNode?.type === 'Collector' && targetNode?.type === 'Splitter') {
    return false;  // Invalid connection type
  }
  
  return true;
};

<ReactFlow
  nodes={nodes}
  edges={edges}
  isValidConnection={isValidConnection}
/>
```

#### Edge Animations

Animate edges for entity movement:

```typescript
// src/components/canvas/edges/AnimatedEdge.tsx

export const AnimatedEdge = ({ id, data, ...props }: EdgeProps) => {
  const [edgePath] = getSmoothStepPath(props);
  
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      
      {data?.isActive && (
        <circle r="4" fill="#06b6d4">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
};
```

### Canvas State Management

#### Persisting Canvas State

Save and restore canvas state:

```typescript
import { useReactFlow } from '@xyflow/react';

export const usePersistCanvas = (flowId: string) => {
  const { toObject, setNodes, setEdges, setViewport } = useReactFlow();
  
  const saveCanvas = async () => {
    const flow = toObject();
    
    await supabase
      .from('stitch_flows')
      .update({
        graph: {
          nodes: flow.nodes,
          edges: flow.edges,
        },
        viewport: flow.viewport,
      })
      .eq('id', flowId);
  };
  
  const loadCanvas = async () => {
    const { data } = await supabase
      .from('stitch_flows')
      .select('graph, viewport')
      .eq('id', flowId)
      .single();
    
    if (data) {
      setNodes(data.graph.nodes);
      setEdges(data.graph.edges);
      if (data.viewport) {
        setViewport(data.viewport);
      }
    }
  };
  
  return { saveCanvas, loadCanvas };
};
```

#### Real-Time Collaboration

Sync canvas changes across users:

```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export const CollaborativeCanvas = ({ flowId }: { flowId: string }) => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  
  // Subscribe to canvas changes
  useRealtimeSubscription(
    'stitch_flows',
    `id=eq.${flowId}`,
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        const { graph } = payload.new;
        setNodes(graph.nodes);
        setEdges(graph.edges);
      }
    }
  );
  
  // Debounce updates to avoid conflicts
  const debouncedSave = useMemo(
    () => debounce(async (nodes, edges) => {
      await supabase
        .from('stitch_flows')
        .update({ graph: { nodes, edges } })
        .eq('id', flowId);
    }, 1000),
    [flowId]
  );
  
  const onNodesChange = useCallback((changes) => {
    setNodes((nodes) => applyNodeChanges(changes, nodes));
    debouncedSave(nodes, edges);
  }, [nodes, edges]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
    />
  );
};
```

### Performance Optimization

#### Virtualization

For large canvases, use virtualization:

```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  // Only render visible nodes
  onlyRenderVisibleElements={true}
  // Reduce re-renders
  nodesDraggable={true}
  nodesConnectable={true}
  elementsSelectable={true}
/>
```

#### Memoization

Optimize node rendering:

```typescript
export const OptimizedNode = memo(
  ({ id, data }: NodeProps) => {
    // Component implementation
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.data.label === nextProps.data.label &&
      prevProps.data.status === nextProps.data.status
    );
  }
);
```

#### Lazy Loading

Load nodes on demand:

```typescript
const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);

const onViewportChange = useCallback((viewport: Viewport) => {
  // Calculate visible area
  const visible = nodes.filter(node => 
    isNodeInViewport(node, viewport)
  );
  setVisibleNodes(visible);
}, [nodes]);

<ReactFlow
  nodes={visibleNodes}
  edges={edges}
  onViewportChange={onViewportChange}
/>
```

### Testing Canvas Features

#### Unit Testing Nodes

```typescript
// src/components/canvas/nodes/__tests__/CustomNode.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CustomNode } from '../CustomNode';

describe('CustomNode', () => {
  const renderNode = (props: any) => {
    return render(
      <ReactFlowProvider>
        <CustomNode {...props} />
      </ReactFlowProvider>
    );
  };
  
  it('renders with correct label', () => {
    renderNode({
      id: 'test-1',
      data: { label: 'Test Node' },
    });
    
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const onClick = jest.fn();
    renderNode({
      id: 'test-1',
      data: { label: 'Test', onClick },
    });
    
    fireEvent.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

#### Integration Testing Canvas

```typescript
// src/components/canvas/__tests__/WorkflowCanvas.test.tsx

import { render, screen } from '@testing-library/react';
import { WorkflowCanvas } from '../WorkflowCanvas';

describe('WorkflowCanvas', () => {
  it('renders all nodes', () => {
    const nodes = [
      { id: '1', type: 'Worker', data: { label: 'Node 1' } },
      { id: '2', type: 'Worker', data: { label: 'Node 2' } },
    ];
    
    render(<WorkflowCanvas nodes={nodes} edges={[]} />);
    
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });
  
  it('renders edges between nodes', () => {
    const nodes = [
      { id: '1', type: 'Worker', data: { label: 'Node 1' } },
      { id: '2', type: 'Worker', data: { label: 'Node 2' } },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
    ];
    
    render(<WorkflowCanvas nodes={nodes} edges={edges} />);
    
    // Verify edge exists in DOM
    const edge = document.querySelector('[data-id="e1"]');
    expect(edge).toBeInTheDocument();
  });
});
```

### Common Canvas Patterns in Stitch

#### BMC Section Navigation

```typescript
// Drill into a section from BMC
const handleSectionClick = (sectionId: string, sectionName: string) => {
  const { drillInto } = useCanvasNavigation();
  drillInto(sectionId, sectionName, 'section');
};
```

#### Workflow Item Linking

```typescript
// Link section item to workflow
const handleItemDoubleClick = (itemData: any) => {
  if (itemData.linked_workflow_id) {
    const { drillInto } = useCanvasNavigation();
    drillInto(itemData.linked_workflow_id, itemData.label, 'workflow');
  }
};
```

#### Entity Visualization

```typescript
// Show entities moving through workflow
<EntityOverlay
  entities={entities}
  nodes={nodes}
  edges={edges}
  onEntityClick={(entity) => {
    // Show entity details
  }}
/>
```

#### Run Status Overlay

```typescript
// Show execution status on canvas
<RunStatusOverlay
  runId={runId}
  nodeStates={run?.node_states}
  onNodeClick={(nodeId) => {
    // Show node details
  }}
/>
```

## Next Steps

After creating your node:

1. **Document it** - Add to node-components.md
2. **Test thoroughly** - Create test flows and unit tests
3. **Share examples** - Add usage examples to docs
4. **Get feedback** - Have team review the implementation
5. **Monitor usage** - Track errors and performance

## Related Documentation

- [Node Components](../frontend/node-components.md) - Complete node reference
- [Execution Engine](../backend/execution-engine.md) - How nodes execute
- [Canvas Components](../frontend/canvas-components.md) - Canvas integration
- [Worker System](../backend/worker-system.md) - Worker node patterns
- [Type System](../architecture/type-system.md) - Node data types
- [Execution Model](../architecture/execution-model.md) - Edge-walking pattern

## Support

If you run into issues:

1. Check the troubleshooting section above
2. Review existing node implementations
3. Check console for errors
4. Ask in team chat
5. Create a GitHub issue with details

Happy node building! 🚀

