/**
 * Instruction Resources
 * 
 * Provides integration guides and best practices for the Stitch platform.
 * These resources help AI assistants guide users through integration workflows.
 */

const OVERVIEW_INSTRUCTIONS = `# Stitch Integration Overview

## What is Stitch?

Stitch is a **Living Business Model Canvas** that orchestrates workflows and tracks customer journeys in real-time. It's a visual platform where:

- The **top level** is a 12-section Business Model Canvas (Marketing, Sales, Data, Revenue, etc.)
- **Sections** contain Items (tools, systems, processes)
- **Items** link to Workflows (the "guts" of your business)
- **Entities** (customers/leads) travel across the canvas as they progress

## The Stitch Protocol

Stitch communicates with external workers via an immutable JSON contract:

### Outbound (Stitch → Worker)

\`\`\`json
{
  "runId": "uuid",
  "nodeId": "string",
  "config": { ...staticNodeSettings },
  "input": { ...dataFromUpstream },
  "callbackUrl": "https://your-stitch-instance.com/api/stitch/callback/{runId}/{nodeId}"
}
\`\`\`

### Inbound (Worker → Stitch)

\`\`\`json
{
  "status": "completed" | "failed",
  "output": { ...resultData },
  "error": "optional error message"
}
\`\`\`

## Integration Patterns

### 1. Async Worker Pattern

All workers are treated as asynchronous:

1. **The Loop**: Stitch fires webhook → Marks node "running" → Ends process
2. **The Resume**: Worker completes → Callbacks to Stitch → Node marked "completed" → Edge-walking continues

### 2. Webhook Callback

Standard pattern for async workers:

1. Stitch sends request with \`callbackUrl\`
2. Worker processes the request
3. Worker POSTs result to \`callbackUrl\`
4. Stitch continues workflow execution

### 3. Uptime Monitoring

Assets periodically ping Stitch to report health:

- POST to \`/api/uptime/ping/[nodeId]\`
- Include optional status information
- Stitch tracks \`last_seen\` timestamp
- UI displays uptime indicators

### 4. Event Notifications

External systems notify Stitch of events:

- POST to \`/api/webhooks/node/[nodeId]\`
- Include event type and data
- Triggers workflow execution or entity movement

## Best Practices

### Visual-First Philosophy

**If it's not on the canvas, it doesn't exist.**

- No hidden business logic
- Users must see the flow of data
- The canvas is the application

### Database as Source of Truth

- Use Supabase as the single source of truth
- No in-memory state management
- All state changes persisted immediately
- Flows resume from DB state after restart

### Error Handling

- If a worker fails, mark the node as "failed"
- Don't crash the entire run
- Allow users to retry specific nodes
- Provide descriptive error messages

### Callback URLs

Always prepend \`process.env.NEXT_PUBLIC_BASE_URL\`:

\`\`\`typescript
const callbackUrl = \`\${process.env.NEXT_PUBLIC_BASE_URL}/api/callback/\${nodeId}\`;
\`\`\`

Never hardcode domains or assume localhost.

## Getting Started

1. **Create a Node**: Use \`stitch_create_node\` to add your asset to the canvas
2. **Get Integration Code**: Use \`stitch_get_stitching_code\` for framework-specific snippets
3. **Implement Callbacks**: Handle Stitch requests and callback with results
4. **Add Uptime Monitoring**: Periodically ping Stitch to report health
5. **Test Your Integration**: Trigger workflows and verify execution

## Node Types

- **Asset**: External application (landing page, API, mobile app)
- **Worker**: Automated task processor (send email, update CRM)
- **Integration**: Third-party service connection (Stripe, Slack)
- **Trigger**: Starts workflow execution (webhook, schedule, manual)
- **Splitter**: Fans out to multiple parallel paths
- **Collector**: Waits for all parallel paths to complete

## Execution Model

### Edge-Walking

When a node completes:

1. Stitch updates the database
2. Reads the node's outbound edges
3. Fires downstream nodes
4. Execution flows recursively

### Parallel Execution (M-Shape)

- **Splitter nodes**: Take array input, fire multiple paths (fan-out)
- **Collector nodes**: Wait for ALL upstream paths (fan-in)
- Enables concurrent processing

## Resources

- **Dictionary**: \`stitch://dictionary/core\` - Core terminology
- **Landing Page Guide**: \`stitch://instructions/landing-page\` - Specific integration guide
`;

