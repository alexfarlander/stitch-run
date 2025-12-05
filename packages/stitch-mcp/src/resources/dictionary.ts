/**
 * Dictionary Resource
 * 
 * Exposes the Stitch terminology dictionary to AI assistants via MCP.
 * This helps AI understand Stitch concepts and provide accurate guidance.
 * 
 * Note: This dictionary is maintained in sync with the main app's dictionary
 * at src/lib/dictionary/index.ts. Updates should be made in both places.
 */

const STITCH_DICTIONARY = {
  concepts: {
    canvas: "A visual workspace in Stitch. The top-level canvas is the Business Model Canvas (BMC) with 12 sections. Sections contain Items that link to Workflow canvases. Everything in Stitch is a canvas - it's fractal.",
    
    node: "A visual element on a canvas representing an asset, worker, or integration point. Nodes have inputs, outputs, and configuration. They are connected by edges to form workflows.",
    
    edge: "A connection between nodes that defines the flow of data and execution. When a node completes, its edges determine which nodes fire next. Edges can be conditional or parallel.",
    
    entity: "A customer, lead, or user traveling through workflows. Entities move between sections on the BMC in real-time as they progress through the business journey. Example: 'Monica' moving from Marketing to Sales.",
    
    workflow: "A canvas containing nodes and edges that define an automated process. Workflows are linked to Items in BMC sections. They execute via edge-walking when triggered.",
    
    section: "One of the 12 standard areas of the Business Model Canvas (Marketing, Sales, Data, Revenue, Costs, etc.). Sections contain Items and track entities.",
    
    item: "A visual element inside a BMC section representing a tool, system, or process (e.g., 'CRM', 'Landing Page', 'API'). Items can link to Workflows.",
    
    run: "A single execution instance of a workflow. Each run has a unique ID and tracks the state of all nodes as they execute.",
    
    "stitch-protocol": "The immutable JSON contract for communication between Stitch and workers. Outbound includes runId, nodeId, config, input, and callbackUrl. Inbound includes status, output, and optional error.",
  },
  
  nodeTypes: {
    asset: "An external application integrated with Stitch (landing page, API, mobile app). Assets send webhooks and uptime pings to Stitch.",
    
    worker: "An automated task processor that performs work (send email, update CRM, process payment). Workers receive requests via webhook and callback when complete.",
    
    integration: "A third-party service connection (Stripe, Slack, Supabase). Integrations bridge Stitch with external platforms.",
    
    trigger: "A node that starts a workflow execution (webhook received, schedule fired, manual start).",
    
    splitter: "A node that takes an array input and fires multiple downstream paths in parallel (fan-out). Used for processing lists.",
    
    collector: "A node that waits for ALL upstream parallel paths to complete before firing (fan-in). Used to synchronize parallel execution.",
    
    transformer: "A node that modifies data flowing through the workflow (map, filter, aggregate).",
  },
  
  edgeTypes: {
    default: "Standard edge that fires when the source node completes successfully. Passes output data to the target node.",
    
    conditional: "Edge that only fires if a condition is met. Used for branching logic (if/else patterns).",
    
    system: "Special edge that triggers based on system events (entity movement, time-based, external webhook).",
    
    parallel: "Edge that fires as part of a parallel execution group. Multiple parallel edges fire simultaneously from a splitter.",
  },
  
  entityTypes: {
    lead: "A potential customer who has shown interest but hasn't converted. Typically enters via Marketing section.",
    
    customer: "A paying user who has completed a purchase. Moves through Sales, Delivery, and Support sections.",
    
    trial: "A user in a trial period. Tracked separately to monitor conversion rates.",
    
    churned: "A former customer who has cancelled or stopped using the service.",
  },
  
  executionModel: {
    "edge-walking": "The core execution pattern. When a node completes, Stitch reads its outbound edges and fires downstream nodes. Execution flows recursively by walking edges.",
    
    "async-worker": "All workers are asynchronous. Stitch fires a webhook, marks the node 'running', and ends the process. When the worker callbacks, Stitch marks it 'completed' and continues edge-walking.",
    
    "database-first": "Supabase is the single source of truth. No in-memory state. All state changes are persisted immediately. If the server restarts, flows resume from DB state.",
    
    "parallel-execution": "The M-shape pattern. Splitter nodes fan-out to multiple paths. Collector nodes fan-in by waiting for all upstream paths. Enables concurrent processing.",
  },
  
  integrationPatterns: {
    "webhook-callback": "Standard pattern for async workers. Stitch sends request with callbackUrl. Worker processes and POSTs result to callbackUrl.",
    
    "uptime-monitoring": "Assets periodically ping Stitch to report health status. Stitch tracks last_seen timestamp and displays uptime indicators.",
    
    "form-submission": "Landing pages capture user input and send to Stitch webhook. Creates entity and triggers workflow.",
    
    "event-notification": "External systems notify Stitch of events (payment received, email opened). Triggers conditional edges or entity movement.",
  },
  
  bestPractices: {
    "visual-first": "If it's not on the canvas, it doesn't exist. No hidden business logic. Users must see the flow of data.",
    
    "idempotent-nodes": "Nodes should be idempotent where possible. Running the same node twice with the same input should produce the same result.",
    
    "error-handling": "If a worker fails, mark the node as 'failed' in the DB. Don't crash the entire run. Allow users to retry specific nodes.",
    
    "callback-urls": "Always prepend process.env.NEXT_PUBLIC_BASE_URL when generating callback URLs. Never hardcode domains.",
    
    "state-persistence": "Read from database before operations. Write to database after state changes. Use Supabase real-time subscriptions for UI updates.",
  },
} as const;

export const dictionaryResource = {
  uri: 'stitch://dictionary/core',
  name: 'Stitch Core Dictionary',
  description: 'Core terminology and concepts for the Stitch platform',
  mimeType: 'application/json',
  
  async read() {
    return {
      contents: [
        {
          uri: 'stitch://dictionary/core',
          mimeType: 'application/json',
          text: JSON.stringify(STITCH_DICTIONARY, null, 2),
        },
      ],
    };
  },
};
