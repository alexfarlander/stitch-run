# Design Document

## Overview

This design defines four specialized React components for displaying production-side items in the Business Model Canvas (BMC). Each component represents a different type of infrastructure resource: Integrations (APIs), People (team members and AI agents), Code (deployments), and Data (data sources). These components extend the existing `SectionItemNode` pattern with specialized layouts and status indicators tailored to technical infrastructure monitoring.

The design also includes a health check API endpoint that verifies integration connectivity by checking for configured API keys in environment variables. This endpoint provides real-time status information that the Integration items display.

## Architecture

### Component Hierarchy

```
BMCCanvas
└── SectionNode (Production sections)
    └── SectionItemNode (base component)
        ├── IntegrationItem (extends with health status)
        ├── PersonItem (extends with avatar and type badge)
        ├── CodeItem (extends with deployment status)
        └── DataItem (extends with record count and sync time)
```

### Data Flow

1. **Static Configuration**: Item data is stored in the BMC canvas graph as node data
2. **Health Check API**: Integration status is fetched from `/api/integrations/health`
3. **Real-time Updates**: Status changes trigger re-renders through React state
4. **Visual Feedback**: Status indicators update colors based on operational state

### Integration with Existing System

These components integrate with the existing canvas architecture:
- Use the same `@xyflow/react` node system as other canvas items
- Follow the existing `SectionItemNode` pattern for consistency
- Maintain compatibility with the drill-down navigation system
- Support the same connection handles for potential workflow linking

## Components and Interfaces

### 1. IntegrationItem Component

**File**: `src/components/canvas/items/IntegrationItem.tsx`

**Props Interface**:
```typescript
interface IntegrationItemProps {
  id: string;
  data: {
    label: string;              // API name (e.g., "Claude API")
    apiKey: string;             // Environment variable name
    status: 'connected' | 'disconnected' | 'error';
    lastPing?: string;          // ISO timestamp
    usagePercent?: number;      // 0-100, optional
  };
}
```

**Visual Layout**:
- Card with API name as header
- Large status indicator (colored dot or icon)
- Last ping time in relative format ("2 minutes ago")
- Optional usage bar showing consumption percentage
- Distinct color scheme: Purple/indigo tones for production infrastructure

### 2. PersonItem Component

**File**: `src/components/canvas/items/PersonItem.tsx`

**Props Interface**:
```typescript
interface PersonItemProps {
  id: string;
  data: {
    label: string;              // Person name
    role: string;               // "Founder", "AI Assistant", etc.
    avatarUrl?: string;         // Avatar image URL
    status: 'online' | 'offline' | 'busy';
    type: 'human' | 'ai';       // Determines badge icon
  };
}
```

**Visual Layout**:
- Avatar image (or placeholder with initials)
- Name and role stacked vertically
- Status indicator (colored dot) in corner
- Type badge (👤 or 🤖) overlaid on avatar
- Warm color scheme for human presence

### 3. CodeItem Component

**File**: `src/components/canvas/items/CodeItem.tsx`

**Props Interface**:
```typescript
interface CodeItemProps {
  id: string;
  data: {
    label: string;              // Deployment name
    status: 'deployed' | 'building' | 'failed';
    lastDeploy: string;         // ISO timestamp
    repoUrl?: string;           // Optional GitHub/GitLab link
    deploymentUrl?: string;     // Optional live URL
  };
}
```

**Visual Layout**:
- Deployment name with code icon
- Status badge with appropriate color
- Last deploy time in relative format
- Optional external link icon for repo/deployment
- Tech-focused color scheme: Blue/cyan tones

### 4. DataItem Component

**File**: `src/components/canvas/items/DataItem.tsx`

**Props Interface**:
```typescript
interface DataItemProps {
  id: string;
  data: {
    label: string;              // Data source name
    type: 'database' | 'spreadsheet' | 'chart';
    recordCount: number;        // Number of records
    lastSync: string;           // ISO timestamp
    status: 'operational' | 'error';
  };
}
```

**Visual Layout**:
- Data source name with type icon
- Formatted record count ("1,234 leads")
- Last sync time in relative format
- Status indicator
- Data-focused color scheme: Green/emerald tones

