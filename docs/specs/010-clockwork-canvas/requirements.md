# Requirements Document

## Introduction

The Clockwork Canvas transforms the Business Model Canvas from a static diagram into a living, breathing demonstration of a complete business system. This feature creates an awe-inspiring demo where entities (represented as Halloween monsters) flow through the canvas in real-time, triggered by external events via webhooks. The canvas visualizes the entire customer journey from lead acquisition through conversion, support, and revenue generation, while simultaneously showing the "invisible gears" of production systems (CRM, analytics, integrations) that power the business.

## Glossary

- **BMC (Business Model Canvas)**: A 12-section strategic management template showing key business components (Marketing, Sales, Products, Support, Revenue, Costs, etc.)
- **Entity**: An individual customer or lead (e.g., "Frankenstein", "Dracula") that travels through the canvas
- **Journey Edge**: A solid, colored, animated edge that entities physically travel along
- **System Edge**: A dashed, gray/cyan edge representing background processes that fire without entity movement
- **Webhook Processor**: The backend service that receives external events and updates entity positions
- **Demo Orchestrator**: A scripted sequence of webhook calls that simulates real-world events for demonstration purposes
- **Section**: One of the 12 top-level areas of the BMC (e.g., Marketing, Sales, Products)
- **Item Node**: A visual element within a section representing a specific touchpoint or system (e.g., "LinkedIn Ads", "CRM", "Stripe")
- **Drill-Down Workflow**: A child canvas that shows the detailed logic behind an item node
- **Production Side**: The sections representing internal systems (Data, People, Integrations, Code)
- **Customer Side**: The sections representing customer-facing touchpoints (Marketing, Sales, Products, Support)
- **Financial Sections**: Revenue and Costs sections that update dynamically based on entity actions

## Requirements

### Requirement 1: Halloween-Themed Entity System

**User Story:** As a demo viewer, I want to see entities represented as famous monsters with unique avatars and journey stories, so that the demo is memorable and engaging.

#### Acceptance Criteria

1. WHEN the system is seeded THEN the System SHALL create 13 entities with Halloween monster themes (Frankenstein, Dracula, Witch, Werewolf, Mummy, Ghost, Zombie, Vampire, Skeleton, Banshee, Goblin, Phantom, Kraken)
2. WHEN an entity is displayed THEN the System SHALL show a DiceBear avatar matching the monster type
3. WHEN an entity is created THEN the System SHALL assign an entity type of "lead", "customer", or "churned" based on their journey stage
4. WHEN an entity is positioned THEN the System SHALL place them at the appropriate node based on their journey story (e.g., Frankenstein at "Active Subscribers", Werewolf at "LinkedIn Ads")
5. WHEN entities are traveling THEN the System SHALL position Ghost and Goblin on edges rather than nodes to demonstrate in-transit state

### Requirement 2: Complete BMC Section Structure

**User Story:** As a business stakeholder, I want to see all 12 sections of the Business Model Canvas populated with meaningful items, so that I understand the complete business system.

#### Acceptance Criteria

1. WHEN the BMC is seeded THEN the System SHALL create Customer Journey sections (Marketing, Sales, Offers, Products, Support, Recommendations, Paying Customers) with drillable item nodes
2. WHEN the BMC is seeded THEN the System SHALL create Production sections (Data, People, Integrations, Code) with system item nodes
3. WHEN the BMC is seeded THEN the System SHALL create Financial sections (Revenue, Costs) with dynamic value nodes
4. WHEN a section is displayed THEN the System SHALL show all item nodes within that section with appropriate positioning
5. WHEN an item node has a drill-down workflow THEN the System SHALL display a visual cue indicating it is clickable

### Requirement 3: Journey Edge System

**User Story:** As a demo viewer, I want to see entities physically travel along solid colored edges, so that I can visualize the customer journey flow.

#### Acceptance Criteria

1. WHEN entities move between nodes THEN the System SHALL animate them along journey edges
2. WHEN a journey edge is displayed THEN the System SHALL render it as a solid, colored line
3. WHEN an entity completes movement THEN the System SHALL update the entity's current_node_id in the database
4. WHEN multiple entities travel THEN the System SHALL handle parallel animations without collision
5. WHEN an entity arrives at a node THEN the System SHALL create a journey_event record with type "node_arrival"

### Requirement 4: System Edge Architecture

**User Story:** As a technical stakeholder, I want to see how production systems connect to customer touchpoints via dashed system edges, so that I understand the invisible automation that powers the business.

