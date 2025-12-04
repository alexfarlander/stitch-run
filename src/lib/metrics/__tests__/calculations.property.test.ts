/**
 * Property-based tests for financial metrics calculations
 * Uses fast-check for property-based testing
 * Tests: Properties 1-5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateTotalCAC,
  calculateTotalRevenue,
  calculateMRR,
  calculateChurnRate,
  getCustomersByPlan,
  calculateTotalCosts,
  calculateGrowthIndicator,
} from '../calculations';
import type { CostConfig } from '../calculations';
import { StitchEntity, EntityType, JourneyEvent } from '@/types/entity';

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid entity type
 */
const entityTypeArb = fc.constantFrom<EntityType>('lead', 'customer', 'churned');

/**
 * Generate a valid CAC value (non-negative number)
 */
const cacArb = fc.double({ min: 0, max: 10000, noNaN: true });

/**
 * Generate a valid LTV value (non-negative number)
 */
const ltvArb = fc.double({ min: 0, max: 100000, noNaN: true });

/**
 * Generate a valid monthly value (non-negative number)
 */
const monthlyValueArb = fc.double({ min: 0, max: 10000, noNaN: true });

/**
 * Generate a valid plan name
 */
const planArb = fc.constantFrom('starter', 'pro', 'enterprise', 'basic');

/**
 * Generate entity metadata with financial fields
 */
const entityMetadataArb = fc.record({
  cac: fc.option(cacArb, { nil: undefined }),
  ltv: fc.option(ltvArb, { nil: undefined }),
  monthly_value: fc.option(monthlyValueArb, { nil: undefined }),
  plan: fc.option(planArb, { nil: undefined }),
});

/**
 * Generate a complete StitchEntity
 */
const entityArb = fc.record({
  id: fc.uuid(),
  canvas_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  avatar_url: fc.option(fc.webUrl(), { nil: undefined }),
  entity_type: entityTypeArb,
  current_node_id: fc.option(fc.string(), { nil: undefined }),
  current_edge_id: fc.option(fc.string(), { nil: undefined }),
  edge_progress: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
  destination_node_id: fc.option(fc.string(), { nil: undefined }),
  journey: fc.constant([]) as fc.Arbitrary<JourneyEvent[]>,
  metadata: entityMetadataArb,
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
  completed_at: fc.option(fc.constant('2024-01-01T00:00:00.000Z'), { nil: undefined }),
});

/**
 * Generate an array of entities
 */
const entitiesArb = fc.array(entityArb, { minLength: 0, maxLength: 50 });

/**
 * Generate a valid cost value (non-negative number)
 */
const costArb = fc.double({ min: 0, max: 10000, noNaN: true });

/**
 * Generate a cost configuration object
 */
