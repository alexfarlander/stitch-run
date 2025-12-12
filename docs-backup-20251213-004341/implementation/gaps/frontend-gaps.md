# Frontend Implementation Gaps

## Overview

This document identifies missing UI components, incomplete features, and UX improvements needed in the Stitch frontend. It serves as a roadmap for frontend development priorities and helps developers understand what functionality is planned but not yet implemented.

**Last Updated:** December 5, 2024

## Critical Gaps (High Priority)

### 1. Entity Movement Controls

**Status:** Placeholder only  
**Location:** `src/components/canvas/entities/EntityOverlay.tsx`

**Current State:**
- `handleMoveEntity` function exists but only logs to console
- EntityDetailPanel has UI for movement but no backend integration
- No drag-and-drop support for entity repositioning

**Missing Functionality:**
- Manual entity movement between nodes
- Drag-and-drop entity repositioning on canvas
- Bulk entity movement operations
- Entity movement validation (can entity move to target node?)
- Undo/redo for entity movements

**Implementation Requirements:**
```typescript
// TODO: Implement entity movement
const handleMoveEntity = async (entityId: string, targetNodeId: string) => {
  // 1. Validate target node exists
  // 2. Update entity position in database
  // 3. Create journey event for manual move
  // 4. Trigger animation to new position
  // 5. Update entity metadata
};
```

**Related Files:**
- `src/components/canvas/entities/EntityOverlay.tsx` (line 50)
- `src/components/panels/EntityDetailPanel.tsx`
- `src/lib/entities/travel.ts` (needs manual move function)

---

### 2. Detail Canvas View

**Status:** Placeholder only  
**Location:** `src/components/canvas/CanvasRouter.tsx`

**Current State:**
- `DetailCanvas` component shows "Coming soon..." message
- No implementation for drill-down beyond workflow level
- Canvas type 'detail' is defined but not rendered

**Missing Functionality:**
- Detailed view for individual workflow nodes
- Node configuration editor
- Node execution history viewer
- Input/output data inspector
- Node-level entity tracking

**Use Cases:**
- Viewing detailed configuration of a Worker node
- Inspecting execution history and outputs
- Debugging failed node executions
- Editing node parameters without Mermaid

**Implementation Requirements:**
- Design detail canvas layout
- Create node configuration forms
- Build execution history timeline
- Add data inspector component
- Implement navigation from workflow to detail view

**Related Files:**
- `src/components/canvas/CanvasRouter.tsx` (line 86)
- `src/types/canvas-schema.ts` (canvas_type: 'detail')

---

### 3. Node Configuration UI

**Status:** Missing  
**Location:** N/A (needs to be created)

**Current State:**
- Node configuration only possible via Mermaid import
- No visual editor for node properties
- No form-based configuration interface

**Missing Functionality:**
- Visual node property editor
- Worker type selector with validation
- Input/output mapping interface
- Conditional logic builder
- Configuration templates for common patterns

**Required Components:**
- `NodeConfigPanel` - Side panel for editing selected node
- `WorkerTypeSelector` - Dropdown with worker registry
- `InputMappingEditor` - Visual input mapping tool
- `ConfigTemplates` - Pre-built configuration templates

**Implementation Requirements:**
```typescript
interface NodeConfigPanelProps {
  nodeId: string;
  nodeType: string;
  currentConfig: Record<string, any>;
  onSave: (config: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}
```

**Related Files:**
- `src/components/canvas/nodes/` (all node components)
- `src/lib/workers/registry.ts` (worker definitions)

---

### 4. Real-time Collaboration Features

**Status:** Not implemented  
**Location:** N/A

**Current State:**
- Single-user editing only
- No presence indicators
- No conflict resolution
- No collaborative cursors

