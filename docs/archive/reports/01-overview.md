# Stitch: Living Business Model Canvas - Implementation Overview

## Executive Summary

Stitch is a visual orchestration engine that transforms the traditional Business Model Canvas into a living, executable system. It enables businesses to visualize, execute, and monitor their operations in real-time by treating the canvas as an interactive workflow engine.

## Core Concept

**Stitch = Visual Workflow Engine + Business Model Canvas + Real-time Entity Tracking**

The system operates on three levels:
1. **Top Level**: 12-section Business Model Canvas (Marketing, Sales, Data, Revenue, etc.)
2. **Mid Level**: Each section contains visual items that link to detailed workflows
3. **Deep Level**: Workflows execute as graphs of nodes, with entities (customers/leads) traveling through them

## Key Innovation: The Fractal Canvas

Everything in Stitch is a canvas:
- The BMC is a canvas
- Sections contain items
- Items link to workflows (also canvases)
- Workflows can contain sub-workflows

This fractal structure enables drill-down navigation from high-level business strategy to detailed operational workflows.

## Architecture Principles

### 1. Database as Source of Truth
- **No in-memory state**: All execution state lives in Supabase (PostgreSQL)
- **Crash-resistant**: Server restarts don't lose execution state
- **Horizontally scalable**: Stateless Next.js serverless functions

### 2. Edge-Walking Execution Model
- **Event-driven**: Node completion → Update DB → Read edges → Fire downstream nodes
- **Recursive**: Execution flows by walking graph edges
- **Atomic**: Each state change is immediately persisted

### 3. Async Worker Pattern
- **All workers are async**: Fire webhook → Mark "running" → End process
- **Callback-driven**: Worker completes → POST callback → Resume execution
- **Decoupled**: Stitch orchestrates, workers execute

### 4. Entity-Centric Design
- **Track individuals**: Monitor "Monica" as she moves through your business
- **Real-time visualization**: See entities travel along edges between nodes
- **Journey analytics**: Complete history of every entity's path

### 5. Visual-First Philosophy
**"If it's not on the canvas, it doesn't exist."**
- No hidden business logic
- The canvas IS the application
- Visual representation drives execution

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Canvas**: @xyflow/react (React Flow)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + fast-check (property-based testing)

## Implementation Scope

The system has been implemented through 8 major feature specifications:

1. **Core Architecture**: Stateless execution engine with edge-walking
2. **BMC Database Update**: Hierarchical canvas types and entity tracking
3. **Entity Tracking System**: Real-time position tracking and journey history
4. **Webhook System**: External service integration via HTTP webhooks
5. **Worker Integrations**: Claude, MiniMax, ElevenLabs, Shotstack adapters
6. **Financial Metrics**: CAC, LTV, MRR calculations from entity data
7. **Media Library**: Centralized asset management for workflows
8. **Production Side Items**: Integration, People, Code, Data visualizations

## Key Metrics

- **8 major features** implemented with full spec-driven development
- **35+ correctness properties** defined and tested
- **100+ property-based tests** ensuring universal correctness
- **4 node types** supported (Worker, UX, Splitter, Collector)
- **5 webhook adapters** (Stripe, Typeform, Calendly, n8n, Generic)
- **12 BMC sections** with drill-down workflows

## Next Sections

This report is organized into the following sections:

1. **Overview** (this document) - High-level architecture and principles
2. **Core Architecture** - Execution engine, edge-walking, node types
3. **Database Schema** - Complete data model and relationships
4. **Entity Tracking** - Real-time position tracking and journey analytics
5. **Webhook System** - External integrations and event processing
6. **Worker Integrations** - AI and service adapters
7. **Financial Metrics** - Business intelligence and calculations
8. **Media Library** - Asset management and content workflows
9. **Testing Strategy** - Property-based testing and correctness guarantees
10. **API Reference** - Complete endpoint documentation

Each section provides detailed implementation information, code examples, and architectural decisions.