const costConfigArb = fc.record({
  api_costs: costArb,
  infrastructure_costs: costArb,
  team_costs: costArb,
  threshold: costArb,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely get CAC value from entity (matching implementation logic)
 */
function safeGetCAC(entity: StitchEntity): number {
  const cac = entity.metadata?.cac;
  if (typeof cac === 'number' && !isNaN(cac) && cac >= 0) {
    return cac;
  }
  return 0;
}

/**
 * Safely get LTV value from entity (matching implementation logic)
 */
function safeGetLTV(entity: StitchEntity): number {
  const ltv = entity.metadata?.ltv;
  if (typeof ltv === 'number' && !isNaN(ltv) && ltv >= 0) {
    return ltv;
  }
  return 0;
}

/**
 * Safely get monthly value from entity (matching implementation logic)
 */
function safeGetMonthlyValue(entity: StitchEntity): number {
  const monthlyValue = entity.metadata?.monthly_value;
  const ltv = entity.metadata?.ltv;
  
  if (typeof monthlyValue === 'number' && !isNaN(monthlyValue) && monthlyValue >= 0) {
    return monthlyValue;
  }
  
  if (typeof ltv === 'number' && !isNaN(ltv) && ltv >= 0) {
    return ltv / 12;
  }
  
  return 0;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Financial Metrics Calculations Property Tests', () => {
  describe('Property 1: CAC calculation is sum of entity CAC values', () => {
    it('**Feature: financial-metrics, Property 1: CAC calculation is sum of entity CAC values**', () => {
      fc.assert(
        fc.property(entitiesArb, (entities) => {
          const result = calculateTotalCAC(entities);
          
          // Calculate expected sum manually
          const expectedSum = entities.reduce((sum, entity) => {
            return sum + safeGetCAC(entity);
          }, 0);
          
          // The result should equal the sum of all CAC values
          expect(result).toBeCloseTo(expectedSum, 5);
        }),
        testConfig
      );
    });
  });

  describe('Property 2: Revenue calculation includes only customers', () => {
    it('**Feature: financial-metrics, Property 2: Revenue calculation includes only customers**', () => {
      fc.assert(
        fc.property(entitiesArb, (entities) => {
          const result = calculateTotalRevenue(entities);
          
          // Calculate expected sum from customers only
          const expectedSum = entities
            .filter(e => e.entity_type === 'customer')
            .reduce((sum, entity) => {
              return sum + safeGetLTV(entity);
            }, 0);
          
          // The result should equal the sum of LTV from customers only
          expect(result).toBeCloseTo(expectedSum, 5);
        }),
        testConfig
      );
    });
  });

  describe('Property 3: MRR calculation uses monthly values', () => {
    it('**Feature: financial-metrics, Property 3: MRR calculation uses monthly values**', () => {
      fc.assert(
        fc.property(entitiesArb, (entities) => {
          const result = calculateMRR(entities);
          
          // Calculate expected MRR from customers only
          const expectedMRR = entities
            .filter(e => e.entity_type === 'customer')
            .reduce((sum, entity) => {
              return sum + safeGetMonthlyValue(entity);
            }, 0);
          
          // The result should equal the sum of monthly values from customers
          expect(result).toBeCloseTo(expectedMRR, 5);
        }),
        testConfig
      );
    });
  });

  describe('Property 4: Churn rate is percentage of churned entities', () => {
    it('**Feature: financial-metrics, Property 4: Churn rate is percentage of churned entities**', () => {
      fc.assert(
        fc.property(entitiesArb, (entities) => {
          const result = calculateChurnRate(entities);
          
          // Calculate expected churn rate
          const churnedCount = entities.filter(e => e.entity_type === 'churned').length;
          const customerCount = entities.filter(e => e.entity_type === 'customer').length;
          const totalCustomerPool = customerCount + churnedCount;
          
          const expectedChurnRate = totalCustomerPool === 0 
            ? 0 
            : (churnedCount / totalCustomerPool) * 100;
          
          // The result should equal the calculated churn rate
          expect(result).toBeCloseTo(expectedChurnRate, 5);
          
          // Churn rate should always be between 0 and 100
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }),
        testConfig
      );
    });
  });

  describe('Property 5: Plan breakdown sums to total customers', () => {
    it('**Feature: financial-metrics, Property 5: Plan breakdown sums to total customers**', () => {
      fc.assert(
        fc.property(entitiesArb, (entities) => {
          const result = getCustomersByPlan(entities);
          
          // Calculate expected total customer count
          const expectedCustomerCount = entities.filter(e => e.entity_type === 'customer').length;
          
          // Sum of counts across all plans should equal total customers
          const sumOfCounts = result.reduce((sum, plan) => sum + plan.count, 0);
          
          expect(sumOfCounts).toBe(expectedCustomerCount);
          
          // Sum of percentages should be approximately 100 (or 0 if no revenue)
          const sumOfPercentages = result.reduce((sum, plan) => sum + plan.percentage, 0);
          const totalRevenue = result.reduce((sum, plan) => sum + plan.revenue, 0);
          
          if (totalRevenue > 0) {
            expect(sumOfPercentages).toBeCloseTo(100, 1);
          } else {
            expect(sumOfPercentages).toBe(0);
          }
        }),
        testConfig
      );
    });
  });

  describe('Property 6: Cost total equals sum of categories', () => {
    it('**Feature: financial-metrics, Property 6: Cost total equals sum of categories**', () => {
      fc.assert(
        fc.property(costConfigArb, (config) => {
          const result = calculateTotalCosts(config);
          
          // Calculate expected sum manually
          const safeApiCosts = typeof config.api_costs === 'number' && !isNaN(config.api_costs) && config.api_costs >= 0
            ? config.api_costs
            : 0;
          
          const safeInfraCosts = typeof config.infrastructure_costs === 'number' && !isNaN(config.infrastructure_costs) && config.infrastructure_costs >= 0
            ? config.infrastructure_costs
            : 0;
          
          const safeTeamCosts = typeof config.team_costs === 'number' && !isNaN(config.team_costs) && config.team_costs >= 0
            ? config.team_costs
            : 0;
          
          const expectedSum = safeApiCosts + safeInfraCosts + safeTeamCosts;
          
          // The result should equal the sum of all cost categories
          expect(result).toBeCloseTo(expectedSum, 5);
          
          // Total costs should always be non-negative
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        testConfig
      );
    });
  });

  describe('Property 7: Growth indicator direction matches value change', () => {
    it('**Feature: financial-metrics, Property 7: Growth indicator direction matches value change**', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100000, noNaN: true }),
          fc.double({ min: 0, max: 100000, noNaN: true }),
          (currentValue, previousValue) => {
            const result = calculateGrowthIndicator(currentValue, previousValue);
            
            // Property: Direction should match the comparison of values
            if (currentValue > previousValue) {
              expect(result.direction).toBe('up');
              expect(result.percentageValue).toBeGreaterThan(0);
            } else if (currentValue < previousValue) {
              expect(result.direction).toBe('down');
              expect(result.percentageValue).toBeLessThan(0);
            } else {
              // Equal values
              expect(result.direction).toBe('neutral');
              expect(result.percentageValue).toBe(0);
            }
            
            // Percentage string should be properly formatted
            expect(result.percentage).toMatch(/^[+-]?\d+(\.\d+)?%$/);
            
            // For upward direction, percentage should start with +
            if (result.direction === 'up' && previousValue > 0) {
              expect(result.percentage).toMatch(/^\+/);
            }
            
            // For downward direction, percentage should start with -
            if (result.direction === 'down') {
              expect(result.percentage).toMatch(/^-/);
            }
            
            // For neutral direction, percentage should be 0%
            if (result.direction === 'neutral') {
              expect(result.percentage).toBe('0%');
            }
          }
        ),
        testConfig
      );
    });

    it('handles edge case: no previous data (previousValue is 0)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100000, noNaN: true }),
          (currentValue) => {
            const result = calculateGrowthIndicator(currentValue, 0);
            
            if (currentValue > 0) {
              // Growth from zero should show as upward
              expect(result.direction).toBe('up');
              expect(result.percentage).toBe('100%');
            } else {
              // Both zero should be neutral
              expect(result.direction).toBe('neutral');
              expect(result.percentage).toBe('0%');
            }
          }
        ),
        testConfig
      );
    });

    it('handles edge case: equal values', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100000, noNaN: true }),
          (value) => {
            const result = calculateGrowthIndicator(value, value);
            
            // Equal values should always be neutral
            expect(result.direction).toBe('neutral');
            expect(result.percentage).toBe('0%');
            expect(result.percentageValue).toBe(0);
          }
        ),
        testConfig
      );
    });

    it('formats percentage with appropriate precision', () => {
      // Test small percentage (< 10%) - should have 1 decimal place
      const smallChange = calculateGrowthIndicator(105, 100);
      expect(smallChange.percentage).toMatch(/^\+5\.0%$/);
      
      // Test large percentage (>= 10%) - should have 0 decimal places
      const largeChange = calculateGrowthIndicator(150, 100);
      expect(largeChange.percentage).toMatch(/^\+50%$/);
      
      // Test negative small percentage
      const smallDecrease = calculateGrowthIndicator(95, 100);
      expect(smallDecrease.percentage).toMatch(/^-5\.0%$/);
      
      // Test negative large percentage
      const largeDecrease = calculateGrowthIndicator(50, 100);
      expect(largeDecrease.percentage).toMatch(/^-50%$/);
    });
  });
});
