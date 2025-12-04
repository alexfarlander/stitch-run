/**
 * Financial Metrics Calculation Service
 * 
 * Provides centralized functions for deriving financial metrics from entity data.
 * All functions are pure (no side effects) and handle missing metadata gracefully.
 */

import { StitchEntity } from '@/types/entity';

export interface PlanBreakdown {
  plan: string;
  count: number;
  revenue: number;
  mrr: number;
  percentage: number; // Percentage of total revenue
}

export interface CostConfig {
  api_costs: number;
  infrastructure_costs: number;
  team_costs: number;
  threshold: number; // Warning threshold
}

/**
 * Calculate total Customer Acquisition Cost from all entities
 * Sums the CAC value from entity metadata
 * 
 * @param entities - Array of entities to calculate from
 * @returns Total CAC across all entities (defaults to 0 for missing values)
 */
export function calculateTotalCAC(entities: StitchEntity[]): number {
  return entities.reduce((total, entity) => {
    const cac = entity.metadata?.cac;
    // Validate that CAC is a valid number
    if (typeof cac === 'number' && !isNaN(cac) && cac >= 0) {
      return total + cac;
    }
    return total;
  }, 0);
}

/**
 * Calculate total revenue from customer entities
 * Sums LTV values from entities with type 'customer'
 * 
 * @param entities - Array of entities to calculate from
 * @returns Total revenue from customer entities only
 */
export function calculateTotalRevenue(entities: StitchEntity[]): number {
  return entities.reduce((total, entity) => {
    // Only include customers
    if (entity.entity_type !== 'customer') {
      return total;
    }
    
    const ltv = entity.metadata?.ltv;
    // Validate that LTV is a valid number
    if (typeof ltv === 'number' && !isNaN(ltv) && ltv >= 0) {
      return total + ltv;
    }
    return total;
  }, 0);
}

/**
 * Calculate Monthly Recurring Revenue
 * Derives MRR from customer entities with plan information
 * Uses monthly_value if available, otherwise ltv/12
 * 
 * @param entities - Array of entities to calculate from
 * @returns Monthly recurring revenue from customer entities
 */
export function calculateMRR(entities: StitchEntity[]): number {
  return entities.reduce((total, entity) => {
    // Only include customers
    if (entity.entity_type !== 'customer') {
      return total;
    }
    
    const monthlyValue = entity.metadata?.monthly_value;
    const ltv = entity.metadata?.ltv;
    
    // Prefer monthly_value if available
    if (typeof monthlyValue === 'number' && !isNaN(monthlyValue) && monthlyValue >= 0) {
      return total + monthlyValue;
    }
    
    // Fall back to ltv/12
    if (typeof ltv === 'number' && !isNaN(ltv) && ltv >= 0) {
      return total + (ltv / 12);
    }
    
    return total;
  }, 0);
}

/**
 * Calculate churn rate as percentage
 * Returns (churned_count / total_customers) * 100
 * 
 * @param entities - Array of entities to calculate from
 * @returns Churn rate as a percentage (0-100)
 */
export function calculateChurnRate(entities: StitchEntity[]): number {
  const churnedCount = entities.filter(e => e.entity_type === 'churned').length;
  const customerCount = entities.filter(e => e.entity_type === 'customer').length;
  
  // Total is customers + churned (the pool of people who were customers)
  const totalCustomerPool = customerCount + churnedCount;
  
  if (totalCustomerPool === 0) {
    return 0;
  }
  
  return (churnedCount / totalCustomerPool) * 100;
}

/**
 * Group customers by plan with counts and revenue
 * Returns breakdown of customers per plan with aggregated metrics
 * 
 * @param entities - Array of entities to calculate from
 * @returns Array of plan breakdowns with counts and revenue
 */
