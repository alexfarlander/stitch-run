/**
 * Financial Update Logic
 * 
 * Handles real-time updates to financial metrics on the BMC canvas.
 * Updates MRR, costs, and other financial nodes based on business events.
 * 
 * Requirements: 5.6, 9.1, 9.2, 9.4
 */

import { getAdminClient } from '../supabase/client';
import { StitchNode } from '@/types/stitch';

/**
 * Payload for subscription-based financial updates
 */
export interface SubscriptionPayload {
  plan?: string;           // Plan type: 'basic', 'pro', 'enterprise'
  amount?: number;         // Subscription amount in cents
  email?: string;          // Customer email
}

/**
 * Payload for worker invocation cost updates
 */
export interface WorkerCostPayload {
  worker_type?: string;    // Worker type: 'claude', 'elevenlabs', 'minimax'
  invocation_count?: number; // Number of invocations (default: 1)
}

/**
 * Combined payload type for financial updates
 */
export type FinancialUpdatePayload = SubscriptionPayload & WorkerCostPayload;

/**
 * Worker cost mapping (in cents)
 * Based on typical API pricing
 */
const WORKER_COSTS: Record<string, number> = {
  'claude': 2,           // $0.02 per call
  'elevenlabs': 5,       // $0.05 per call
  'minimax': 50,         // $0.50 per call
};

/**
 * Calculate Stripe fee for a subscription amount
 * Stripe charges 2.9% + $0.30 per transaction
 * 
 * @param amount - Subscription amount in cents
 * @returns Stripe fee in cents
 */
function calculateStripeFee(amount: number): number {
  return Math.round(amount * 0.029 + 30);
}

/**
 * Update financial metrics based on business events
 * 
 * This function:
 * 1. Fetches the BMC canvas from the database
 * 2. Updates relevant financial nodes (MRR, costs)
 * 3. Saves the updated graph back to the database
 * 
 * Requirements:
 * - 5.6: Update financial metrics for subscription webhooks
 * - 9.1: Increment MRR node value for subscriptions
 * - 9.2: Add Stripe fee to costs for subscriptions
 * - 9.4: Increment worker cost nodes when workers are invoked
 * 
 * @param payload - Financial update payload
 * @returns Promise that resolves when update is complete
 */
export async function updateFinancials(
  payload: FinancialUpdatePayload
): Promise<void> {
  const _supabase = getAdminClient();
  
  // Get current BMC canvas (get the most recent one if multiple exist)
  const { data: bmcList, error: fetchError } = await supabase
    .from('stitch_flows')
    .select('id, graph')
    .eq('canvas_type', 'bmc')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (fetchError) {
    console.error('Failed to fetch BMC for financial update:', fetchError);
    throw new Error(`Failed to fetch BMC: ${fetchError.message}`);
  }
  
  if (!bmcList || bmcList.length === 0) {
    console.error('No BMC canvas found for financial update');
    throw new Error('No BMC canvas found');
  }
  
  const bmc = bmcList[0];
  
  const graph = bmc.graph;
  let updated = false;
  
  // Handle subscription updates (Requirements 5.6, 9.1, 9.2, 9.4)
  if (payload.plan && payload.amount) {
    // Update MRR (Requirement 9.1)
    const mrrNode = graph.nodes.find((n: StitchNode) => n.id === 'item-mrr');
    if (mrrNode) {
      const currentValue = mrrNode.data?.value || 0;
      mrrNode.data = {
        ...mrrNode.data,
        value: currentValue + payload.amount,
      };
      updated = true;
      console.log(`Updated MRR: ${currentValue} -> ${currentValue + payload.amount} (added ${payload.amount})`);
    } else {
      console.warn('MRR node not found in BMC graph');
    }
    
    // Add Stripe fee to costs (Requirement 9.2)
    const stripeFeeNode = graph.nodes.find((n: StitchNode) => n.id === 'item-stripe-fees');
    if (stripeFeeNode) {
      const fee = calculateStripeFee(payload.amount);
      const currentValue = stripeFeeNode.data?.value || 0;
      stripeFeeNode.data = {
        ...stripeFeeNode.data,
        value: currentValue + fee,
      };
      updated = true;
      console.log(`Updated Stripe fees: ${currentValue} -> ${currentValue + fee} (added ${fee})`);
    } else {
      console.warn('Stripe fees node not found in BMC graph');
    }
  }
  
  // Handle worker cost updates (Requirement 9.4)
  if (payload.worker_type) {
    const cost = WORKER_COSTS[payload.worker_type] || 0;
    const invocationCount = payload.invocation_count || 1;
    const totalCost = cost * invocationCount;
    
    if (cost > 0) {
      const costNodeId = `item-${payload.worker_type}-cost`;
      const workerCostNode = graph.nodes.find(
        (n: StitchNode) => n.id === costNodeId
      );
      
      if (workerCostNode) {
        const currentValue = workerCostNode.data?.value || 0;
        workerCostNode.data = {
          ...workerCostNode.data,
          value: currentValue + totalCost,
        };
        updated = true;
        console.log(`Updated ${payload.worker_type} cost: ${currentValue} -> ${currentValue + totalCost} (added ${totalCost})`);
      } else {
        console.warn(`Worker cost node ${costNodeId} not found in BMC graph`);
      }
    } else {
      console.warn(`Unknown worker type: ${payload.worker_type}`);
    }
  }
  
  // Save updated graph back to database if any changes were made
  if (updated) {
    const { error: updateError } = await supabase
      .from('stitch_flows')
      .update({ graph })
      .eq('id', bmc.id);
    
    if (updateError) {
      console.error('Failed to save financial updates:', updateError);
      throw new Error(`Failed to save financial updates: ${updateError.message}`);
    }
    
    console.log('Financial metrics updated successfully');
  } else {
    console.log('No financial updates applied (no matching nodes or invalid payload)');
  }
}