const LANDING_PAGE_INSTRUCTIONS = `# Landing Page Integration Guide

## Overview

Landing pages are **Asset** nodes in Stitch that capture user input and trigger workflows. They're typically the entry point for leads entering your business model.

## Integration Steps

### 1. Create the Node

Use the MCP tool to create your landing page node:

\`\`\`
stitch_create_node(
  canvasId: "your-canvas-id",
  label: "Product Landing Page",
  nodeType: "asset",
  icon: "🌐",
  url: "https://yoursite.com/product"
)
\`\`\`

You'll receive:
- \`nodeId\`: Unique identifier for your landing page
- \`webhookUrl\`: Endpoint to send form submissions
- \`uptimeUrl\`: Endpoint for health checks

### 2. Generate Tracking Links (Marketing Campaigns)

Create tracking links for social media, email campaigns, or ads:

\`\`\`
stitch_generate_tracking_link(
  canvasId: "your-canvas-id",
  utmSource: "linkedin",
  utmCampaign: "demo_call",
  utmMedium: "social",
  redirectTo: "/demo"
)
\`\`\`

This returns a unique tracking URL like:
\`https://yourdomain.com/track?tracking_id=xyz&utm_source=linkedin&utm_campaign=demo_call&redirect_to=/demo\`

When someone clicks this link:
- They're tracked as a lead in your canvas
- UTM parameters are captured in their entity metadata
- They're redirected to your specified destination

### 3. Get Integration Code

Retrieve framework-specific code:

\`\`\`
stitch_get_stitching_code(
  nodeId: "your-node-id",
  framework: "nextjs",  // or "express", "python-flask"
  assetType: "landing-page"
)
\`\`\`

### 4. Implement Form Submission

When a user submits your form:

\`\`\`typescript
// Example: Next.js API route
export async function POST(request: Request) {
  const formData = await request.json();
  
  // Send to Stitch webhook
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'form_submission',
      data: {
        email: formData.email,
        name: formData.name,
        // ... other fields
      },
      timestamp: new Date().toISOString(),
    }),
  });
  
  return Response.json({ success: true });
}
\`\`\`

### 5. Add Analytics Tracking

Track user interactions:

\`\`\`typescript
// Track page view
await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'page_view',
    data: {
      page: '/product',
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    },
  }),
});

// Track button clicks
await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'button_click',
    data: {
      button: 'cta-primary',
      timestamp: new Date().toISOString(),
    },
  }),
});
\`\`\`

### 5. Implement Uptime Monitoring

Periodically report health status:

\`\`\`typescript
// Run every 5 minutes
setInterval(async () => {
  await fetch(UPTIME_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'healthy',
      metadata: {
        version: '1.0.0',
        uptime: process.uptime(),
      },
    }),
  });
}, 5 * 60 * 1000);
\`\`\`

## Event Types

### form_submission

Triggered when a user submits a form:

\`\`\`json
{
  "event": "form_submission",
  "data": {
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "message": "I'm interested in your product"
  },
  "timestamp": "2024-12-05T10:30:00Z"
}
\`\`\`

### page_view

Triggered when a user views a page:

\`\`\`json
{
  "event": "page_view",
  "data": {
    "page": "/product",
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0..."
  },
  "timestamp": "2024-12-05T10:25:00Z"
}
\`\`\`

### button_click

Triggered when a user clicks a tracked button:

\`\`\`json
{
  "event": "button_click",
  "data": {
    "button": "cta-primary",
    "page": "/product"
  },
  "timestamp": "2024-12-05T10:28:00Z"
}
\`\`\`

## Workflow Triggers

Landing page events typically trigger workflows like:

1. **Lead Capture**: Create entity, add to CRM, send welcome email
2. **Demo Scheduling**: Book calendar slot, send confirmation
3. **Trial Activation**: Create account, provision resources, send onboarding

## Best Practices

### 1. Validate Input

Always validate form data before sending to Stitch:

\`\`\`typescript
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
});

const validated = formSchema.parse(formData);
\`\`\`

### 2. Handle Errors Gracefully

Don't expose Stitch errors to end users:

\`\`\`typescript
try {
  await fetch(WEBHOOK_URL, { ... });
} catch (error) {
  console.error('Failed to send to Stitch:', error);
  // Show user-friendly message
  return Response.json({ 
    error: 'Something went wrong. Please try again.' 
  }, { status: 500 });
}
\`\`\`

### 3. Include Metadata

Send contextual information with events:

\`\`\`typescript
{
  event: 'form_submission',
  data: {
    ...formData,
    metadata: {
      source: 'landing-page',
      campaign: 'summer-2024',
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    }
  }
}
\`\`\`

### 4. Test Thoroughly

- Test form submission with valid data
- Test with invalid data (validation)
- Test network failures (retry logic)
- Test uptime monitoring
- Verify events appear in Stitch

## Common Patterns

### Multi-Step Forms

For multi-step forms, send events at each step:

\`\`\`typescript
// Step 1: Email capture
await sendToStitch({ event: 'step_1_complete', data: { email } });

// Step 2: Personal info
await sendToStitch({ event: 'step_2_complete', data: { name, phone } });

// Step 3: Final submission
await sendToStitch({ event: 'form_submission', data: { ...allData } });
\`\`\`

### A/B Testing

Include variant information in events:

\`\`\`typescript
{
  event: 'form_submission',
  data: {
    ...formData,
    variant: 'hero-v2',
    testId: 'homepage-hero-test'
  }
}
\`\`\`

### Exit Intent

Track when users are about to leave:

\`\`\`typescript
document.addEventListener('mouseleave', (e) => {
  if (e.clientY < 0) {
    sendToStitch({ event: 'exit_intent', data: { page: '/product' } });
  }
});
\`\`\`

## Troubleshooting

### Events Not Appearing

1. Check webhook URL is correct
2. Verify network requests in browser DevTools
3. Check Stitch logs for errors
4. Ensure JSON payload is valid

### Uptime Shows "Down"

1. Verify uptime URL is correct
2. Check ping interval (should be < 10 minutes)
3. Ensure server is running
4. Check for network issues

### Form Submissions Failing

1. Validate payload structure
2. Check for CORS issues
3. Verify Stitch is running
4. Check for rate limiting
`;

export const overviewResource = {
  uri: 'stitch://instructions/overview',
  name: 'Stitch Integration Overview',
  description: 'High-level integration guide covering the Stitch protocol and best practices',
  mimeType: 'text/markdown',
  
  async read() {
    return {
      contents: [
        {
          uri: 'stitch://instructions/overview',
          mimeType: 'text/markdown',
          text: OVERVIEW_INSTRUCTIONS,
        },
      ],
    };
  },
};

export const landingPageResource = {
  uri: 'stitch://instructions/landing-page',
  name: 'Landing Page Integration Guide',
  description: 'Specific guidance for integrating landing pages with Stitch',
  mimeType: 'text/markdown',
  
  async read() {
    return {
      contents: [
        {
          uri: 'stitch://instructions/landing-page',
          mimeType: 'text/markdown',
          text: LANDING_PAGE_INSTRUCTIONS,
        },
      ],
    };
  },
};