export function getCustomersByPlan(entities: StitchEntity[]): PlanBreakdown[] {
  // Filter to only customers
  const customers = entities.filter(e => e.entity_type === 'customer');
  
  // Group by plan
  const planMap = new Map<string, { count: number; revenue: number; mrr: number }>();
  
  customers.forEach(entity => {
    const plan = entity.metadata?.plan || 'unknown';
    const ltv = typeof entity.metadata?.ltv === 'number' && !isNaN(entity.metadata.ltv) 
      ? entity.metadata.ltv 
      : 0;
    
    const monthlyValue = entity.metadata?.monthly_value;
    const mrr = typeof monthlyValue === 'number' && !isNaN(monthlyValue) && monthlyValue >= 0
      ? monthlyValue
      : ltv / 12;
    
    const existing = planMap.get(plan) || { count: 0, revenue: 0, mrr: 0 };
    planMap.set(plan, {
      count: existing.count + 1,
      revenue: existing.revenue + ltv,
      mrr: existing.mrr + mrr,
    });
  });
  
  // Calculate total revenue for percentages
  const totalRevenue = Array.from(planMap.values()).reduce((sum, p) => sum + p.revenue, 0);
  
  // Convert to array with percentages
  return Array.from(planMap.entries()).map(([plan, data]) => ({
    plan,
    count: data.count,
    revenue: data.revenue,
    mrr: data.mrr,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));
}

/**
 * Calculate Average Revenue Per User (ARPU)
 * Returns MRR divided by customer count
 * 
 * @param entities - Array of entities to calculate from
 * @returns ARPU (MRR per customer), or 0 if no customers
 */
export function calculateARPU(entities: StitchEntity[]): number {
  const customerCount = entities.filter(e => e.entity_type === 'customer').length;
  
  if (customerCount === 0) {
    return 0;
  }
  
  const mrr = calculateMRR(entities);
  return mrr / customerCount;
}

/**
 * Calculate LTV to CAC ratio
 * Returns average LTV divided by average CAC
 * 
 * @param entities - Array of entities to calculate from
 * @returns LTV:CAC ratio, or 0 if no valid data
 */
export function calculateLTVtoCAC(entities: StitchEntity[]): number {
  // Calculate average LTV from customers
  const customers = entities.filter(e => e.entity_type === 'customer');
  
  if (customers.length === 0) {
    return 0;
  }
  
  const totalLTV = customers.reduce((sum, entity) => {
    const ltv = entity.metadata?.ltv;
    if (typeof ltv === 'number' && !isNaN(ltv) && ltv >= 0) {
      return sum + ltv;
    }
    return sum;
  }, 0);
  
  const avgLTV = totalLTV / customers.length;
  
  // Calculate average CAC from all entities (leads + customers)
  const entitiesWithCAC = entities.filter(e => {
    const cac = e.metadata?.cac;
    return typeof cac === 'number' && !isNaN(cac) && cac > 0;
  });
  
  if (entitiesWithCAC.length === 0) {
    return 0;
  }
  
  const totalCAC = entitiesWithCAC.reduce((sum, entity) => {
    return sum + (entity.metadata?.cac || 0);
  }, 0);
  
  const avgCAC = totalCAC / entitiesWithCAC.length;
  
  if (avgCAC === 0) {
    return 0;
  }
  
  return avgLTV / avgCAC;
}

/**
 * Calculate total costs from cost configuration
 * Returns sum of all cost categories
 * 
 * @param config - Cost configuration object
 * @returns Total monthly costs
 */
export function calculateTotalCosts(config: CostConfig): number {
  const apiCosts = typeof config.api_costs === 'number' && !isNaN(config.api_costs) && config.api_costs >= 0
    ? config.api_costs
    : 0;
  
  const infraCosts = typeof config.infrastructure_costs === 'number' && !isNaN(config.infrastructure_costs) && config.infrastructure_costs >= 0
    ? config.infrastructure_costs
    : 0;
  
  const teamCosts = typeof config.team_costs === 'number' && !isNaN(config.team_costs) && config.team_costs >= 0
    ? config.team_costs
    : 0;
  
  return apiCosts + infraCosts + teamCosts;
}

/**
 * Trend data point for time-series visualization
 */
export interface TrendDataPoint {
  period: string;  // "Jan", "Feb", or ISO date
  value: number;
}

/**
 * Generate historical trend data for demo purposes
 * Creates realistic time-series data with growth patterns
 * 
 * @param baseValue - Starting value for the trend
 * @param periods - Number of data points to generate (e.g., 6-12 months)
 * @param growthRate - Monthly growth rate as decimal (e.g., 0.10 for 10%)
 * @returns Array of trend data points with realistic variation
 */
export function generateTrendData(
  baseValue: number,
  periods: number,
  growthRate: number
): TrendDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const trendData: TrendDataPoint[] = [];
  
  let currentValue = baseValue;
  
  for (let i = 0; i < periods; i++) {
    // Calculate month index (going backwards from current month)
    const monthIndex = (currentMonth - (periods - 1 - i) + 12) % 12;
    const period = months[monthIndex];
    
    // Add slight randomness for realism (-5% to +5% variation)
    const randomVariation = 1 + (Math.random() * 0.1 - 0.05);
    const value = Math.round(currentValue * randomVariation);
    
    trendData.push({
      period,
      value: Math.max(0, value), // Ensure non-negative
    });
    
    // Apply growth rate for next period
    currentValue = currentValue * (1 + growthRate);
  }
  
  return trendData;
}