#### Acceptance Criteria

1. WHEN a customer node completes an action THEN the System SHALL fire all connected system edges in parallel
2. WHEN a system edge is displayed THEN the System SHALL render it as a dashed, gray or cyan line
3. WHEN a system edge fires THEN the System SHALL show a brief pulse animation on the edge
4. WHEN a system edge fires THEN the System SHALL NOT move entities along that edge
5. WHEN a system edge fires THEN the System SHALL trigger the associated production workflow (e.g., CRM sync, Slack notification)

### Requirement 5: Webhook API Layer

**User Story:** As an integration developer, I want to send webhook events to the system that automatically move entities and trigger workflows, so that the canvas reflects real-world business events.

#### Acceptance Criteria

1. WHEN a webhook is received at `/api/webhooks/[source]` THEN the System SHALL determine the target node based on the webhook source
2. WHEN a webhook contains an email THEN the System SHALL find or create an entity with that email
3. WHEN a webhook moves an entity THEN the System SHALL update the entity's current_node_id in the database
4. WHEN a webhook is processed THEN the System SHALL create a journey_event record
5. WHEN a webhook is processed THEN the System SHALL trigger all connected system edges
6. WHEN a subscription webhook is received THEN the System SHALL update financial metrics (MRR, costs)
7. WHEN a webhook processing completes THEN the System SHALL return a success response with the entity_id

### Requirement 6: Demo Orchestrator

**User Story:** As a demo presenter, I want to click a "Play" button that automatically simulates a sequence of business events, so that I can show the living canvas in action without manual webhook calls.

#### Acceptance Criteria

1. WHEN the Play button is clicked THEN the System SHALL execute a scripted sequence of webhook calls with timed delays
2. WHEN the demo is running THEN the System SHALL display a "Demo running..." status indicator
3. WHEN the Reset button is clicked THEN the System SHALL restore all entities to their initial positions
4. WHEN demo events fire THEN the System SHALL use the same webhook endpoints as production
5. WHEN the demo completes THEN the System SHALL allow the presenter to replay or reset

### Requirement 7: Drill-Down Workflows

**User Story:** As a business analyst, I want to click on item nodes to see the detailed workflow logic behind them, so that I understand how each touchpoint operates.

#### Acceptance Criteria

1. WHEN a drillable item node is clicked THEN the System SHALL navigate to the child workflow canvas
2. WHEN a workflow canvas is displayed THEN the System SHALL show the sequence of worker nodes that execute
3. WHEN a workflow is created THEN the System SHALL link it to its parent BMC item node via parent_id
4. WHEN a workflow executes THEN the System SHALL follow the same edge-walking execution model as the main canvas
5. WHEN a workflow completes THEN the System SHALL trigger the next step in the parent BMC journey

### Requirement 8: Production System Workflows

**User Story:** As a technical stakeholder, I want to see mini-workflows for production systems (CRM, Analytics, Slack, Stripe), so that I understand what happens behind the scenes when system edges fire.

#### Acceptance Criteria

1. WHEN a CRM system edge fires THEN the System SHALL execute a workflow with steps: Validate → Transform → API Call
2. WHEN an Analytics system edge fires THEN the System SHALL execute a workflow that increments the appropriate metric
3. WHEN a Slack system edge fires THEN the System SHALL execute a workflow with steps: Format → Post to Channel
4. WHEN a Stripe system edge fires THEN the System SHALL execute a workflow that creates or updates a subscription
5. WHEN a production workflow completes THEN the System SHALL NOT move any entities

### Requirement 9: Dynamic Financial Metrics

**User Story:** As a business owner, I want to see Revenue and Costs sections update in real-time as entities move and workers execute, so that I understand the financial impact of business operations.

#### Acceptance Criteria

1. WHEN an entity subscribes to a plan THEN the System SHALL increment the MRR value in the Revenue section
2. WHEN a worker is invoked THEN the System SHALL increment the appropriate cost value in the Costs section
3. WHEN a financial node is displayed THEN the System SHALL show the current value (e.g., "MRR: $12,450")
4. WHEN a subscription is created THEN the System SHALL add both the revenue (plan amount) and cost (Stripe fee)
5. WHEN the demo is reset THEN the System SHALL restore financial values to their initial state

### Requirement 10: Real-Time Synchronization

**User Story:** As a demo viewer, I want to see entity movements and system updates appear instantly on the canvas without page refresh, so that the demo feels alive and responsive.