### 5. Health Check API

**File**: `src/app/api/integrations/health/route.ts`

**Endpoint**: `GET /api/integrations/health`

**Response Interface**:
```typescript
interface HealthCheckResponse {
  integrations: Array<{
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastPing: string;
    message?: string;
  }>;
  timestamp: string;
}
```

**Logic**:
1. Check for presence of known API key environment variables
2. Return "connected" if key exists and is non-empty
3. Return "disconnected" if key is missing or empty
4. Return "error" if there's an issue checking the key
5. Include timestamp for cache invalidation

**Checked Integrations**:
- Claude API: `ANTHROPIC_API_KEY`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Shotstack: `SHOTSTACK_API_KEY`
- ElevenLabs: `ELEVENLABS_API_KEY`
- MiniMax: `MINIMAX_API_KEY`

## Data Models

### Integration Status Model

```typescript
interface IntegrationStatus {
  name: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: string;
  usagePercent?: number;
}
```

### Person Model

```typescript
interface Person {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'busy';
  type: 'human' | 'ai';
}
```

### Code Deployment Model

```typescript
interface CodeDeployment {
  id: string;
  name: string;
  status: 'deployed' | 'building' | 'failed';
  lastDeploy: string;
  repoUrl?: string;
  deploymentUrl?: string;
}
```

### Data Source Model

```typescript
interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'spreadsheet' | 'chart';
  recordCount: number;
  lastSync: string;
  status: 'operational' | 'error';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Status indicator color consistency

*For any* production-side item with a status field, the visual indicator color should match the status value according to the defined color mapping (green for success states, red for error states, gray for inactive states, yellow/blue for intermediate states).

This property consolidates all status-to-color mapping requirements across all four item types. Each item type has its own status values, but they all follow the same color convention: success/operational/connected/deployed = green, error/failed = red, inactive/disconnected/offline = gray, intermediate states (busy/building) = yellow/blue.

**Validates: Requirements 1.5, 1.6, 1.7, 3.7, 3.8, 3.9, 4.5, 4.6, 4.7, 5.6, 5.7**

### Property 2: Timestamp formatting consistency

*For any* production-side item displaying a timestamp (lastPing, lastDeploy, lastSync), the formatted output should be a valid relative time string (e.g., "2 minutes ago", "1 hour ago") when the timestamp is a valid ISO date string.

This property ensures that all timestamps across all item types are formatted consistently using relative time. Invalid timestamps should gracefully degrade to "Unknown" rather than crashing.

**Validates: Requirements 1.3, 4.3, 5.4**

### Property 3: Health check API key validation

*For any* integration checked by the health check API, if the corresponding environment variable exists and is non-empty, the status should be "connected"; if it is missing or empty, the status should be "disconnected".

This property defines the core logic of the health check system. It ensures that integration status accurately reflects the presence of API keys in the environment.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Type badge display consistency

*For any* person item, the type badge should display 👤 when type is "human" and 🤖 when type is "ai", with no other values allowed.

This property ensures that the type badge correctly distinguishes between human team members and AI agents, providing clear visual identification.

**Validates: Requirements 3.5, 3.6**

### Property 5: Record count formatting

*For any* data item with a recordCount value, the displayed string should format numbers with comma separators (e.g., 1234 becomes "1,234") for values >= 1000.

This property ensures that large numbers are readable by inserting comma separators at appropriate positions.

**Validates: Requirements 5.3**

### Property 6: Production-side visual distinction

*For any* production-side item component (Integration, Person, Code, Data), the applied color scheme should be distinct from customer-side components and consistent within the production category.

This property ensures that production-side items are visually distinguishable from customer-side items through consistent use of production-specific color schemes (purple/indigo tones).

**Validates: Requirements 6.1, 6.2**

### Property 7: Required data rendering

*For any* production-side item, all required data fields (name/label, status indicator) should be present in the rendered output when the component receives valid props.

This property consolidates the basic rendering requirements across all item types, ensuring that essential information is always displayed.

**Validates: Requirements 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 5.5**

### Property 8: Optional data conditional rendering

*For any* production-side item with optional data fields (usage indicator, avatar URL, repo URL), the field should be rendered when present and omitted when absent, without causing rendering errors.

This property ensures that optional fields are handled gracefully, displaying when available but not breaking the component when missing.

**Validates: Requirements 1.4, 4.4**

### Property 9: Health check completeness

*For any* health check API invocation, the response should include status information for all configured integrations (Claude, Supabase, Shotstack, ElevenLabs, MiniMax) with no omissions.

This property ensures that the health check API provides comprehensive status information for the entire integration ecosystem.

**Validates: Requirements 2.6**

### Property 10: Health check timestamp update

*For any* health check execution, the lastPing timestamp for each integration should be updated to the current time upon completion.

This property ensures that the health check maintains accurate timing information for monitoring purposes.

**Validates: Requirements 2.5**

## Error Handling

### Component-Level Errors

1. **Missing Data**: If required props are missing, display a placeholder with error state
2. **Invalid Status**: If status value is not in the expected enum, default to "error" state
3. **Invalid Timestamps**: If timestamp cannot be parsed, display "Unknown" instead of crashing
4. **Missing Icons**: If icon component is not found, fall back to a default icon

### API-Level Errors

1. **Environment Variable Access**: Wrap env var access in try-catch to handle permission issues
2. **Missing Keys**: Treat missing keys as "disconnected" rather than throwing errors
3. **Network Failures**: Return cached status with error flag if health check fails
4. **Timeout**: Implement 5-second timeout for health checks to prevent hanging

### User-Facing Error Messages

- Integration errors: "Unable to verify connection"
- Person status errors: "Status unavailable"
- Code deployment errors: "Deployment status unknown"
- Data sync errors: "Sync status unavailable"

## Testing Strategy

### Unit Testing

We will write unit tests for:

1. **Component Rendering**: Verify each component renders with valid props
2. **Status Color Mapping**: Test that status values map to correct CSS classes
3. **Timestamp Formatting**: Test relative time formatting with various inputs
4. **Number Formatting**: Test record count formatting with edge cases (0, 999, 1000, 1000000)
5. **Error States**: Test component behavior with missing or invalid props
6. **Health Check Logic**: Test API key validation logic with various env var states

### Property-Based Testing

We will use `fast-check` (JavaScript property-based testing library) for the following properties:

1. **Property 1 (Status Color Consistency)**: Generate random status values for each item type and verify color mapping
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 1: Status indicator color consistency**`