/**
 * Generate forecast data based on current trend
 * Projects future values using linear or exponential growth
 * 
 * @param historicalData - Array of historical trend data points
 * @param periodsAhead - Number of periods to forecast into the future
 * @returns Array of forecasted trend data points
 */
export function generateForecast(
  historicalData: TrendDataPoint[],
  periodsAhead: number
): TrendDataPoint[] {
  if (historicalData.length < 2) {
    // Not enough data to forecast
    return [];
  }
  
  // Calculate average growth rate from historical data
  let totalGrowthRate = 0;
  let growthRateCount = 0;
  
  for (let i = 1; i < historicalData.length; i++) {
    const previous = historicalData[i - 1].value;
    const current = historicalData[i].value;
    
    if (previous > 0) {
      const growthRate = (current - previous) / previous;
      totalGrowthRate += growthRate;
      growthRateCount++;
    }
  }
  
  const avgGrowthRate = growthRateCount > 0 ? totalGrowthRate / growthRateCount : 0;
  
  // Get the last value from historical data
  const lastValue = historicalData[historicalData.length - 1].value;
  
  // Generate forecast
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastPeriod = historicalData[historicalData.length - 1].period;
  const lastMonthIndex = months.indexOf(lastPeriod);
  
  const forecastData: TrendDataPoint[] = [];
  let currentValue = lastValue;
  
  for (let i = 1; i <= periodsAhead; i++) {
    const monthIndex = (lastMonthIndex + i) % 12;
    const period = months[monthIndex];
    
    // Apply average growth rate
    currentValue = currentValue * (1 + avgGrowthRate);
    
    forecastData.push({
      period,
      value: Math.round(Math.max(0, currentValue)), // Ensure non-negative and round
    });
  }
  
  return forecastData;
}

/**
 * Growth indicator direction
 */
export type GrowthDirection = 'up' | 'down' | 'neutral';

/**
 * Growth indicator result
 */
export interface GrowthIndicator {
  direction: GrowthDirection;
  percentage: string;
  percentageValue: number;
}

/**
 * Calculate growth indicator from two metric values
 * Determines direction (up/down/neutral) and formats percentage change
 * 
 * @param currentValue - Current period value
 * @param previousValue - Previous period value
 * @returns Growth indicator with direction and formatted percentage
 */
export function calculateGrowthIndicator(
  currentValue: number,
  previousValue: number
): GrowthIndicator {
  // Handle edge case: no previous data (previousValue is 0 or undefined)
  if (previousValue === 0 || previousValue === undefined || previousValue === null) {
    // If current value is positive, show as growth from zero
    if (currentValue > 0) {
      return {
        direction: 'up',
        percentage: '100%',
        percentageValue: 100,
      };
    }
    // If both are zero or current is zero, neutral
    return {
      direction: 'neutral',
      percentage: '0%',
      percentageValue: 0,
    };
  }
  
  // Handle edge case: equal values
  if (currentValue === previousValue) {
    return {
      direction: 'neutral',
      percentage: '0%',
      percentageValue: 0,
    };
  }
  
  // Calculate percentage change
  const change = currentValue - previousValue;
  const percentageValue = (change / previousValue) * 100;
  
  // Determine direction
  let direction: GrowthDirection;
  if (currentValue > previousValue) {
    direction = 'up';
  } else if (currentValue < previousValue) {
    direction = 'down';
  } else {
    direction = 'neutral';
  }
  
  // Format percentage with appropriate precision
  // Use 1 decimal place for values < 10%, 0 decimals for larger values
  const absPercentage = Math.abs(percentageValue);
  let formattedPercentage: string;
  
  // Handle extreme values (very large percentages)
  if (absPercentage > 1e10) {
    // For extremely large percentages, cap at a reasonable display value
    formattedPercentage = '999';
  } else if (absPercentage < 10) {
    formattedPercentage = absPercentage.toFixed(1);
  } else {
    formattedPercentage = Math.round(absPercentage).toString();
  }
  
  // Add sign for display (but not for neutral)
  const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : '';
  const percentage = `${sign}${formattedPercentage}%`;
  
  return {
    direction,
    percentage,
    percentageValue,
  };
}
