# MCP Resources Implementation

## Overview

This document describes the implementation of MCP resources for the Stitch platform. Resources provide AI assistants with access to documentation, terminology, and integration guides.

## Implemented Resources

### 1. Dictionary Resource (`stitch://dictionary/core`)

**Purpose**: Exposes Stitch terminology and core concepts to AI assistants.

**Content Sections**:
- **Concepts**: Core Stitch concepts (canvas, node, edge, entity, workflow, etc.)
- **Node Types**: Different types of nodes (asset, worker, integration, trigger, splitter, collector, transformer)
- **Edge Types**: Types of connections (default, conditional, system, parallel)
- **Entity Types**: Types of entities (lead, customer, trial, churned)
- **Execution Model**: How Stitch executes workflows (edge-walking, async-worker, database-first, parallel-execution)
- **Integration Patterns**: Common integration patterns (webhook-callback, uptime-monitoring, form-submission, event-notification)
- **Best Practices**: Guidelines for working with Stitch (visual-first, idempotent-nodes, error-handling, callback-urls, state-persistence)

**Format**: JSON

**Location**: `packages/stitch-mcp/src/resources/dictionary.ts`

### 2. Overview Instructions (`stitch://instructions/overview`)

**Purpose**: Provides high-level integration guidance covering the Stitch protocol and architecture.

**Content Sections**:
- What is Stitch?
- The Stitch Protocol (outbound/inbound contracts)
- Integration Patterns (async worker, webhook callback, uptime monitoring, event notifications)
- Best Practices (visual-first, database as source of truth, error handling, callback URLs)
- Getting Started guide
- Node Types overview
- Execution Model (edge-walking, parallel execution)

**Format**: Markdown

**Location**: `packages/stitch-mcp/src/resources/instructions.ts`

### 3. Landing Page Instructions (`stitch://instructions/landing-page`)

**Purpose**: Specific guidance for integrating landing pages with Stitch.

**Content Sections**:
- Integration Steps (create node, get code, implement form submission, add analytics, implement uptime)
- Event Types (form_submission, page_view, button_click)
- Workflow Triggers
- Best Practices (validate input, handle errors, include metadata, test thoroughly)
- Common Patterns (multi-step forms, A/B testing, exit intent)
- Troubleshooting guide

**Format**: Markdown

**Location**: `packages/stitch-mcp/src/resources/instructions.ts`

## Architecture

### Resource Structure

Each resource implements the following interface:

```typescript
interface Resource {
  uri: string;              // Unique resource identifier (e.g., 'stitch://dictionary/core')
  name: string;             // Human-readable name
  description: string;      // Brief description
  mimeType: string;         // Content type ('application/json' or 'text/markdown')
  read(): Promise<{         // Method to retrieve content
    contents: Array<{
      uri: string;
      mimeType: string;
      text: string;
    }>;
  }>;
}
```

### Registration

Resources are registered in `packages/stitch-mcp/src/resources/index.ts`:

1. **List Handler**: Returns metadata for all available resources
2. **Read Handler**: Retrieves content for a specific resource by URI

The registration function is called from the main MCP server (`src/index.ts`) during startup.

## Files Created

1. **Main App Dictionary**:
   - `stitch-run/src/lib/dictionary/index.ts` - Source of truth for Stitch terminology

2. **MCP Resources**:
   - `stitch-run/packages/stitch-mcp/src/resources/dictionary.ts` - Dictionary resource
   - `stitch-run/packages/stitch-mcp/src/resources/instructions.ts` - Instruction resources
   - `stitch-run/packages/stitch-mcp/src/resources/index.ts` - Resource registration

3. **Tests**:
   - `stitch-run/packages/stitch-mcp/test-resources.js` - Basic resource tests
   - `stitch-run/packages/stitch-mcp/test-mcp-resources-integration.js` - Integration tests

## Usage

### From AI Assistant (Claude)

Once the MCP server is configured in Claude Desktop, AI assistants can access resources:

```
# List available resources
List resources

# Read the dictionary
Read stitch://dictionary/core

# Read integration overview
Read stitch://instructions/overview

# Read landing page guide
Read stitch://instructions/landing-page
```

### From MCP Client

```typescript
// List resources
const resources = await client.listResources();

// Read a specific resource
const content = await client.readResource('stitch://dictionary/core');
```

## Testing

Run the test suite:

```bash
cd packages/stitch-mcp
npm run build
node test-resources.js
node test-mcp-resources-integration.js
```

All tests should pass:
- ✓ Dictionary resource loads and contains valid JSON
- ✓ Overview instructions load and contain valid Markdown
- ✓ Landing page instructions load and contain valid Markdown
- ✓ Resources are properly registered with MCP server
- ✓ Resource handlers are accessible

## Maintenance

### Updating the Dictionary

The dictionary is duplicated in two locations:
1. `stitch-run/src/lib/dictionary/index.ts` (main app)
2. `stitch-run/packages/stitch-mcp/src/resources/dictionary.ts` (MCP package)

When updating terminology, update both files to keep them in sync.

### Adding New Resources

To add a new resource:

1. Create the resource in `packages/stitch-mcp/src/resources/`
2. Implement the resource interface with `uri`, `name`, `description`, `mimeType`, and `read()` method
3. Import and add to the `resources` array in `packages/stitch-mcp/src/resources/index.ts`
4. Rebuild the package: `npm run build`
5. Test the new resource

## Requirements Validated

This implementation satisfies the following requirements:

- **3.1**: Dictionary resource exposes Stitch terminology
- **3.2**: Overview instructions provide high-level integration guidance
- **3.3**: Landing page instructions provide specific integration guidance
- **3.5**: Instruction resources return markdown-formatted content

## Next Steps

The resources are now available for AI assistants to use when helping users integrate with Stitch. The next tasks in the implementation plan are:

- Task 9: Implement error handling
- Task 10: Build and configure MCP server
- Task 11: Manual testing with Kiro CLI
- Task 12: Final checkpoint
