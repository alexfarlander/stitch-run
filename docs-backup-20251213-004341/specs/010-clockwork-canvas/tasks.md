# Implementation Plan

- [x] 1. Update BMC seed data with complete item nodes and edges
  - Update `src/lib/seeds/default-bmc.ts` to include all Marketing, Sales, Offers, Products, Support, Recommendations, Paying Customers, Data, People, Integrations, and Code item nodes
  - Add journey edges connecting customer journey nodes
  - Add system edges connecting customer nodes to production nodes with `type: 'system'` and `data.systemAction` properties
  - Add financial nodes (MRR, costs) with initial values
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 2. Create Halloween entity seed data
  - Create `src/lib/seeds/clockwork-entities.ts` with 13 monster-themed entities (Frankenstein, Dracula, Witch, Werewolf, Mummy, Ghost, Zombie, Vampire, Skeleton, Banshee, Goblin, Phantom, Kraken)
  - Each entity should have name, email, monster_type, entity_type, current_node_id, and journey_story
  - Generate DiceBear avatar URLs with monster seed
  - Position Ghost and Goblin on edges (current_edge_id) instead of nodes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Create master seed script
  - Create `scripts/seed-clockwork.ts` that seeds BMC canvas and entities
  - Implement idempotency check (don't create duplicates if already exists)
  - Add CLI entry point with `tsx scripts/seed-clockwork.ts`
  - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6, 13.7_

- [x] 4. Create SystemEdge component
  - Create `src/components/canvas/edges/SystemEdge.tsx` with dashed stroke styling
  - Add Supabase Realtime subscription for 'edge_fired' events
  - Implement pulse animation on edge fire (1 second duration)
  - Use gray/cyan color (#64748b)
  - _Requirements: 4.2, 4.3_

- [x] 5. Register SystemEdge in canvas components
  - Update `src/components/canvas/BMCCanvas.tsx` to include SystemEdge in edgeTypes map
  - Update `src/components/canvas/WorkflowCanvas.tsx` to include SystemEdge in edgeTypes map
  - _Requirements: 4.2_

- [x] 6. Create webhook node mapper
  - Create `src/lib/webhooks/node-map.ts` with WEBHOOK_NODE_MAP constant
  - Map all webhook sources to target node IDs (linkedin-lead, youtube-signup, seo-form, calendly-demo, stripe-trial, stripe-subscription-*, zendesk-ticket, stripe-churn, referral)
  - Export helper function `mapWebhookSourceToNode(source: string): string`
  - _Requirements: 5.1, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 7. Create system edge trigger logic
  - Create `src/lib/engine/system-edge-trigger.ts` with `triggerSystemEdges(nodeId, entityId)` function
  - Find all system edges connected to the node
  - Execute system edges in parallel using Promise.all
  - Broadcast 'edge_fired' event via Supabase Realtime for each edge
  - Execute systemAction based on edge.data.systemAction (crm_sync, analytics_update, slack_notify, stripe_sync)
  - _Requirements: 4.1, 4.3, 4.5, 5.5_

- [x] 8. Create dynamic webhook route handler
  - Create `src/app/api/webhooks/[source]/route.ts` with POST handler
  - Extract source from params
  - Map source to target node using WEBHOOK_NODE_MAP
  - Find or create entity by email
  - Update entity's current_node_id to target node
  - Create journey_event with type 'node_arrival'
  - Call triggerSystemEdges for the target node
  - Update financial metrics if subscription webhook
  - Return success response with entity_id
  - Test the webhook endpoint with a sample POST request to verify it works
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 9. Create financial update logic
  - Create `src/lib/metrics/financial-updates.ts` with `updateFinancials(payload)` function
  - Increment MRR node value for subscription webhooks
  - Add Stripe fee to costs for subscriptions (2.9% + $0.30)
  - Increment worker cost nodes when workers are invoked
  - Save updated graph back to database
  - _Requirements: 5.6, 9.1, 9.2, 9.4_

- [x] 10. Create demo script definition
  - Create `src/lib/demo/demo-script.ts` with CLOCKWORK_DEMO_SCRIPT array
  - Define 5-7 demo events with delays, endpoints, payloads, and descriptions
  - Events should showcase: new lead, demo booking, trial start, subscription, support ticket
  - _Requirements: 6.1_

- [x] 11. Create demo orchestrator API endpoints
  - Create `src/app/api/demo/start/route.ts` with POST handler that executes demo script
  - Use setTimeout to schedule webhook calls with delays
  - Return success response with event count and duration
  - Create `src/app/api/demo/reset/route.ts` with POST handler
  - Reset all entities to initial positions from CLOCKWORK_ENTITIES
  - Call resetFinancialMetrics to restore initial values
  - Test both endpoints with sample requests to verify they work
  - _Requirements: 6.1, 6.3, 6.4, 9.5_

- [x] 12. Create Demo Control Panel component
  - Create `src/components/canvas/DemoControlPanel.tsx` with Play and Reset buttons
  - Add state management for isRunning
  - Call `/api/demo/start` on Play click
  - Call `/api/demo/reset` on Reset click
  - Show "Demo running..." status when active
  - Disable Play button while demo is running
  - Position panel fixed at bottom-left of canvas
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 14.1, 14.2, 14.3, 14.4_

- [x] 13. Integrate Demo Control Panel into BMC Canvas
  - Update `src/components/canvas/BMCCanvas.tsx` to render DemoControlPanel
  - Ensure panel doesn't obscure canvas content
  - _Requirements: 14.1, 14.5_

- [x] 14. Checkpoint - Verify webhook and demo flow
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Create drill-down workflow: Lead Capture
  - Create `src/lib/seeds/workflows/lead-capture.ts`
  - Define workflow with nodes: Validate Lead → Score Lead → CRM Sync → Assign SDR
  - Link to parent item node 'item-linkedin-ads' via parent_id
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. Create drill-down workflow: Demo Scheduling
  - Create `src/lib/seeds/workflows/demo-scheduling.ts`
  - Define workflow with nodes: Send Email → Wait for Booking → Pre-Demo Prep
  - Link to parent item node 'item-demo-call' via parent_id
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 17. Create drill-down workflow: Trial Activation
  - Create `src/lib/seeds/workflows/trial-activation.ts`
  - Define workflow with nodes: Provision Account → Send Onboarding → Wait for Upgrade
  - Link to parent item node 'item-free-trial' via parent_id
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 18. Create drill-down workflow: Support Handler
  - Create `src/lib/seeds/workflows/support-handler.ts`
  - Define workflow with nodes: Analyze Ticket → AI Suggest → Escalate if Needed
  - Link to parent item node 'item-help-desk' via parent_id
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 19. Create production system workflows
  - Create `src/lib/seeds/workflows/crm-sync.ts` with Validate → Transform → API Call nodes
  - Create `src/lib/seeds/workflows/analytics-update.ts` with Increment Metric node
  - Create `src/lib/seeds/workflows/slack-notify.ts` with Format → Post to Channel nodes
  - Create `src/lib/seeds/workflows/stripe-sync.ts` with Create/Update Subscription nodes
  - Link each to corresponding production item nodes
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 20. Update master seed script to include workflows
  - Update `scripts/seed-clockwork.ts` to seed all drill-down workflows
  - Ensure workflows are linked to parent item nodes
  - _Requirements: 13.4_

- [x] 21. Add visual drill-down cue to item nodes
  - Update section-item node component to show drill-down indicator when parent_id exists
  - Add icon or badge to indicate clickable nodes
  - _Requirements: 2.5_

- [x] 22. Implement drill-down navigation
  - Update item node click handler to navigate to child workflow when parent_id exists
  - Use existing canvas navigation system
  - _Requirements: 7.1_

- [x] 23. Add financial value display to nodes
  - Update financial node rendering to display data.value as formatted currency
  - Format as "$X,XXX" for USD values
  - Update in real-time when value changes
  - _Requirements: 9.3_

- [x] 24. Implement parallel edge execution
  - Update edge-walker to fire journey edges and system edges simultaneously
  - Use Promise.allSettled to handle failures independently
  - Ensure entity movement is not blocked by system edge execution
  - Log all edge execution results
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 25. Add database index for entity email lookups
  - Create migration to add index on stitch_entities(canvas_id, email)
  - _Requirements: 5.2_

- [ ] 26. Final Checkpoint - Verify complete system integration
  - Run the seed script to populate the canvas
  - Test the demo orchestrator by clicking Play button
  - Verify entities move through the canvas
  - Verify system edges pulse when fired
  - Verify financial metrics update correctly
  - Test drill-down navigation by clicking item nodes
  - Ensure all tests pass, ask the user if questions arise.
