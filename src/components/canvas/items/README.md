# Production-Side Item Components

This directory contains specialized React components for displaying production-side items in the Business Model Canvas (BMC).

## Components

### IntegrationItem
Displays API integration status with health monitoring.

**Node Type**: `integration-item`

**Props**:
```typescript
{
  label: string;              // API name (e.g., "Claude API")
  apiKey: string;             // Environment variable name
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: string;          // ISO timestamp
  usagePercent?: number;      // 0-100, optional
}
```

### PersonItem
Displays team members and AI agents with status indicators.

**Node Type**: `person-item`

**Props**:
```typescript
{
  label: string;              // Person name
  role: string;               // "Founder", "AI Assistant", etc.
  avatarUrl?: string;         // Avatar image URL
  status: 'online' | 'offline' | 'busy';
  type: 'human' | 'ai';       // Determines badge icon
}
```

### CodeItem
Displays code deployments with status and timing information.

**Node Type**: `code-item`

**Props**:
```typescript
{
  label: string;              // Deployment name
  status: 'deployed' | 'building' | 'failed';
  lastDeploy: string;         // ISO timestamp
  repoUrl?: string;           // Optional GitHub/GitLab link
  deploymentUrl?: string;     // Optional live URL
}
```

### DataItem
Displays data sources with record counts and sync status.

**Node Type**: `data-item`

**Props**:
```typescript
{
  label: string;              // Data source name
  type: 'database' | 'spreadsheet' | 'chart';
  recordCount: number;        // Number of records
  lastSync: string;           // ISO timestamp
  status: 'operational' | 'error';
}
```

## Registration

These components are registered in `BMCCanvas.tsx` and can be used by setting the node `type` field in your graph structure:

```typescript
const nodes = [
  {
    id: 'integration-1',
    type: 'integration-item',
    position: { x: 100, y: 100 },
    data: {
      label: 'Claude API',
      apiKey: 'ANTHROPIC_API_KEY',
      status: 'connected',
      lastPing: '2024-12-03T12:00:00Z',
      usagePercent: 45
    }
  },
  {
    id: 'person-1',
    type: 'person-item',
    position: { x: 300, y: 100 },
    data: {
      label: 'Sarah Chen',
      role: 'Founder',
      status: 'online',
      type: 'human'
    }
  }
];
```

## Utilities

### `getStatusColor(status: string): string`
Maps status values to Tailwind CSS color classes for consistent status indicators across all components.

### `formatTimestamp(timestamp: string): string`
Formats ISO timestamps into relative time strings (e.g., "2 minutes ago").

### `formatNumber(num: number): string`
Formats numbers with comma separators for readability (e.g., "1,234").

## Testing

- Unit tests: `__tests__/IntegrationItem.test.tsx`, `__tests__/PersonItem.test.tsx`
- Property tests: `__tests__/utils.property.test.ts`
- Visual verification: See `VISUAL_VERIFICATION.md`
- Test page: `/test-production-items`

## Design

See the full design document at `.kiro/specs/production-side-items/design.md` for:
- Architecture details
- Color scheme specifications
- Status indicator mappings
- Error handling strategies
- Testing strategies