2. **Property 2 (Timestamp Formatting)**: Generate random valid ISO timestamps and verify formatting
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 2: Timestamp formatting consistency**`

3. **Property 3 (Health Check Validation)**: Generate random env var states and verify status logic
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 3: Health check API key validation**`

4. **Property 4 (Type Badge Display)**: Generate random person types and verify badge rendering
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 4: Type badge display consistency**`

5. **Property 5 (Record Count Formatting)**: Generate random numbers and verify formatting
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 5: Record count formatting**`

6. **Property 6 (Visual Distinction)**: Generate random production-side items and verify color schemes
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 6: Production-side visual distinction**`

7. **Property 7 (Required Data Rendering)**: Generate random item data and verify required fields are present
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 7: Required data rendering**`

8. **Property 8 (Optional Data Conditional Rendering)**: Generate random item data with/without optional fields and verify conditional rendering
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 8: Optional data conditional rendering**`

9. **Property 9 (Health Check Completeness)**: Verify health check response includes all integrations
   - Configure to run 100 iterations minimum
   - Tag: `**Feature: production-side-items, Property 9: Health check completeness**`

10. **Property 10 (Health Check Timestamp Update)**: Verify lastPing timestamp is updated on each health check
    - Configure to run 100 iterations minimum
    - Tag: `**Feature: production-side-items, Property 10: Health check timestamp update**`

### Integration Testing

Integration tests will verify:

1. **Health Check API**: Call the endpoint and verify response structure
2. **Component Integration**: Render components within a canvas context
3. **Status Updates**: Verify components re-render when status changes

### Testing Tools

- **Unit Tests**: Vitest + React Testing Library
- **Property-Based Tests**: fast-check
- **Integration Tests**: Vitest with Supabase test client
