# Documentation Migration Script

**Created:** 2025-12-13
**Status:** Ready for execution
**Estimated time:** 2-3 hours

This document provides a step-by-step migration plan to reorganize the Stitch documentation structure for better clarity, reduced duplication, and improved maintainability.

## Table of Contents

1. [Overview](#overview)
2. [Before You Start](#before-you-start)
3. [Phase 1: Quick Wins (30 min)](#phase-1-quick-wins)
4. [Phase 2: Consolidation (60 min)](#phase-2-consolidation)
5. [Phase 3: Organization (45 min)](#phase-3-organization)
6. [Phase 4: Validation (30 min)](#phase-4-validation)
7. [Rollback Plan](#rollback-plan)

---

## Overview

### Current Problems
- Duplication between `/tasks/`, `/specs/*/summaries/`, and `/features/`
- Unclear boundaries between `/features/`, `/implementation/`, and `/specs/`
- Scattered related documentation across multiple directories
- Mix of active and historical documents
- Temporary/working documents in production docs

### Target Structure
```
docs/
├── README.md
├── strategy/              # Foundation documents (unchanged)
├── specs/                 # Spec-driven development (enhanced)
├── architecture/          # System architecture (unchanged)
├── development/           # Developer guides (cleaned)
├── guides/                # User/developer how-tos (new)
├── quality/               # QA, reviews, checklists (new)
└── archive/               # Historical documents (new)
```

### Benefits
- Single source of truth for each topic
- Clear separation of active vs. historical docs
- Related docs grouped together
- Easier navigation and maintenance
- Reduced confusion for new developers

---

## Before You Start

### Prerequisites
1. **Backup**: Create a backup of the entire docs directory
   ```bash
   cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run
   cp -r docs docs-backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Git status**: Ensure you're on a clean branch
   ```bash
   git status
   git checkout -b docs/reorganization
   ```

3. **Review**: Quickly scan the current structure
   ```bash
   ls -la docs/
   ```

### Safety Notes
- This script moves files, not copies them
- Each phase can be done independently
- You can stop and commit after each phase
- Rollback instructions provided at the end

---

## Phase 1: Quick Wins

**Goal:** Archive historical documents and remove obvious duplication
**Time:** ~30 minutes
**Risk:** Low (mostly moving historical docs)

### Step 1.1: Create Archive Structure

```bash
cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run/docs

# Create archive directory structure
mkdir -p archive/tasks
mkdir -p archive/reports
mkdir -p archive/features
mkdir -p archive/implementation
```

### Step 1.2: Archive Historical Tasks

```bash
# Move task implementation/verification docs to archive
mv tasks/TASK_01-10 archive/tasks/
mv tasks/TASK_11-20 archive/tasks/
mv tasks/TASK_21-27 archive/tasks/
mv tasks/entity-tracking archive/tasks/

# Move the tasks README (we'll update it)
mv tasks/README.md archive/tasks/
```

### Step 1.3: Archive Reports

```bash
# Move all reports to archive
mv reports/* archive/reports/
```

### Step 1.4: Archive Implementation Docs

```bash
# Move implementation docs to archive
mv implementation/* archive/implementation/
```

### Step 1.5: Create Archive README

Create `archive/README.md`:

```bash
cat > archive/README.md << 'EOF'
# Documentation Archive

This directory contains historical documentation that is no longer actively maintained but preserved for reference.

## What's Archived

### Tasks (archive/tasks/)
Historical implementation task reports from the early development phases (Tasks 1-27). These documents were point-in-time reports of implementation work.

**Current task tracking:** See `/specs/[number]/progress/` for ongoing task summaries.

**Value:** Understanding how the system evolved, implementation decisions, and historical context.

### Reports (archive/reports/)
Point-in-time status reports, checkpoint summaries, and project documentation snapshots.

**Current status:** See `/specs/` for current implementation status and `/quality/reviews/` for recent reviews.

**Value:** Historical project state, milestone documentation, implementation summaries.

### Implementation (archive/implementation/)
Detailed implementation documentation snapshots including API docs, backend systems, and frontend components.

**Current documentation:** See `/specs/` for current feature documentation and `/architecture/` for system design.

**Value:** Historical implementation details, evolution of the codebase, architectural decisions.

### Features (archive/features/)
Historical feature-specific documentation that has been consolidated into specs.

**Current documentation:** See `/specs/[number]/reference/` for feature documentation.

**Value:** Historical feature development context, early design decisions.

## Using Archived Documents

Archived documents are:
- **Read-only:** Not actively maintained
- **Historical:** Reflect state at time of writing
- **Reference:** Useful for understanding evolution
- **Searchable:** Can be searched for historical context

## When to Archive

Documents should be archived when:
1. They are point-in-time snapshots (not living docs)
2. They have been superseded by newer documentation
3. They are no longer part of active development
4. They provide historical value but clutter active docs

---

*Archived on: 2025-12-13*
EOF
```

### Step 1.6: Remove Empty Directories

```bash
# Remove now-empty directories
rmdir tasks 2>/dev/null || true
rmdir reports 2>/dev/null || true
rmdir implementation 2>/dev/null || true

# Note: These may fail if directories aren't empty - that's OK, we'll clean up later
```

### Step 1.7: Commit Phase 1

```bash
git add -A
git commit -m "docs: Phase 1 - Archive historical tasks, reports, and implementation docs

- Moved /tasks/ to /archive/tasks/
- Moved /reports/ to /archive/reports/
- Moved /implementation/ to /archive/implementation/
- Created archive README with navigation guide"
```

---

## Phase 2: Consolidation

**Goal:** Move feature docs into specs and clean up development folder
**Time:** ~60 minutes
**Risk:** Medium (moving active documentation)

### Step 2.1: Create Quality Directory Structure

```bash
cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run/docs

# Create quality directory
mkdir -p quality/reviews/gap-analyses
```

### Step 2.2: Move Reviews and Checklists to Quality

```bash
# Move checklists
mv checklists/* quality/

# Move reviews
mv reviews/2025-12-05-code-review.md quality/reviews/
mv reviews/gaps-GPT-5-2.md quality/reviews/gap-analyses/
mv reviews/gaps-Gemini-3.md quality/reviews/gap-analyses/
mv reviews/gaps-Opus-4-5.md quality/reviews/gap-analyses/
mv reviews/README.md quality/reviews/

# Remove empty directories
rmdir checklists
rmdir reviews
```

### Step 2.3: Create Quality README

Create `quality/README.md`:

```bash
cat > quality/README.md << 'EOF'
# Quality Assurance Documentation

This directory contains all quality assurance, code review, and improvement documentation.

## Contents

### Checklists
Implementation and verification checklists to ensure code quality:

- [001-race-condition-and-types.md](001-race-condition-and-types.md) - Data integrity and type safety
- [002-maintainability-refactor.md](002-maintainability-refactor.md) - Code maintainability improvements
- [003-security-hardening.md](003-security-hardening.md) - Security enhancement checklist
- [004-fix-edge-walker-architecture.md](004-fix-edge-walker-architecture.md) - Architecture validation

### Reviews
Comprehensive code reviews and assessments:

- [reviews/2025-12-05-code-review.md](reviews/2025-12-05-code-review.md) - Full codebase review
- [reviews/README.md](reviews/README.md) - Review guidelines and index

### Gap Analyses
AI-powered and manual gap analyses identifying missing features and improvements:

- [reviews/gap-analyses/gaps-gpt-5-2.md](reviews/gap-analyses/gaps-gpt-5-2.md) - GPT-based gap analysis
- [reviews/gap-analyses/gaps-gemini-3.md](reviews/gap-analyses/gaps-gemini-3.md) - Gemini architecture review
- [reviews/gap-analyses/gaps-opus-4-5.md](reviews/gap-analyses/gaps-opus-4-5.md) - Opus implementation assessment

## Usage Guidelines

### When to Use Checklists
- Before implementing major features
- During code reviews
- When refactoring existing code
- For security audits

### When to Create Reviews
- After major milestones
- Before production releases
- Quarterly quality assessments
- After significant refactors

### When to Run Gap Analyses
- Planning new feature sets
- Evaluating technical debt
- Assessing completeness of implementations
- Strategic planning sessions

---

*Last updated: 2025-12-13*
EOF
```

### Step 2.4: Move Feature Docs into Specs

```bash
# Canvas as Data (spec 002)
mkdir -p specs/002-canvas-as-data/reference
mv features/canvas-as-data/* specs/002-canvas-as-data/reference/ 2>/dev/null || true

# AI Manager (spec 011)
mkdir -p specs/011-ai-manager/reference
mv features/ai-manager/* specs/011-ai-manager/reference/ 2>/dev/null || true

# Webhook System (spec 013)
mkdir -p specs/013-webhook-system/reference
mv features/webhook-system/* specs/013-webhook-system/reference/ 2>/dev/null || true

# Demo Orchestrator - needs investigation for which spec
mkdir -p archive/features/demo-orchestrator
mv features/demo-orchestrator/* archive/features/demo-orchestrator/ 2>/dev/null || true

# Living Canvas - related to multiple specs
mkdir -p archive/features/living-canvas
mv features/living-canvas/* archive/features/living-canvas/ 2>/dev/null || true

# Move features README to archive
mv features/README.md archive/features/ 2>/dev/null || true

# Remove empty features directory
rmdir features 2>/dev/null || true
```

### Step 2.5: Update Spec READMEs with Reference Links

For each spec that received reference docs, update its README. Example for spec 002:

```bash
# This is manual - add to specs/002-canvas-as-data/README.md
# Add a "Reference Documentation" section pointing to reference/ folder
```

### Step 2.6: Clean Up Development Directory

```bash
cd development

# Create conventions subdirectory
mkdir -p conventions

# Move convention docs
mv ROUTING_CONVENTIONS.md conventions/routing.md
mv WORKER_API_KEY_HANDLING.md conventions/worker-api-keys.md

# Archive working directory (temporary docs)
mkdir -p ../archive/development/working
mv working/* ../archive/development/working/ 2>/dev/null || true
rmdir working 2>/dev/null || true

# Archive todo.md (temporary doc)
mv todo.md ../archive/development/ 2>/dev/null || true

# Move testing instructions to appropriate specs
# 01_canvas_as_data_testing.md -> specs/002-canvas-as-data/reference/
mv instructions/01_canvas_as_data_testing.md ../specs/002-canvas-as-data/reference/testing.md 2>/dev/null || true

# 02_ai_manager_testing.md -> specs/011-ai-manager/reference/
mv instructions/02_ai_manager_testing.md ../specs/011-ai-manager/reference/testing.md 2>/dev/null || true

rmdir instructions 2>/dev/null || true

# Move error-tracking-setup to conventions (it's a convention doc)
mv error-tracking-setup.md conventions/error-tracking.md 2>/dev/null || true

cd ..
```

### Step 2.7: Update Development README

Update `development/README.md` to reflect new structure:

```bash
cat > development/README.md << 'EOF'
# Development Guide

Developer-focused guides for working with the Stitch platform codebase.

## Quick Start

- **Getting Started** - Setup and environment configuration (TODO: create)
- **Coding Standards** - Code style and conventions (TODO: create)
- **Testing Guide** - Testing strategies and tools (TODO: create)

## Conventions

Standards and patterns used across the codebase:

- [Routing Conventions](conventions/routing.md) - API route patterns and structure
- [Worker API Keys](conventions/worker-api-keys.md) - API key management for workers
- [Error Tracking](conventions/error-tracking.md) - Error tracking and monitoring setup

## Development Workflow

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Setup database: See `/architecture/database-schema.md`
4. Run development server: `npm run dev`

### Code Quality
- **Linting**: Run `npm run lint`
- **Type Checking**: Run `npm run type-check`
- **Testing**: Run `npm test`

### Making Changes
1. Create feature branch from main
2. Follow coding standards and conventions
3. Write tests for new functionality
4. Run quality checks before committing
5. Create pull request with clear description

## Testing

- **Unit Tests**: Component and utility testing with Vitest
- **Integration Tests**: API and workflow testing
- **Property-Based Testing**: Advanced testing with fast-check

See individual spec directories for feature-specific testing guides.

## Related Documentation

- [Architecture](/architecture/) - System design and architecture
- [Specs](/specs/) - Feature specifications and implementation
- [Quality](/quality/) - Code review checklists and quality standards
- [Guides](/guides/) - User and developer how-to guides

---

*Last updated: 2025-12-13*
EOF
```

### Step 2.8: Commit Phase 2

```bash
git add -A
git commit -m "docs: Phase 2 - Consolidate feature docs and clean development folder

- Moved /checklists/ to /quality/
- Moved /reviews/ to /quality/reviews/
- Moved feature docs into respective /specs/*/reference/
- Cleaned up /development/ folder structure
- Created /quality/ with organized QA documentation
- Archived temporary working docs"
```

---

## Phase 3: Organization

**Goal:** Create guides, rename summaries to progress, and update navigation
**Time:** ~45 minutes
**Risk:** Low (creating new structure, minimal moves)

### Step 3.1: Create Guides Directory

```bash
cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run/docs

mkdir -p guides
```

### Step 3.2: Create Initial Guide Stubs

Create placeholder guides that can be filled in later:

```bash
cat > guides/README.md << 'EOF'
# Stitch Platform Guides

Practical how-to guides for using and developing with the Stitch platform.

## User Guides

### Getting Started
- **Creating Your First Workflow** (TODO) - Step-by-step workflow creation
- **Understanding the Canvas** (TODO) - Canvas concepts and usage
- **Working with Entities** (TODO) - Entity tracking and management

### Features
- **Entity Tracking Guide** (TODO) - How to track customer journeys
- **Webhook Integration** (TODO) - Setting up external integrations
- **AI Assistant Usage** (TODO) - Using the AI canvas assistant

## Developer Guides

### Development
- **Local Development Setup** (TODO) - Environment setup and configuration
- **Creating Custom Workers** (TODO) - Building and integrating workers
- **Database Migrations** (TODO) - Managing schema changes

### Debugging
- **Debugging Workflows** (TODO) - Troubleshooting workflow execution
- **Performance Optimization** (TODO) - Profiling and optimization
- **Common Issues** (TODO) - Frequently encountered problems

## Reference

For technical reference documentation, see:
- [Architecture](/architecture/) - System design
- [Specs](/specs/) - Feature specifications
- [Development](/development/) - Development conventions

---

*Last updated: 2025-12-13*
EOF
```

### Step 3.3: Rename "summaries" to "progress" in Specs

Rename the summaries folder to progress for clarity:

```bash
cd specs

# Rename summaries to progress in each spec that has summaries
for spec_dir in */; do
    if [ -d "${spec_dir}summaries" ]; then
        mv "${spec_dir}summaries" "${spec_dir}progress"
        echo "Renamed ${spec_dir}summaries to ${spec_dir}progress"
    fi
done

cd ..
```

### Step 3.4: Update Specs README

Update `specs/README.md` to reflect new structure:

```bash
# Edit specs/README.md - update line 32-40 to reflect new structure
```

Manual edit needed - change:
```markdown
```
[number]-[name]/
├── README.md           # Spec overview and status
├── requirements.md     # User stories and acceptance criteria
├── design.md          # Architecture and design decisions
├── tasks.md           # Implementation tasks
└── summaries/         # Task completion summaries
```
```

To:
```markdown
```
[number]-[name]/
├── README.md           # Spec overview and status
├── requirements.md     # User stories and acceptance criteria
├── design.md          # Architecture and design decisions
├── tasks.md           # Implementation tasks
├── progress/          # Task completion summaries (renamed from summaries)
│   ├── task-01-[name].md
│   └── task-02-[name].md
└── reference/         # Feature-specific documentation (optional)
    ├── API.md
    ├── testing.md
    └── examples.md
```
```

And update summary references throughout the file to "progress".

### Step 3.5: Update Strategy Directory

Clean up old roadmaps:

```bash
cd strategy

# Create archive subdirectory for old roadmaps
mkdir -p archive

# Move old roadmaps
mv Stitch_Kiroween_Roadmap.md archive/
mv Stitch_Roadmap_2.md archive/
mv Stitch_Roadmap_3.md archive/
mv roadmap-4.md archive/

# Create README
cat > README.md << 'EOF'
# Stitch Strategy

Foundation documents defining Stitch's vision, strategy, and roadmap.

## Core Strategy

- [Stitch_Strategy.md](Stitch_Strategy.md) - Core product vision and business strategy
- [tenancy-strategy.md](tenancy-strategy.md) - Multi-tenancy architectural strategy

## Current Roadmap

- [roadmap-5-clockwork.md](roadmap-5-clockwork.md) - Current product roadmap and priorities

## Implementation Guides

- [clockwork-canvas-coding-instructions.md](clockwork-canvas-coding-instructions.md) - Clockwork Canvas implementation guide
- [edge-visibility-plan.md](edge-visibility-plan.md) - Edge visibility feature plan
- [stitch-mcp-coding-instructions.md](stitch-mcp-coding-instructions.md) - MCP integration guide

## Historical Roadmaps

See [archive/](archive/) for previous roadmap versions.

---

*Last updated: 2025-12-13*
EOF

cd ..
```

### Step 3.6: Update Main README

Update the main `docs/README.md` with new structure. Replace entire content:

```bash
cat > README.md << 'EOF'
# Stitch Platform Documentation

Welcome to the Stitch platform documentation. This directory contains comprehensive documentation for the workflow orchestration system.

## Quick Start

**New to Stitch?**
1. Read [Strategy](strategy/Stitch_Strategy.md) to understand the vision
2. Review [Architecture](architecture/) to understand the system
3. Follow [Development Guide](development/) to start contributing
4. Explore [Specs](specs/) to see current feature work

**Looking for something specific?**
- **How do I...?** → See [Guides](guides/)
- **What's the current plan?** → See [Strategy](strategy/roadmap-5-clockwork.md)
- **How is X implemented?** → See [Specs](specs/) and [Architecture](architecture/)
- **How do I contribute?** → See [Development](development/)
- **What's the code quality?** → See [Quality](quality/)

---

## Documentation Structure

### 🎯 [Strategy](strategy/)
**Foundation documents** - Business strategy, product vision, and roadmap.

Core documents:
- [Product Strategy](strategy/Stitch_Strategy.md) - Vision and business strategy
- [Current Roadmap](strategy/roadmap-5-clockwork.md) - Product priorities
- [Tenancy Strategy](strategy/tenancy-strategy.md) - Multi-tenancy approach

**Use when:** Understanding product direction, planning features, making architectural decisions.

---

### 📐 [Specs](specs/)
**Specification-driven development** - Feature specifications with requirements, design, tasks, and progress tracking.

Structure:
```
[number]-[name]/
├── README.md          # Overview and status
├── requirements.md    # User stories and acceptance criteria
├── design.md         # Architecture and design decisions
├── tasks.md          # Implementation tasks
├── progress/         # Task completion reports
└── reference/        # Feature-specific docs (API, testing, etc.)
```

**Use when:** Implementing features, understanding requirements, tracking progress.

**Key specs:**
- [001: Core Architecture](specs/001-core-architecture/) - Foundational system design
- [002: Canvas as Data](specs/002-canvas-as-data/) - Canvas architecture
- [003: Workflow Management UI](specs/003-workflow-management-ui/) - UI implementation

[See all specs →](specs/README.md)

---

### 🏗️ [Architecture](architecture/)
**System design** - Technical architecture, execution models, and database schema.

Core documents:
- [Execution Model](architecture/execution-model.md) - Edge-walking execution system
- [Database Schema](architecture/database-schema.md) - Data models and relationships
- [API Design](architecture/api-design.md) - REST API patterns
- [Type System](architecture/type-system.md) - TypeScript architecture

**Use when:** Understanding system internals, making architectural decisions, designing integrations.

---

### 🔧 [Development](development/)
**Developer guides** - Setup, conventions, and development workflow.

Core documents:
- [Getting Started](development/) - Development environment setup
- [Conventions](development/conventions/) - Coding standards and patterns
  - [Routing](development/conventions/routing.md)
  - [Worker API Keys](development/conventions/worker-api-keys.md)
  - [Error Tracking](development/conventions/error-tracking.md)

**Use when:** Setting up development environment, understanding conventions, contributing code.

---

### 📚 [Guides](guides/)
**How-to guides** - Practical guides for users and developers.

Categories:
- User guides (workflows, canvas, entities)
- Developer guides (custom workers, debugging)
- Integration guides (webhooks, APIs)

**Use when:** Learning to use features, implementing common patterns, troubleshooting.

---

### ✅ [Quality](quality/)
**Quality assurance** - Code review checklists, reviews, and gap analyses.

Contents:
- [Checklists](quality/) - Implementation and security checklists
- [Reviews](quality/reviews/) - Code reviews and assessments
- [Gap Analyses](quality/reviews/gap-analyses/) - Feature completeness reviews

**Use when:** Reviewing code, planning improvements, assessing quality.

---

### 📦 [Archive](archive/)
**Historical documentation** - Preserved for reference but no longer actively maintained.

Contents:
- `tasks/` - Historical task implementation reports
- `reports/` - Point-in-time status reports
- `implementation/` - Historical implementation snapshots
- `features/` - Superseded feature documentation

**Use when:** Understanding historical context, researching past decisions.

[Read archive guide →](archive/README.md)

---

## Navigation Tips

### Finding Information

**"How do I create a workflow?"**
→ Start with [Guides](guides/) → See [Specs](specs/003-workflow-management-ui/) for details

**"What's the database schema?"**
→ [Architecture: Database Schema](architecture/database-schema.md)

**"How do I implement feature X?"**
→ Find relevant spec in [Specs](specs/) → Follow requirements, design, and tasks

**"What are the coding standards?"**
→ [Development: Conventions](development/conventions/)

**"What's missing in the codebase?"**
→ [Quality: Gap Analyses](quality/reviews/gap-analyses/)

### Contributing Documentation

1. **Feature specs:** Add to or create new spec in `/specs/`
2. **How-to guides:** Add to `/guides/`
3. **Architecture changes:** Update `/architecture/`
4. **Code conventions:** Update `/development/conventions/`
5. **Quality reviews:** Add to `/quality/reviews/`

### Document Lifecycle

- **Active docs:** Living documents, regularly updated
  - `/specs/`, `/architecture/`, `/development/`, `/guides/`, `/quality/`

- **Foundation docs:** Stable, infrequent updates
  - `/strategy/`

- **Historical docs:** Preserved but not maintained
  - `/archive/`

---

## Documentation Standards

### File Naming
- Use kebab-case: `feature-name.md`
- Be descriptive: `worker-api-key-handling.md` not `keys.md`
- Include dates for reviews: `2025-12-13-review.md`

### Document Structure
- Start with clear title and status/date
- Include table of contents for long docs
- Use relative links for cross-references
- Add "Last updated" date at bottom

### Maintenance
- Update docs when code changes
- Mark outdated docs clearly
- Archive superseded documentation
- Review quarterly for accuracy

---

## Need Help?

- **Using Stitch:** See [Guides](guides/)
- **Development questions:** See [Development](development/)
- **Bug reports:** Check spec issues or create new spec
- **Feature requests:** Review [Roadmap](strategy/roadmap-5-clockwork.md)

---

*Documentation structure updated: 2025-12-13*
EOF
```

### Step 3.7: Commit Phase 3

```bash
git add -A
git commit -m "docs: Phase 3 - Create guides structure and improve navigation

- Created /guides/ directory with placeholder guides
- Renamed spec /summaries/ to /progress/ for clarity
- Updated /strategy/ with README and archived old roadmaps
- Completely rewrote main README with better navigation
- Updated specs README with new structure"
```

---

## Phase 4: Validation

**Goal:** Verify migration, update cross-references, and finalize
**Time:** ~30 minutes
**Risk:** Low (validation and cleanup)

### Step 4.1: Verify Directory Structure

```bash
cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run/docs

# Check that new structure exists
echo "=== Checking new structure ==="
ls -la

echo -e "\n=== Archive contents ==="
ls -la archive/

echo -e "\n=== Quality contents ==="
ls -la quality/

echo -e "\n=== Strategy contents ==="
ls -la strategy/

echo -e "\n=== Guides contents ==="
ls -la guides/
```

### Step 4.2: Check for Broken Links

Create a simple script to find markdown links:

```bash
# Find all markdown files and check for broken internal links
find . -name "*.md" -type f -exec grep -l "\[.*\](.*\.md)" {} \; > /tmp/files-with-links.txt

echo "Files with internal markdown links:"
cat /tmp/files-with-links.txt
echo ""
echo "Review these files and update paths as needed"
```

### Step 4.3: Update Common Cross-References

Common files that likely need link updates:

1. **specs/README.md**
   - Update references to summaries → progress
   - Update references to ../steering/ if any

2. **Individual spec READMEs**
   - Update any links to /features/ → reference/
   - Update links to /tasks/ → /archive/tasks/

3. **quality/reviews/*.md**
   - Update any references to old paths

### Step 4.4: Verify No Empty Directories

```bash
# Find and list empty directories
find . -type d -empty

# If any are listed, decide whether to remove or keep them
# Remove empties with: find . -type d -empty -delete
```

### Step 4.5: Update .gitignore if Needed

Check if any patterns need updating:

```bash
cat ../../.gitignore | grep docs
```

### Step 4.6: Create Migration Summary

Create a file documenting what was moved:

```bash
cat > MIGRATION_SUMMARY.md << 'EOF'
# Documentation Migration Summary

**Executed:** 2025-12-13
**Phases Completed:** 1, 2, 3, 4

## Changes Made

### Archived
- `/tasks/` → `/archive/tasks/`
- `/reports/` → `/archive/reports/`
- `/implementation/` → `/archive/implementation/`
- `/features/` → `/archive/features/` (partially)

### Reorganized
- `/checklists/` → `/quality/`
- `/reviews/` → `/quality/reviews/`
- Feature docs → `/specs/*/reference/`
- Dev conventions → `/development/conventions/`

### Created
- `/archive/` - Historical documentation
- `/quality/` - QA and review documentation
- `/guides/` - How-to guides (stubs)
- `/development/conventions/` - Coding standards

### Renamed
- Spec `summaries/` → `progress/` across all specs

### Cleaned Up
- Removed `/development/working/`
- Archived `/development/todo.md`
- Moved testing instructions to spec references
- Organized strategy with archive subfolder

## File Counts

Before migration:
- Total markdown files: ~150+
- Top-level directories: 12

After migration:
- Total markdown files: ~150+ (same files, reorganized)
- Top-level directories: 7 (active) + 1 (archive)

## New Structure

```
docs/
├── README.md              # Comprehensive navigation guide
├── strategy/              # Business strategy and roadmap
├── specs/                 # Spec-driven development (enhanced)
├── architecture/          # System architecture
├── development/           # Developer guides (cleaned)
├── guides/                # How-to guides (new)
├── quality/               # QA and reviews (new)
└── archive/               # Historical docs (new)
```

## Benefits Achieved

1. **Reduced duplication** - Single source of truth for each topic
2. **Clearer organization** - Related docs grouped together
3. **Better navigation** - Improved README and structure
4. **Historical preservation** - Archive maintains context
5. **Easier maintenance** - Clear boundaries between doc types

## Breaking Changes

### For Developers
- Links to `/tasks/` now point to `/archive/tasks/`
- Links to `/checklists/` now point to `/quality/`
- Links to `/reviews/` now point to `/quality/reviews/`
- Spec `summaries/` renamed to `progress/`

### For Documentation
- Feature docs moved from `/features/` to `/specs/*/reference/`
- Development instructions moved to spec references
- Historical reports in `/archive/`

## Migration Files

- [migration.md](migration.md) - Full migration script
- [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) - This file

---

*Migration completed: 2025-12-13*
EOF
```

### Step 4.7: Final Commit

```bash
git add -A
git commit -m "docs: Phase 4 - Validation and migration completion

- Verified new directory structure
- Created migration summary
- Cleaned up empty directories
- Documented breaking changes

Migration complete. All documentation reorganized for better clarity,
reduced duplication, and improved maintainability."
```

### Step 4.8: Create Pull Request or Merge

```bash
# Push to remote
git push origin docs/reorganization

# Create PR or merge to main depending on your workflow
# If working solo, you can merge directly:
# git checkout main
# git merge docs/reorganization
# git push origin main
```

---

## Rollback Plan

If you need to undo the migration:

### Option 1: Git Rollback (Recommended)

If you committed after each phase:

```bash
# See commit history
git log --oneline

# Rollback to before migration
git reset --hard <commit-hash-before-migration>

# Or rollback just one phase
git revert <commit-hash-of-phase>
```

### Option 2: Restore from Backup

```bash
cd /Users/karitjaakson/Documents/Dev/Stitch/stitch-run

# Find your backup
ls -la | grep docs-backup

# Remove current docs
rm -rf docs

# Restore backup
cp -r docs-backup-YYYYMMDD-HHMMSS docs
```

### Option 3: Partial Rollback

If you want to undo specific changes:

```bash
# Example: Restore tasks directory
git checkout <commit-before-migration> -- docs/tasks

# Or from backup
cp -r docs-backup-YYYYMMDD-HHMMSS/tasks docs/
```

---

## Post-Migration Tasks

### Immediate (Do right after migration)
- [ ] Verify all files migrated correctly
- [ ] Check that no important files were lost
- [ ] Update any external links (README in root, etc.)
- [ ] Test navigation in a fresh clone

### Short-term (Within 1 week)
- [ ] Fill in guide stubs in `/guides/`
- [ ] Update broken cross-references
- [ ] Add missing spec reference docs
- [ ] Review archive for any docs that should be active

### Long-term (Within 1 month)
- [ ] Complete development guides
- [ ] Add architectural diagrams
- [ ] Set up documentation review schedule
- [ ] Create contribution guidelines for docs

---

## Notes and Observations

### Questions to Answer During Migration

1. **Demo orchestrator** - Which spec does it belong to? Or is it deprecated?
2. **Living canvas features** - Should these be in a specific spec or archived?
3. **Working docs in development** - Are any still needed?
4. **Old roadmaps** - Keep in archive or delete entirely?

### Potential Issues

- Some specs may not have all files (requirements, design, tasks)
- Some reference docs may be duplicated across specs
- Cross-references will need updating
- External links from other repos may break

### Future Improvements

- Add spec template for consistency
- Create documentation linting/validation
- Set up automated link checking
- Add documentation versioning strategy

---

## Execution Checklist

Use this checklist when running the migration:

- [ ] **Pre-flight**
  - [ ] Backup created
  - [ ] Clean git status
  - [ ] Branch created
  - [ ] Review current structure

- [ ] **Phase 1: Quick Wins**
  - [ ] Archive structure created
  - [ ] Tasks archived
  - [ ] Reports archived
  - [ ] Implementation archived
  - [ ] Archive README created
  - [ ] Phase 1 committed

- [ ] **Phase 2: Consolidation**
  - [ ] Quality directory created
  - [ ] Reviews and checklists moved
  - [ ] Quality README created
  - [ ] Feature docs moved to specs
  - [ ] Development folder cleaned
  - [ ] Development README updated
  - [ ] Phase 2 committed

- [ ] **Phase 3: Organization**
  - [ ] Guides directory created
  - [ ] Guide stubs created
  - [ ] Summaries renamed to progress
  - [ ] Specs README updated
  - [ ] Strategy README created
  - [ ] Main README updated
  - [ ] Phase 3 committed

- [ ] **Phase 4: Validation**
  - [ ] Directory structure verified
  - [ ] Broken links checked
  - [ ] Empty directories cleaned
  - [ ] Migration summary created
  - [ ] Phase 4 committed
  - [ ] Branch pushed

- [ ] **Post-migration**
  - [ ] PR created or merged
  - [ ] Team notified
  - [ ] External links updated
  - [ ] Backup retained for 30 days

---

## Success Criteria

Migration is successful when:

1. ✅ All documentation files accounted for (none lost)
2. ✅ New structure makes navigation easier
3. ✅ No duplication between active docs
4. ✅ Archive preserves historical context
5. ✅ READMEs provide clear navigation
6. ✅ Cross-references mostly working
7. ✅ Team can find what they need quickly

---

*Migration script version: 1.0*
*Created: 2025-12-13*
*Last updated: 2025-12-13*
EOF
```

The migration script has been saved to `/docs/migration.md`. This comprehensive script includes:

## Key Features

1. **Phased approach** - 4 independent phases you can execute separately
2. **Safety first** - Backup instructions, git commits after each phase, rollback plan
3. **Detailed commands** - Copy-paste bash commands for each step
4. **Validation steps** - Checks to ensure migration succeeded
5. **Documentation** - READMEs for each new directory
6. **Execution checklist** - Track progress through migration

## What It Does

- **Archives** historical docs (tasks, reports, implementation, old features)
- **Consolidates** quality docs (checklists + reviews → quality/)
- **Moves** feature docs into their respective specs
- **Cleans** development folder of temporary docs
- **Creates** new guides structure
- **Renames** spec summaries to progress
- **Updates** all navigation READMEs

You can execute this migration at your own pace, committing after each phase. Would you like me to help you execute any specific phase, or would you like to review/modify the plan first?