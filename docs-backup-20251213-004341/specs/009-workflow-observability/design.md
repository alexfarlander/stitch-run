# Design: Workflow Observability

## Architecture Overview

The workflow observability system builds upon existing components to provide comprehensive debugging and monitoring capabilities. The architecture consists of three main areas:

1. **Node Output Inspection**: Integration of existing `NodeOutputPanel` into `RunViewer`
2. **Journey Timeline**: Integration of existing `JourneyTimelinePanel` into entity detail views
3. **Dashboard Analytics**: Navigation integration and data verification for existing `WorkflowDashboard`

## Current State Analysis

### Components That Exist
- ✅ `NodeOutputPanel` - Fully implemented with JSON viewer, copy functionality, and pagination
- ✅ `JourneyTimelinePanel` - Fully implemented with event display, highlighting, and pagination
- ✅ `WorkflowDashboard` - Fully implemented with metrics, charts, and export functionality
- ✅ `DashboardButton` - Navigation component for dashboard access
- ✅ Dashboard route at `/canvas/[id]/dashboard`

### Integration Gaps
- ❌ `DashboardButton` not imported/rendered in canvas page
- ⚠️ `NodeOutputPanel` integrated in `RunViewer` but needs verification
- ⚠️ `JourneyTimelinePanel` integrated in `EntityListPanel` but needs verification
- ❌ No navigation link to dashboard from canvas toolbar

### API Endpoints That Exist
- ✅ Journey events: `stitch_journey_events` table queries
- ✅ Run data: `stitch_runs` table queries  
- ✅ Entity data: `stitch_entities` table queries
- ✅ Canvas data: `stitch_flows` table queries

## Component Architecture

### 1. Node Output Viewer Integration

**Current Implementation**: `NodeOutputPanel` is already integrated into `RunViewer`

**Location**: `src/components/RunViewer.tsx`

**Integration Status**: ✅ Complete - Component renders when node is clicked

**Verification Needed**:
- Test with real workflow data
- Verify JSON formatting works correctly
- Verify copy functionality works
- Test with large output data

### 2. Journey Timeline Integration

**Current Implementation**: `JourneyTimelinePanel` is integrated into `EntityListPanel` as a tab

**Location**: `src/components/canvas/entities/EntityListPanel.tsx`

**Integration Status**: ✅ Complete - Component renders in entity detail dialog

**Verification Needed**:
- Test with real journey events
- Verify event highlighting works on canvas
- Test pagination with large event lists
- Verify real-time updates work

### 3. Dashboard Navigation Integration

**Current Implementation**: `DashboardButton` exists but not integrated

**Location**: `src/components/dashboard/DashboardButton.tsx`

**Integration Status**: ❌ Missing - Button not imported or rendered

**Required Changes**:
- Import `DashboardButton` in canvas page
- Add button to canvas toolbar/header
- Position appropriately in UI
- Test navigation works correctly

## Data Models

### Node Output Data

```typescript
interface NodeOutput {
  nodeId: string;
  runId: string;
  output: any; // JSON data from node execution
  status: 'completed' | 'failed' | 'running' | 'pending';
  timestamp: string;
}
```

### Journey Event Data

```typescript
interface JourneyEvent {
  id: string;
  entity_id: string;
  event_type: 'node_arrival' | 'node_completion' | 'edge_traversal';
  node_id: string | null;
  edge_id: string | null;
  metadata: any;
  created_at: string;
}
```

### Dashboard Metrics Data

```typescript
interface DashboardMetrics {
  totalEntities: number;
  runsStartedToday: number;
  completedToday: number;
  failedToday: number;
  entitiesByNode: Record<string, { count: number; nodeName: string }>;
  conversionRates: Array<{
    fromNode: string;
    toNode: string;
    rate: number;
  }>;
}
```

## API Contracts

### Node Output Retrieval

**Method**: GET  
**Path**: Via existing run data queries  
**Response**: Node output extracted from `stitch_runs.node_states[nodeId].output`

### Journey Events Retrieval

**Method**: GET  
**Path**: Via existing Supabase queries  
**Response**: Array of journey events from `stitch_journey_events` table

### Dashboard Data Retrieval

**Method**: GET  
**Path**: Via existing dashboard component queries  
**Response**: Aggregated metrics from multiple tables

## Integration Points

### Canvas Page Integration

**File**: `src/app/canvas/[id]/page.tsx`

**Required Changes**:
1. Import `DashboardButton` component
2. Add button to canvas header/toolbar area
3. Position button appropriately (top-right suggested)
4. Ensure button only shows for workflow canvases

**Implementation**:
```typescript
import { DashboardButton } from '@/components/dashboard/DashboardButton';

// In canvas page component:
<div className="canvas-header">
  {/* Other header content */}
  <DashboardButton canvasId={canvasId} />
</div>
```

### RunViewer Verification

**File**: `src/components/RunViewer.tsx`

**Current Status**: Already integrated

**Verification Tasks**:
- Test node click handler works
- Verify output panel displays correctly
- Test with various data types (JSON, strings, numbers)
- Verify copy functionality works

### EntityListPanel Verification

**File**: `src/components/canvas/entities/EntityListPanel.tsx`

**Current Status**: Already integrated as tab

**Verification Tasks**:
- Test timeline tab displays
- Verify event data loads correctly
- Test event click highlighting
- Verify pagination works

## User Experience Flow

### Node Output Inspection Flow

