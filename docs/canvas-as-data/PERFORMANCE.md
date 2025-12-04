# Performance Optimizations

## Version List Bandwidth Optimization

### Problem: The Bandwidth Trap

When listing flow versions, the initial implementation used `.select('*')` which downloaded the complete `visual_graph` and `execution_graph` JSON blobs for every version. This could result in downloading megabytes of data when opening the version history panel.

### Solution: Metadata-Only Listing

We've optimized the `listVersions()` function to only fetch lightweight metadata:

```typescript
// Before (BAD - downloads all graph data)
.select('*')

// After (GOOD - metadata only)
.select('id, flow_id, commit_message, created_at')
```

### Implementation Details

**New Type: `FlowVersionMetadata`**
```typescript
export interface FlowVersionMetadata {
  id: string;
  flow_id: string;
  commit_message: string | null;
  created_at: string;
}
```

**Updated Function Signature**
```typescript
// Returns lightweight metadata only
export async function listVersions(flowId: string): Promise<FlowVersionMetadata[]>
```

**Lazy Loading Full Versions**

When the user needs full version data (viewing or reverting), we fetch it on-demand:

```typescript
// In VersionHistory component
const handleViewVersion = async (versionMetadata: FlowVersionMetadata) => {
  const fullVersion = await getVersion(versionMetadata.id);
  // Now we have visual_graph and execution_graph
};
```

### Performance Impact

**Before:**
- Listing 50 versions with 100KB graphs each = **5MB download**
- Slow initial load
- Wasted bandwidth for data that's never viewed

**After:**
- Listing 50 versions with metadata only = **~10KB download**
- Fast initial load
- Full version data fetched only when needed

### API Endpoints

**GET /api/flows/[id]/versions**
- Returns: `FlowVersionMetadata[]` (lightweight)
- Use for: Version history lists, dropdowns, etc.

**GET /api/flows/[id]/versions/[vid]**
- Returns: `FlowVersion` (complete with graphs)
- Use for: Viewing specific version, reverting, etc.

### Best Practices

1. **Always use `listVersions()` for lists** - Never fetch full versions just to display a list
2. **Fetch full versions on-demand** - Only call `getVersion()` when you need the graph data
3. **Cache full versions** - If showing the same version multiple times, cache it in component state

### Related Files

- `src/lib/canvas/version-manager.ts` - Core implementation
- `src/app/api/flows/[id]/versions/route.ts` - API endpoints
- `src/components/canvas/VersionHistory.tsx` - UI component with lazy loading