/**
 * Reset financial metrics to their initial values
 * Used by the demo reset functionality
 * 
 * Requirement 9.5: Reset financial values to initial state
 * 
 * @returns Promise that resolves when reset is complete
 */
export async function resetFinancialMetrics(): Promise<void> {
  const _supabase = getAdminClient();
  
  // Get current BMC canvas (get the most recent one if multiple exist)
  const { data: bmcList, error: fetchError } = await supabase
    .from('stitch_flows')
    .select('id, graph')
    .eq('canvas_type', 'bmc')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (fetchError) {
    console.error('Failed to fetch BMC for financial reset:', fetchError);
    throw new Error(`Failed to fetch BMC: ${fetchError.message}`);
  }
  
  if (!bmcList || bmcList.length === 0) {
    console.error('No BMC canvas found for financial reset');
    throw new Error('No BMC canvas found');
  }
  
  const bmc = bmcList[0];
  
  const graph = bmc.graph;
  
  // Reset to zero for demo
  const initialValues: Record<string, number> = {
    'item-mrr': 0,
    'item-arr': 0,
    'item-ltv': 0,
    'item-stripe-fees': 0,
    'item-claude-cost': 0,
    'item-elevenlabs-cost': 0,
    'item-minimax-cost': 0,
  };
  
  // Reset all financial nodes to initial values
  for (const [nodeId, initialValue] of Object.entries(initialValues)) {
    const node = graph.nodes.find((n: StitchNode) => n.id === nodeId);
    if (node) {
      node.data = {
        ...node.data,
        value: initialValue,
      };
      console.log(`Reset ${nodeId} to ${initialValue}`);
    }
  }
  
  // Save updated graph back to database
  const { error: updateError } = await supabase
    .from('stitch_flows')
    .update({ graph })
    .eq('id', bmc.id);
  
  if (updateError) {
    console.error('Failed to save financial reset:', updateError);
    throw new Error(`Failed to save financial reset: ${updateError.message}`);
  }
  
  console.log('Financial metrics reset to initial values');
}

/**
 * Get current financial metrics from the BMC
 * Useful for displaying current state or validation
 * 
 * @returns Object containing current financial metric values
 */
export async function getFinancialMetrics(): Promise<Record<string, number>> {
  const _supabase = getAdminClient();
  
  const { data: bmcList, error } = await supabase
    .from('stitch_flows')
    .select('graph')
    .eq('canvas_type', 'bmc')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !bmcList || bmcList.length === 0) {
    console.error('Failed to fetch BMC for financial metrics:', error);
    return {};
  }
  
  const bmc = bmcList[0];
  
  const metrics: Record<string, number> = {};
  const financialNodeIds = [
    'item-mrr',
    'item-arr',
    'item-ltv',
    'item-stripe-fees',
    'item-claude-cost',
    'item-elevenlabs-cost',
    'item-minimax-cost',
  ];
  
  for (const nodeId of financialNodeIds) {
    const node = bmc.graph.nodes.find((n: StitchNode) => n.id === nodeId);
    if (node && node.data?.value !== undefined) {
      metrics[nodeId] = node.data.value;
    }
  }
  
  return metrics;
}