1. User navigates to run view (`/runs/[runId]`)
2. User sees workflow canvas with node status indicators
3. User clicks on completed node
4. `NodeOutputPanel` slides in from right
5. User sees formatted JSON output with syntax highlighting
6. User can copy output to clipboard
7. User closes panel by clicking X or outside panel

### Journey Timeline Flow

1. User navigates to canvas with entities
2. User opens entity list panel (left side)
3. User clicks on specific entity
4. Entity detail dialog opens
5. User clicks "Timeline" tab
6. `JourneyTimelinePanel` displays chronological events
7. User clicks on event to highlight corresponding canvas element
8. User can scroll through paginated events

### Dashboard Access Flow

1. User navigates to canvas page (`/canvas/[id]`)
2. User sees dashboard button in canvas header
3. User clicks dashboard button
4. Browser navigates to `/canvas/[id]/dashboard`
5. `WorkflowDashboard` displays metrics and charts
6. User can change time ranges and export data

## Error Handling

### Node Output Errors

- **No Output Data**: Display "No output data available" message
- **Large Data**: Paginate output display, show size warning
- **Invalid JSON**: Display raw data with error indicator
- **Network Error**: Show retry button and error message

### Journey Timeline Errors

- **No Events**: Display "No journey events found" message
- **Loading Error**: Show error state with retry option
- **Pagination Error**: Graceful degradation to manual load more

### Dashboard Errors

- **No Data**: Display empty state with helpful messaging
- **Query Error**: Show error banner with retry option
- **Export Error**: Display toast notification with error details

## Performance Considerations

### Node Output Panel

- Paginate large JSON output (10,000 characters per page)
- Use React.memo for component optimization
- Debounce search/filter operations

### Journey Timeline

- Implement virtual scrolling for large event lists
- Paginate events (50 events per page)
- Cache event data to avoid repeated queries

### Dashboard

- Cache metrics data with reasonable TTL
- Use React.memo for chart components
- Implement loading skeletons for better perceived performance

## Testing Strategy

### Unit Testing

- Test component rendering with various data states
- Test user interactions (clicks, form submissions)
- Test error handling and edge cases
- Test data transformation and formatting

### Integration Testing

- Test complete user workflows end-to-end
- Test real-time data updates
- Test navigation between components
- Test data export functionality

### Manual Testing

- Test with real workflow data
- Test performance with large datasets
- Test across different browsers
- Test responsive design on mobile devices

## Security Considerations

### Data Access

- All observability data respects existing RLS policies
- Users can only view data for workflows they own
- Real-time subscriptions are scoped to user permissions

### Export Security

- Exported data includes only user-accessible information
- No sensitive system data included in exports
- Export operations logged for audit purposes

## Migration Strategy

Since most components already exist, this is primarily an integration and verification effort:

1. **Phase 1**: Add dashboard navigation (1 hour)
2. **Phase 2**: Verify node output integration (2 hours)  
3. **Phase 3**: Verify journey timeline integration (2 hours)
4. **Phase 4**: End-to-end testing (3 hours)

## Dependencies

- Existing database schema (no changes required)
- Existing API endpoints (no changes required)
- Existing component library (no changes required)
- Real workflow data for testing

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:
- Properties 1.1, 1.3, and 1.4 all test node output panel behavior and can be combined
- Properties 2.1, 2.2, and 2.3 all test journey timeline display and can be combined  
- Properties 3.2, 3.3, 3.4, and 3.5 all test dashboard functionality and can be combined
- Properties 4.1, 4.2, 4.3, and 4.4 all test real-time updates and can be combined
- Properties 5.2, 5.3, and 5.4 all test export functionality and can be combined

**Property 1: Node output panel functionality**
*For any* completed node in a run, clicking the node should display an output panel with formatted JSON, copy functionality, and proper close behavior
**Validates: Requirements 1.1, 1.3, 1.4**

**Property 2: JSON formatting consistency**
*For any* JSON data displayed in the output panel, the data should include syntax highlighting and collapsible sections
**Validates: Requirements 1.2**

**Property 3: Journey timeline completeness**
*For any* entity with journey events, the timeline should display all events with timestamps, event types, node names, and metadata, and clicking events should highlight corresponding canvas elements
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 4: Timeline pagination behavior**
*For any* entity with more than 50 journey events, the timeline should implement pagination to maintain performance
**Validates: Requirements 2.4**

**Property 5: Loading state consistency**
*For any* async operation (timeline loading, dashboard loading, export), appropriate loading indicators should be displayed
**Validates: Requirements 2.5, 5.4**

**Property 6: Dashboard navigation functionality**
*For any* canvas page, clicking the dashboard button should navigate to the correct dashboard URL and display all required metrics
**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

**Property 7: Real-time update consistency**
*For any* data change (entity position, run completion, node output availability), the UI should update automatically while maintaining user context
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 8: Real-time failure graceful degradation**
*For any* real-time connection failure, the system should gracefully degrade to manual refresh options without crashing
**Validates: Requirements 4.5**

**Property 9: Export functionality completeness**
*For any* data type (entities, runs, events), the export function should generate a properly formatted CSV file with all relevant fields
**Validates: Requirements 5.2, 5.3**

**Property 10: Export error handling**
*For any* export failure, the system should display appropriate error messages to the user
**Validates: Requirements 5.5**

## Success Metrics

- Users can access dashboard from canvas page
- Node output viewing works for 100% of completed nodes
- Journey timeline displays for 100% of entities with events
- Dashboard loads within 3 seconds for typical workflows
- Export functionality works for all data types
- Zero critical bugs in observability features