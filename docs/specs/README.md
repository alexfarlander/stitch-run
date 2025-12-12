# Stitch Specifications

This directory contains all feature specifications for the Stitch project.

## Active Specs

### [001: Core Architecture](001-core-architecture/README.md)
**Status**: Complete (Foundational)
**Started**: Early Development

The foundational architecture for the Stitch workflow orchestration system. Defines the edge-walking execution model, database schema, and core execution patterns.

### [002: Canvas as Data](002-canvas-as-data/README.md)
**Status**: Complete (Architectural)
**Started**: Early Development

Major architectural shift to treat canvases as versioned JSON data stored in the database, enabling AI management and programmatic control.

### [003: Workflow Management UI](003-workflow-management-ui/README.md)
**Status**: 45% Complete (In Progress)
**Started**: December 8, 2024

A comprehensive UI for creating, editing, and managing Stitch workflows. Enables users to visually build workflows, import entities, start runs, and monitor execution.

**Current Phase**: Rescue mode - fixing incomplete implementation and making features accessible to users.

## Spec Organization

Each spec follows this structure:

```
[number]-[name]/
├── README.md           # Spec overview and status
├── requirements.md     # User stories and acceptance criteria
├── design.md          # Architecture and design decisions
├── tasks.md           # Implementation tasks
└── summaries/         # Task completion summaries
    ├── task-01-[name].md
    ├── task-02-[name].md
    └── ...
```

## Naming Conventions

- **Spec directories**: `[number]-[name]` (e.g., `001-workflow-management-ui`)
- **Spec numbers**: 3 digits, zero-padded (e.g., `001`, `002`, `003`)
- **Task summaries**: `task-[number]-[name].md` (e.g., `task-01-api-infrastructure.md`)
- **Task numbers**: 2 digits, zero-padded (e.g., `01`, `02`, `03`)

## Creating a New Spec

1. **Determine the next spec number**:
   ```bash
   ls .kiro/specs/ | grep -E '^[0-9]{3}-' | sort | tail -1
   # If last is 001, next is 002
   ```

2. **Create the spec directory**:
   ```bash
   mkdir .kiro/specs/002-feature-name
   mkdir .kiro/specs/002-feature-name/summaries
   ```

3. **Create the standard files**:
   ```bash
   touch .kiro/specs/002-feature-name/README.md
   touch .kiro/specs/002-feature-name/requirements.md
   touch .kiro/specs/002-feature-name/design.md
   touch .kiro/specs/002-feature-name/tasks.md
   ```

4. **Follow the [Task Completion Standards](../steering/task-completion-standards.md)**

## Task Completion Standards

All tasks must follow the [Task Completion Standards](../steering/task-completion-standards.md).

### Key Principles

1. **A task is only done when users can use the feature**
2. **Integration is part of the task** - not a separate task
3. **Documentation comes after** - write docs after feature works
4. **Test from user perspective** - can users access and use it?

### Task Size

- Maximum: 4-8 hours of focused work
- If larger, break into subtasks
- One task = one integrated, working feature

### Task Summary Required

Every completed task must have a summary in `summaries/task-[number]-[name].md` documenting:
- What was implemented
- What was integrated
- How users can access it
- What works and what doesn't
- Testing performed
- Known issues

## Spec Status Definitions

- **✅ Complete (100%)**: All tasks done, feature in production
- **⚠️ Partial (X%)**: Some tasks done, feature partially working
- **❌ Not Working (X%)**: Code exists but feature not accessible/working
- **🚧 In Progress**: Actively being worked on
- **📋 Planned**: Requirements written, not started
- **💡 Proposed**: Idea stage, no requirements yet

## Guidelines

### When to Create a New Spec

Create a new spec when:
- Building a new major feature
- Implementing a new system/subsystem
- Making significant architectural changes
- Adding new user-facing capabilities

### When to Add to Existing Spec

Add to existing spec when:
- Fixing bugs in existing features
- Making minor enhancements
- Completing incomplete tasks
- Refactoring existing code

### Spec Lifecycle

1. **Proposed** - Idea documented, no formal requirements
2. **Planned** - Requirements written, design in progress
3. **In Progress** - Tasks being implemented
4. **Complete** - All tasks done, feature in production
5. **Archived** - Feature deprecated or replaced

## Best Practices

### Requirements (requirements.md)

- Use EARS format for acceptance criteria
- One user story per requirement
- Clear, testable criteria
- Link to design decisions

### Design (design.md)

- Document architecture decisions
- Include data models
- Define API contracts
- List correctness properties
- Explain trade-offs

### Tasks (tasks.md)

- Break into 4-8 hour chunks
- Include integration in each task
- Clear dependencies
- Testable outcomes
- Link to requirements

### Summaries (summaries/*.md)

- Write AFTER task is done
- Document what WAS done (not what should be done)
- Include integration points
- List what works and what doesn't
- Note known issues
- Provide testing notes

## Common Pitfalls

### ❌ Don't Do This

- Mark task complete when only README is written
- Create utilities without using them
- Build components without integrating them
- Write documentation instead of code
- Make tasks too large (>8 hours)
- Skip task summaries

### ✅ Do This

- Mark task complete when users can use the feature
- Integrate code as part of the task
- Test from user perspective
- Write documentation after feature works
- Break large tasks into smaller ones
- Write detailed task summaries

## Resources

- [Task Completion Standards](../steering/task-completion-standards.md) - Detailed guidelines
- [Stitch Principles](../steering/stitch-principles.md) - Architecture principles
- [Spec Template](TEMPLATE.md) - Template for new specs (TODO)

## Questions?

If you're unsure about:
- Whether to create a new spec or add to existing
- How to break down a large task
- What "done" means for your task
- How to write a task summary

Refer to the [Task Completion Standards](../steering/task-completion-standards.md) or ask for guidance.

## Changelog

- **2024-12-09**: Created specs organization structure
- **2024-12-09**: Migrated workflow-management-ui to 001-workflow-management-ui
- **2024-12-09**: Created task completion standards
