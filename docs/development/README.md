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