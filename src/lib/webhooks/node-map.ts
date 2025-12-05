/**
 * Webhook Node Mapper
 * 
 * Maps webhook sources to target node IDs in the Business Model Canvas.
 * This enables external events (LinkedIn leads, Stripe subscriptions, etc.)
 * to automatically move entities to the appropriate nodes in the customer journey.
 * 
 * Requirements: 5.1, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

/**
 * Mapping of webhook sources to BMC item node IDs
 * 
 * Webhook sources follow the pattern: {platform}-{event}
 * Node IDs follow the pattern: item-{name}
 */
export const WEBHOOK_NODE_MAP: Record<string, string> = {
  // Marketing touchpoints (Requirements 11.1)
  'linkedin-lead': 'item-linkedin-ads',
  'youtube-signup': 'item-youtube-channel',
  'seo-form': 'item-seo-content',
  
  // Sales touchpoints (Requirements 11.2)
  'calendly-demo': 'item-demo-call',
  
  // Offers touchpoints (Requirements 11.3)
  'stripe-trial': 'item-free-trial',
  
  // Product subscriptions (Requirements 11.4)
  'stripe-subscription-basic': 'item-basic-plan',
  'stripe-subscription-pro': 'item-pro-plan',
  'stripe-subscription-enterprise': 'item-enterprise',
  
  // Support touchpoints (Requirements 11.5)
  'zendesk-ticket': 'item-help-desk',
  
  // Churn events (Requirements 11.6)
  'stripe-churn': 'item-help-desk',
  
  // Referral touchpoints (Requirements 11.7)
  'referral': 'item-referral-program',
};

/**
 * Maps a webhook source to its target node ID
 * 
 * @param source - The webhook source identifier (e.g., 'linkedin-lead', 'stripe-subscription-pro')
 * @returns The target node ID, or undefined if the source is not recognized
 * 
 * @example
 * ```typescript
 * const nodeId = mapWebhookSourceToNode('linkedin-lead');
 * // Returns: 'item-linkedin-ads'
 * 
 * const nodeId = mapWebhookSourceToNode('stripe-subscription-pro');
 * // Returns: 'item-pro-plan'
 * ```
 */
export function mapWebhookSourceToNode(source: string): string | undefined {
  return WEBHOOK_NODE_MAP[source];
}

/**
 * Checks if a webhook source is valid (has a mapping)
 * 
 * @param source - The webhook source identifier
 * @returns True if the source has a valid mapping, false otherwise
 */
export function isValidWebhookSource(source: string): boolean {
  return source in WEBHOOK_NODE_MAP;
}

/**
 * Gets all valid webhook sources
 * 
 * @returns Array of all valid webhook source identifiers
 */
export function getValidWebhookSources(): string[] {
  return Object.keys(WEBHOOK_NODE_MAP);
}
