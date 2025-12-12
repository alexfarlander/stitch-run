# Next.js Routing Conventions

## Dynamic Route Parameter Naming

**CRITICAL**: Next.js requires that all dynamic route segments at the same level use the **same parameter name**.

### Current Conventions

#### API Routes (`/api/canvas/`)
- ✅ **USE**: `[id]` for all canvas API routes
- ❌ **DO NOT USE**: `[canvasId]`

**Example**:
```
src/app/api/canvas/[id]/route.ts
src/app/api/canvas/[id]/nodes/route.ts
src/app/api/canvas/[id]/run/route.ts
```

#### Page Routes (`/canvas/`)
- ✅ **USE**: `[id]` for canvas pages
- ❌ **DO NOT USE**: `[canvasId]`

**Example**:
```
src/app/canvas/[id]/page.tsx
src/app/canvas/[id]/webhooks/page.tsx
```

### Why This Matters

Next.js throws this error if you violate this rule:
```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'canvasId').
```

This causes **500 Internal Server Error** when accessing routes and prevents the application from working.

### How to Prevent This Error

1. **Before creating a new route**, check existing routes at the same level
2. **Always use `[id]`** for canvas-related routes (both API and pages)
3. **Update documentation** if you change parameter names
4. **Search the codebase** for conflicting parameter names before committing

### Quick Check Command

Run this to check for conflicts:
```bash
find src/app/api/canvas -type d -name "[*" | sort
find src/app/canvas -type d -name "[*" | sort
```

You should only see `[id]` directories, never `[canvasId]`.

## Last Updated

December 5, 2024 - Fixed conflict between `[id]` and `[canvasId]` routes
