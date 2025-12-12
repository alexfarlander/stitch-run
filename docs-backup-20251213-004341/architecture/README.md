# Architecture Documentation

This section contains documentation about the Stitch platform's system architecture, design decisions, and technical foundations.

## Core Architecture

### Execution Model
- **Edge-Walking Algorithm**: The core execution engine that processes workflows through graph traversal
- **Event-Driven Processing**: How nodes transition and trigger downstream execution
- **State Management**: How workflow state is maintained and updated atomically

### Database Design
- **Schema Overview**: Core tables and relationships
- **Indexing Strategy**: Performance optimization through proper indexing
- **Migration Patterns**: How database changes are managed

### API Architecture
- **RESTful Design**: API endpoint patterns and conventions
- **Authentication**: How API access is secured
- **Error Handling**: Consistent error response patterns

### Type System
- **TypeScript Architecture**: How types are organized and used
- **Runtime Validation**: Zod schemas and validation patterns
- **Type Safety**: Ensuring type correctness throughout the system

## Key Design Decisions

1. **Dual-Graph Architecture**: Separation between visual (UI) and execution (runtime) graph representations
2. **Database-as-Source-of-Truth**: All state changes go through the database for consistency
3. **Atomic Operations**: Using database functions for race-condition-free updates
4. **Subscription Pattern**: Efficient real-time updates through global subscription management

## Architecture Diagrams

See the [implementation/diagrams](../implementation/diagrams/) directory for detailed architecture diagrams including:
- System overview
- Database schema
- Execution flow
- Component relationships

## Related Documentation

- [Implementation Details](../implementation/) - How architecture is implemented
- [API Documentation](../implementation/api/) - API endpoint specifications
- [Database Layer](../implementation/backend/database-layer.md) - Data access patterns
