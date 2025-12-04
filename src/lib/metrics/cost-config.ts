/**
 * Cost Configuration Module
 * 
 * Defines cost categories and configuration for the financial metrics system.
 * Supports configurable cost categories with threshold warning logic.
 */

import { CostConfig, calculateTotalCosts } from './calculations';

// Re-export for convenience
export type { CostConfig };
export { calculateTotalCosts };

/**
 * Default cost configuration with demo values
 * Used when real cost data is unavailable
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  api_costs: 127,
  infrastructure_costs: 50,
  team_costs: 0,
  threshold: 200,
};

/**
 * Check if costs exceed or approach the warning threshold
 * 
 * @param config - Cost configuration object
 * @param warningPercentage - Percentage of threshold to trigger warning (default: 90%)
 * @returns True if costs are at or above the warning threshold
 */
export function shouldShowCostWarning(
  config: CostConfig,
  warningPercentage: number = 90
): boolean {
  if (!config.threshold || config.threshold <= 0) {
    return false;
  }
  const totalCosts = calculateTotalCosts(config);
  const warningThreshold = (config.threshold * warningPercentage) / 100;
  return totalCosts >= warningThreshold;
}

/**
 * Get cost breakdown with percentages
 * 
 * @param config - Cost configuration object
 * @returns Array of cost categories with amounts and percentages
 */
export function getCostBreakdown(config: CostConfig): Array<{
  category: string;
  amount: number;
  percentage: number;
}> {
  const total = calculateTotalCosts(config);
  
  // Avoid division by zero
  if (total === 0) {
    return [
      { category: 'API', amount: 0, percentage: 0 },
      { category: 'Infrastructure', amount: 0, percentage: 0 },
      { category: 'Team', amount: 0, percentage: 0 },
    ];
  }

  return [
    {
      category: 'API',
      amount: config.api_costs,
      percentage: (config.api_costs / total) * 100,
    },
    {
      category: 'Infrastructure',
      amount: config.infrastructure_costs,
      percentage: (config.infrastructure_costs / total) * 100,
    },
    {
      category: 'Team',
      amount: config.team_costs,
      percentage: (config.team_costs / total) * 100,
    },
  ];
}

/**
 * Get the percentage of threshold currently used
 * 
 * @param config - Cost configuration object
 * @returns Percentage of threshold used (0-100+)
 */
export function getThresholdUsagePercentage(config: CostConfig): number {
  if (config.threshold === 0) {
    return 0;
  }
  const totalCosts = calculateTotalCosts(config);
  return (totalCosts / config.threshold) * 100;
}
