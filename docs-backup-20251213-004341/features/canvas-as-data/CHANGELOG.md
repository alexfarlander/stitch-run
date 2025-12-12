# Canvas as Data - Changelog

## Recent Stability Patches

### 1. Bandwidth Optimization (API Change)

**Change:** Modified `GET /api/flows/[id]/versions` to return metadata only, not full graphs.

**Reason:** Listing versions with full graph blobs was causing bandwidth issues, especially for flows with many versions.

**Impact:**
- List endpoint now returns: `{ id, flow_id, commit_message, created_at }`
- Full version data (including graphs) must be fetched via `GET /api/flows/[id]/versions/[vid]`

**Documentation Updated:**
- API.md - Updated response example for list versions endpoint
- VERSION_MANAGEMENT.md - Added note about metadata-only response
- INDEX.md - Clarified endpoint behavior

**Migration:**
```typescript
// Before
const { versions } = await fetch(`/api/flows/${flowId}/versions`).then(r => r.json());
const graph = versions[0].visual_graph; // ❌ No longer available

// After
const { versions } = await fetch(`/api/flows/${flowId}/versions`).then(r => r.json());
const fullVersion = await fetch(`/api/flows/${flowId}/versions/${versions[0].id}`).then(r => r.json());
const graph = fullVersion.visual_graph; // ✅ Correct
```

### 2. Strict Input Mapping Validation

**Change:** Enforced strict input mapping. Required inputs must have explicit edge mappings or default values.

**Reason:** Implicit data passing was causing runtime crashes when upstream nodes didn't provide expected data. Better to catch this at validation time.

**Impact:**
- Merely connecting an edge is no longer sufficient for required inputs
- Each required input must be satisfied by:
  - `edge.data.mapping[inputName]` (explicit mapping), OR
  - `inputDef.default` (default value)

**Documentation Updated:**
- API.md - Added note about strict validation in validation errors section
- ARCHITECTURE.md - Updated OEG Compiler validation process description
- VERSION_MANAGEMENT.md - Updated validation checks section
- INDEX.md - Added note about strict validation

**Example:**
```typescript
// ❌ INVALID - Edge exists but no explicit mapping
{
  nodes: [
    { id: 'A', type: 'worker', data: { outputs: { text: { type: 'string' } } } },
    { id: 'B', type: 'worker', data: { inputs: { prompt: { type: 'string', required: true } } } }
  ],
  edges: [
    { id: 'e1', source: 'A', target: 'B' } // No mapping!
  ]
}

// ✅ VALID - Explicit mapping provided
{
  nodes: [
    { id: 'A', type: 'worker', data: { outputs: { text: { type: 'string' } } } },
    { id: 'B', type: 'worker', data: { inputs: { prompt: { type: 'string', required: true } } } }
  ],
  edges: [
    { 
      id: 'e1', 
      source: 'A', 
      target: 'B',
      data: {
        mapping: {
          prompt: 'output.text' // Explicit mapping
        }
      }
    }
  ]
}

// ✅ VALID - Default value provided
{
  nodes: [
    { id: 'A', type: 'worker', data: { outputs: { text: { type: 'string' } } } },
    { 
      id: 'B', 
      type: 'worker', 
      data: { 
        inputs: { 
          prompt: { 
            type: 'string', 
            required: true,
            default: 'Default prompt' // Default value
          } 
        } 
      } 
    }
  ],
  edges: [
    { id: 'e1', source: 'A', target: 'B' } // No mapping needed - has default
  ]
}
```

### 3. Cycle-Safe Auto-Layout

**Change:** Switched auto-layout algorithm from simple BFS to Kahn's Algorithm with Longest Path Layering.

**Reason:** Previous algorithm could hang on cyclic graphs. Kahn's Algorithm is robust against cycles.

**Impact:**
- Auto-layout now terminates safely even if graph contains cycles
- Nodes in cycles won't be processed (in-degree never reaches 0)
- Algorithm completes in O(V+E) time instead of O(V²)

**Documentation Updated:**
- MERMAID.md - Updated layout algorithm description with cycle safety note
- INDEX.md - Added note about cycle-safe algorithm

**Technical Details:**
```typescript
// Algorithm:
// 1. Calculate in-degree for each node
// 2. Start with nodes having in-degree 0 at level 0
// 3. Process each node: update children's levels, decrement in-degrees
// 4. When child's in-degree reaches 0, add to queue
// 5. Child level = max(parent_levels) + 1

// Cycle Safety:
// - Nodes in cycles never reach in-degree 0
// - They won't be processed
// - Algorithm terminates naturally
// - No infinite loops
```

### 4. Protocol Standardization

**Change:** Standardized the Stitch Protocol structure across all worker integrations.

**Reason:** Ensure consistency between documentation and implementation.

**Impact:**
- All worker examples now match TypeScript schemas exactly
- Config object nesting is consistent
- Reduces copy-paste errors

**Documentation Updated:**
- EXAMPLES.md - Verified all worker config examples match schemas
- All examples use correct structure from `src/types/worker-definition.ts`

**Standard Structure:**
```typescript
{
  nodeConfigs: {
    [nodeId]: {
      workerType: string,
      config: {
        // Worker-specific configuration
        model?: string,
        endpoint?: string,
        [key: string]: any
      }
    }
  },
  edgeMappings: {
    [edgeKey]: {
      [targetInput]: string // JSONPath or simple key
    }
  }
}
```

## Summary

These patches improve:
1. **Performance** - Bandwidth optimization for version listing
2. **Safety** - Strict validation catches errors at save time, not runtime
3. **Stability** - Cycle-safe auto-layout prevents infinite loops
4. **Consistency** - Standardized protocol reduces integration errors

All documentation has been updated to reflect these changes. Developers should review the updated sections to ensure their code follows the new patterns.