#### Acceptance Criteria

1. WHEN an entity position changes in the database THEN the System SHALL push the update to all connected clients via Supabase Realtime
2. WHEN a journey_event is created THEN the System SHALL trigger UI animations on all connected clients
3. WHEN a system edge fires THEN the System SHALL show the pulse animation on all connected clients
4. WHEN financial metrics update THEN the System SHALL refresh the displayed values on all connected clients
5. WHEN multiple clients view the same canvas THEN the System SHALL synchronize all entity positions and animations

### Requirement 11: Webhook Source Mapping

**User Story:** As an integration developer, I want a clear mapping between webhook sources and target nodes, so that I know which endpoint to call for each business event.

#### Acceptance Criteria

1. WHEN a "linkedin-lead" webhook is received THEN the System SHALL create or move the entity to "item-linkedin-ads"
2. WHEN a "calendly-demo" webhook is received THEN the System SHALL move the entity to "item-demo-call"
3. WHEN a "stripe-trial" webhook is received THEN the System SHALL move the entity to "item-free-trial"
4. WHEN a "stripe-subscription" webhook is received THEN the System SHALL move the entity to the appropriate plan node (Basic, Pro, or Enterprise)
5. WHEN a "zendesk-ticket" webhook is received THEN the System SHALL move the entity to "item-help-desk"
6. WHEN a "stripe-churn" webhook is received THEN the System SHALL change the entity type to "churned" and move to "item-help-desk"
7. WHEN a "referral" webhook is received THEN the System SHALL move the referrer entity to "item-referral-program"

### Requirement 12: Parallel Execution Model

**User Story:** As a system architect, I want customer journey edges and system edges to fire in parallel when a node completes, so that the canvas accurately represents concurrent business processes.

#### Acceptance Criteria

1. WHEN a customer node completes THEN the System SHALL fire the journey edge (entity moves) and all system edges (background processes) simultaneously
2. WHEN parallel execution occurs THEN the System SHALL NOT block entity movement waiting for system edge completion
3. WHEN system edges execute THEN the System SHALL handle failures independently without affecting entity movement
4. WHEN multiple system edges fire THEN the System SHALL execute them concurrently
5. WHEN all edges complete THEN the System SHALL log the execution results

### Requirement 13: Seed Data Management

**User Story:** As a developer, I want a single script that seeds the complete Clockwork Canvas demo, so that I can quickly set up or reset the demonstration environment.

#### Acceptance Criteria

1. WHEN the seed script runs THEN the System SHALL create the BMC canvas with all 12 sections
2. WHEN the seed script runs THEN the System SHALL create all item nodes within each section
3. WHEN the seed script runs THEN the System SHALL create all journey edges and system edges
4. WHEN the seed script runs THEN the System SHALL create all drill-down workflows and link them to parent nodes
5. WHEN the seed script runs THEN the System SHALL create all 13 Halloween-themed entities at their initial positions
6. WHEN the seed script runs THEN the System SHALL set initial financial metric values
7. WHEN the seed script runs THEN the System SHALL be idempotent (safe to run multiple times)

### Requirement 14: Demo Control Interface

**User Story:** As a demo presenter, I want visible Play and Reset buttons on the canvas, so that I can control the demo flow without leaving the UI.

#### Acceptance Criteria

1. WHEN the canvas loads THEN the System SHALL display a Demo Control Panel with Play and Reset buttons
2. WHEN the Play button is clicked THEN the System SHALL disable the button and show "Demo running..." status
3. WHEN the Reset button is clicked THEN the System SHALL call the reset API endpoint
4. WHEN the demo completes THEN the System SHALL re-enable the Play button
5. WHEN the control panel is displayed THEN the System SHALL position it in a fixed location that doesn't obscure the canvas

### Requirement 15: Worker Mock Fallbacks

**User Story:** As a demo presenter, I want the system to work without requiring API keys for external services, so that I can demonstrate the canvas anywhere without configuration.

#### Acceptance Criteria

1. WHEN a worker is invoked without required API keys THEN the System SHALL use mock data instead of failing
2. WHEN the Claude worker runs in mock mode THEN the System SHALL return hardcoded scene data
3. WHEN the ElevenLabs worker runs in mock mode THEN the System SHALL return a sample audio URL
4. WHEN the MiniMax worker runs in mock mode THEN the System SHALL return a sample video URL
5. WHEN any worker runs in mock mode THEN the System SHALL simulate realistic timing delays