**Missing Functionality:**
- Multi-user canvas editing
- User presence indicators (who's viewing/editing)
- Collaborative cursors showing other users' positions
- Real-time change synchronization
- Conflict resolution for simultaneous edits
- User avatars on canvas
- Activity feed showing recent changes

**Implementation Requirements:**
- Supabase Presence API integration
- Cursor position broadcasting
- Change conflict detection
- Optimistic UI updates with rollback
- User session management

**Technical Challenges:**
- Handling simultaneous node position changes
- Resolving conflicting edge additions/deletions
- Managing version conflicts
- Performance with multiple active users

---

### 5. Workflow Execution Controls

**Status:** Partially implemented  
**Location:** `src/components/canvas/StitchCanvas.tsx`

**Current State:**
- Run button creates new execution
- No pause/resume functionality
- No step-by-step execution
- No execution cancellation

**Missing Functionality:**
- Pause/resume workflow execution
- Step-by-step debugging mode
- Cancel running workflow
- Retry failed nodes
- Skip optional nodes
- Execution speed control (for demos)
- Breakpoint support

**Required Components:**
- `ExecutionControls` - Play/pause/stop/step buttons
- `BreakpointManager` - Set breakpoints on nodes
- `ExecutionSpeedSlider` - Control animation speed
- `NodeRetryButton` - Retry individual failed nodes

**Implementation Requirements:**
```typescript
interface ExecutionControlsProps {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onCancel: () => Promise<void>;
  onStep: () => Promise<void>;
}
```

---

## Important Gaps (Medium Priority)

### 6. Entity Filtering and Search

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Filter entities by type (lead/customer/churned)
- Search entities by name or email
- Filter by metadata properties
- Show/hide entity types
- Entity list view with sorting
- Bulk entity operations

**Required Components:**
- `EntityFilterPanel` - Filter controls sidebar
- `EntitySearchBar` - Search input with autocomplete
- `EntityListView` - Table view of all entities
- `BulkEntityActions` - Select and act on multiple entities

---

### 7. Journey Replay and Visualization

**Status:** Partially implemented  
**Location:** `src/components/canvas/JourneyHistoryPanel.tsx`

**Current State:**
- Journey history displayed as list
- No replay functionality
- No visual journey path highlighting

**Missing Functionality:**
- Replay entity journey with animation
- Highlight journey path on canvas
- Journey timeline scrubber
- Journey comparison (compare multiple entities)
- Journey analytics (average time, conversion points)
- Export journey data

**Required Components:**
- `JourneyReplayControls` - Play/pause/speed controls
- `JourneyTimeline` - Visual timeline with scrubber
- `JourneyPathHighlight` - Highlight edges on canvas
- `JourneyComparison` - Side-by-side journey comparison

---

### 8. Canvas Templates and Presets

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Pre-built canvas templates
- Template library browser
- Save custom templates
- Template categories (sales, marketing, support)
- Template preview
- One-click template instantiation

**Required Components:**
- `TemplateLibrary` - Browse and select templates
- `TemplatePreview` - Preview template before applying
- `TemplateSaveDialog` - Save current canvas as template
- `TemplateCategories` - Organize templates by category

---

### 9. Node Library and Palette

**Status:** Not implemented  
**Location:** N/A

**Current State:**
- Nodes can only be added via Mermaid import
- No drag-and-drop node addition
- No visual node palette

**Missing Functionality:**
- Draggable node palette
- Node categories (workers, logic, UX)
- Node search and filtering
- Recently used nodes
- Favorite nodes
- Node descriptions and examples

**Required Components:**
- `NodePalette` - Sidebar with draggable nodes
- `NodeSearch` - Search nodes by name/type
- `NodeCategoryTabs` - Organize nodes by category
- `NodePreview` - Show node details on hover

---

### 10. Workflow Validation and Linting

**Status:** Basic validation only  
**Location:** `src/lib/canvas/validate-graph.ts`

**Current State:**
- Basic graph validation (cycles, orphans)
- No real-time validation feedback
- No validation warnings in UI

**Missing Functionality:**
- Real-time validation as user edits
- Visual validation error indicators on nodes
- Validation warnings panel
- Suggested fixes for common issues
- Validation rules configuration
- Custom validation rules

**Required Components:**
- `ValidationPanel` - List of validation errors/warnings
- `ValidationIndicator` - Visual indicator on invalid nodes
- `ValidationSuggestions` - Suggested fixes
- `ValidationRulesConfig` - Configure validation rules

---

### 11. Performance Monitoring Dashboard

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Workflow execution metrics
- Node execution time tracking
- Entity throughput visualization
- Bottleneck identification
- Historical performance trends
- Cost tracking per execution

**Required Components:**
- `PerformanceDashboard` - Main metrics view
- `ExecutionTimeChart` - Node execution time visualization
- `ThroughputChart` - Entity flow rate over time
- `BottleneckAnalysis` - Identify slow nodes
- `CostTracker` - Track API costs per execution

---

## UX Improvements (Medium Priority)

### 12. Keyboard Shortcuts

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Canvas navigation shortcuts (pan, zoom)
- Node selection shortcuts
- Copy/paste nodes
- Undo/redo (Cmd+Z, Cmd+Shift+Z)
- Quick search (Cmd+K)
- Save (Cmd+S)
- Run workflow (Cmd+Enter)

**Implementation Requirements:**
- Global keyboard event handler
- Shortcut configuration system
- Keyboard shortcuts help modal
- Conflict detection with browser shortcuts

---

### 13. Onboarding and Tutorials

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- First-time user onboarding flow
- Interactive tutorials
- Contextual help tooltips
- Video tutorials
- Sample workflows
- Guided workflow creation

**Required Components:**
- `OnboardingFlow` - Step-by-step onboarding
- `TutorialOverlay` - Interactive tutorial system
- `ContextualHelp` - Tooltips and help text
- `SampleWorkflows` - Pre-built example workflows

---

### 14. Dark/Light Mode Toggle

**Status:** Dark mode only  
**Location:** N/A

**Current State:**
- Only dark mode implemented
- No theme switching
- Hardcoded dark colors

**Missing Functionality:**
- Light mode theme
- Theme toggle button
- Theme persistence
- System theme detection
- Custom theme colors

**Implementation Requirements:**
- Theme context provider
- CSS variable system for colors
- Theme toggle component
- Local storage persistence

---

### 15. Mobile Responsiveness

**Status:** Desktop only  
**Location:** All canvas components

**Current State:**
- Canvas optimized for desktop
- No mobile touch gestures
- Small screens not supported

**Missing Functionality:**
- Mobile-optimized canvas view
- Touch gestures (pinch to zoom, two-finger pan)
- Mobile navigation menu
- Simplified mobile UI
- Responsive breakpoints
- Mobile entity interaction

**Technical Challenges:**
- React Flow mobile support
- Touch event handling
- Small screen layout
- Performance on mobile devices

---

### 16. Accessibility Improvements

**Status:** Limited accessibility  
**Location:** All components

**Current State:**
- Basic keyboard navigation
- Limited screen reader support
- No ARIA labels on canvas elements

**Missing Functionality:**
- Full keyboard navigation
- Screen reader announcements for entity movement
- ARIA labels for all interactive elements
- Focus indicators
- High contrast mode
- Reduced motion mode
- Keyboard-only workflow creation

**Implementation Requirements:**
- ARIA label audit
- Keyboard navigation testing
- Screen reader testing
- Focus management system
- Accessibility documentation

---

## Nice-to-Have Features (Low Priority)

### 17. Canvas Export Options

**Status:** Mermaid export only  
**Location:** `src/components/canvas/MermaidImportExport.tsx`

**Current State:**
- Export to Mermaid format
- No other export formats

**Missing Functionality:**
- Export to PNG/SVG image
- Export to PDF
- Export to JSON (full data)
- Export execution report
- Export entity journey data
- Scheduled exports

---

### 18. Workflow Versioning UI Enhancements

**Status:** Basic versioning  
**Location:** `src/components/canvas/VersionHistory.tsx`

**Current State:**
- Version list with timestamps
- View and revert versions
- Basic commit messages

**Missing Functionality:**
- Visual diff between versions
- Branch and merge support
- Version tags and labels
- Version comparison view
- Automatic version creation on schedule
- Version approval workflow

---

### 19. Entity Customization

**Status:** Fixed entity types  
**Location:** `src/types/entity.ts`

**Current State:**
- Three fixed entity types (lead, customer, churned)
- Fixed color scheme
- Limited metadata

**Missing Functionality:**
- Custom entity types
- Custom entity colors
- Custom entity icons
- Custom metadata fields
- Entity type templates
- Entity type inheritance

---

### 20. Workflow Marketplace

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Browse public workflows
- Share workflows with community
- Rate and review workflows
- Fork and customize workflows
- Workflow categories and tags
- Workflow search

---

### 21. Advanced Analytics

**Status:** Basic metrics only  
**Location:** N/A

**Missing Functionality:**
- Conversion funnel analysis
- A/B testing support
- Cohort analysis
- Retention metrics
- Revenue attribution
- Custom metric definitions
- Analytics dashboard builder

---

### 22. Notification System

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Workflow completion notifications
- Entity milestone notifications
- Error notifications
- Email notifications
- Slack/Discord integrations
- Notification preferences
- Notification history

---

### 23. Workflow Scheduling

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Schedule workflow execution
- Recurring workflow runs
- Cron-style scheduling
- Time-based triggers
- Scheduled entity creation
- Execution calendar view

---

### 24. Canvas Collaboration Comments

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Add comments to nodes
- Comment threads
- @mentions
- Comment resolution
- Comment notifications
- Comment history

---

### 25. Workflow Testing Tools

**Status:** Not implemented  
**Location:** N/A

**Missing Functionality:**
- Test workflow with mock data
- Test individual nodes
- Test data generator
- Test assertions
- Test coverage reporting
- Automated testing

---

## Technical Debt

### 26. Component Refactoring Needs

**Issues:**
- Large component files (>500 lines)
- Duplicated logic across components
- Inconsistent prop naming
- Missing TypeScript types in some areas
- Inconsistent error handling

**Files Needing Refactoring:**
- `src/components/canvas/StitchCanvas.tsx` (600+ lines)
- `src/app/library/page.tsx` (500+ lines)
- `src/components/canvas/BMCCanvas.tsx` (complex node type logic)

---

### 27. State Management

**Issues:**
- No centralized state management
- Props drilling in some components
- Inconsistent state update patterns
- No state persistence strategy

**Recommendations:**
- Consider Zustand or Jotai for global state
- Implement state persistence layer
- Standardize state update patterns
- Add state debugging tools

---

### 28. Error Handling

**Issues:**
- Inconsistent error handling across components
- Limited error recovery options
- No error boundary implementation
- Missing error logging

**Recommendations:**
- Implement error boundaries
- Standardize error handling patterns
- Add error logging service
- Improve error messages for users

---

### 29. Testing Coverage

**Status:** Limited tests  
**Location:** `src/**/__tests__/`

**Current State:**
- Some unit tests for utilities
- No component tests
- No integration tests
- No E2E tests

**Missing Tests:**
- Component unit tests
- Hook tests
- Integration tests for workflows
- E2E tests for critical paths
- Visual regression tests

---

### 30. Performance Optimization

**Issues:**
- Entity rendering performance with 100+ entities
- Canvas re-renders on every state change
- Large bundle size
- No code splitting
- No lazy loading

**Recommendations:**
- Implement entity virtualization
- Optimize React Flow rendering
- Add code splitting
- Lazy load heavy components
- Implement bundle analysis

---

## Implementation Priority Matrix

### High Priority (Next Sprint)
1. Entity Movement Controls
2. Node Configuration UI
3. Workflow Execution Controls
4. Keyboard Shortcuts
5. Error Handling Improvements

### Medium Priority (Next Quarter)
6. Entity Filtering and Search
7. Journey Replay
8. Node Library and Palette
9. Workflow Validation UI
10. Performance Monitoring

### Low Priority (Future)
11. Canvas Templates
12. Workflow Marketplace
13. Advanced Analytics
14. Collaboration Comments
15. Mobile Responsiveness

---

## Related Documentation

- [Frontend Components](../frontend/canvas-components.md) - Current component documentation
- [Entity Visualization](../frontend/entity-visualization.md) - Entity system documentation
- [Backend Gaps](./backend-gaps.md) - Backend implementation gaps
- [Testing Gaps](./testing-gaps.md) - Testing coverage gaps

---

## Contributing

When implementing features from this gap analysis:

1. **Update this document** - Mark features as implemented
2. **Add documentation** - Document new features in appropriate files
3. **Write tests** - Include unit and integration tests
4. **Update related docs** - Update architecture and API docs
5. **Add examples** - Include usage examples in guides

---

## Notes

- This document is a living document and should be updated as features are implemented
- Priority levels may change based on user feedback and business needs
- Some features may be split into smaller tasks for incremental implementation
- Technical debt items should be addressed alongside feature development
