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

**"How do I contribute?"**
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