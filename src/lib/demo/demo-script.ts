/**
 * Clockwork Canvas Demo Script
 * 
 * Defines a scripted sequence of webhook events that simulate real-world business
 * events for demonstration purposes. The demo showcases entities moving through
 * the Business Model Canvas from lead acquisition through conversion and support.
 * 
 * Each event includes:
 * - delay: Milliseconds from demo start
 * - endpoint: Webhook endpoint path
 * - payload: Data to send to the webhook
 * - description: Human-readable description for UI display
 * 
 * Requirements: 6.1
 */

/**
 * Demo event structure
 */
export interface DemoEvent {
  /** Milliseconds from demo start when this event should fire */
  delay: number;
  /** Webhook endpoint path (e.g., '/api/webhooks/clockwork/linkedin-lead') */
  endpoint: string;
  /** Payload to send to the webhook */
  payload: Record<string, any>;
  /** Human-readable description for UI display */
  description: string;
}

/**
 * Clockwork Canvas Demo Script
 * 
 * A 7-event sequence that demonstrates the complete customer journey:
 * 1. New lead from LinkedIn (Werewolf)
 * 2. Demo call booked (Goblin)
 * 3. Trial started (Witch)
 * 4. Converted to Pro subscription (Ghost)
 * 5. Support ticket opened (Mummy)
 * 6. Another lead from SEO (Skeleton)
 * 7. Enterprise conversion (Kraken)
 * 
 * Total duration: ~30 seconds
 */
export const CLOCKWORK_DEMO_SCRIPT: DemoEvent[] = [
  // Event 1: New lead from LinkedIn Ads (0s)
  {
    delay: 0,
    endpoint: '/api/webhooks/clockwork/linkedin-lead',
    payload: {
      name: 'Werewolf',
      email: 'werewolf@monsters.io',
      company: 'Full Moon Enterprises',
      source: 'linkedin-ads',
    },
    description: '🐺 New lead from LinkedIn Ads',
  },
  
  // Event 2: Demo call booked via Calendly (5s)
  {
    delay: 5000,
    endpoint: '/api/webhooks/clockwork/calendly-demo',
    payload: {
      name: 'Goblin',
      email: 'goblin@monsters.io',
      scheduled_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      source: 'calendly',
    },
    description: '👹 Demo call booked',
  },
  
  // Event 3: Trial started (10s)
  {
    delay: 10000,
    endpoint: '/api/webhooks/clockwork/stripe-trial',
    payload: {
      name: 'Witch',
      email: 'witch@monsters.io',
      trial_end: new Date(Date.now() + 1209600000).toISOString(), // 14 days
      source: 'stripe',
    },
    description: '🧙‍♀️ Free trial started',
  },
  
  // Event 4: Converted to Pro subscription (15s)
  {
    delay: 15000,
    endpoint: '/api/webhooks/clockwork/stripe-subscription-pro',
    payload: {
      name: 'Ghost',
      email: 'ghost@monsters.io',
      plan: 'pro',
      amount: 9900, // $99.00 in cents
      interval: 'month',
      source: 'stripe',
    },
    description: '👻 Converted to Pro plan ($99/mo)',
  },
  
  // Event 5: Support ticket opened (20s)
  {
    delay: 20000,
    endpoint: '/api/webhooks/clockwork/zendesk-ticket',
    payload: {
      name: 'Mummy',
      email: 'mummy@monsters.io',
      subject: 'Help unwrapping advanced features',
      priority: 'normal',
      source: 'zendesk',
    },
    description: '🧟 Support ticket opened',
  },
  
  // Event 6: New lead from SEO content (25s)
  {
    delay: 25000,
    endpoint: '/api/webhooks/clockwork/seo-form',
    payload: {
      name: 'Skeleton',
      email: 'skeleton@monsters.io',
      form_type: 'contact',
      source: 'organic-search',
    },
    description: '💀 New lead from SEO content',
  },
  
  // Event 7: Enterprise conversion (30s)
  {
    delay: 30000,
    endpoint: '/api/webhooks/clockwork/stripe-subscription-enterprise',
    payload: {
      name: 'Kraken',
      email: 'kraken@monsters.io',
      plan: 'enterprise',
      amount: 49900, // $499.00 in cents
      interval: 'month',
      seats: 50,
      source: 'stripe',
    },
    description: '🦑 Enterprise conversion ($499/mo)',
  },
];

/**
 * Get the total duration of the demo script in milliseconds
 * 
 * @returns Total duration from first event to last event, plus 5 seconds buffer
 */
export function getDemoScriptDuration(): number {
  if (CLOCKWORK_DEMO_SCRIPT.length === 0) return 0;
  
  const maxDelay = Math.max(...CLOCKWORK_DEMO_SCRIPT.map(event => event.delay));
  return maxDelay + 5000; // Add 5 seconds buffer for final event to complete
}

/**
 * Get the number of events in the demo script
 * 
 * @returns Number of demo events
 */
export function getDemoScriptEventCount(): number {
  return CLOCKWORK_DEMO_SCRIPT.length;
}

/**
 * Validate that all demo events have valid webhook endpoints
 * 
 * @returns True if all endpoints are valid, false otherwise
 */
export function validateDemoScript(): boolean {
  const validSources = [
    'linkedin-lead',
    'youtube-signup',
    'seo-form',
    'calendly-demo',
    'stripe-trial',
    'stripe-subscription-basic',
    'stripe-subscription-pro',
    'stripe-subscription-enterprise',
    'zendesk-ticket',
    'stripe-churn',
    'referral',
  ];
  
  return CLOCKWORK_DEMO_SCRIPT.every(event => {
    const source = event.endpoint.split('/').pop();
    return source && validSources.includes(source);
  });
}
