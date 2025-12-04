/**
 * Unit tests for cost configuration module
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COST_CONFIG,
  calculateTotalCosts,
  shouldShowCostWarning,
  getCostBreakdown,
  getThresholdUsagePercentage,
  type CostConfig,
} from '../cost-config';

describe('Cost Configuration Module', () => {
  describe('DEFAULT_COST_CONFIG', () => {
    it('should have correct demo values', () => {
      expect(DEFAULT_COST_CONFIG.api_costs).toBe(127);
      expect(DEFAULT_COST_CONFIG.infrastructure_costs).toBe(50);
      expect(DEFAULT_COST_CONFIG.team_costs).toBe(0);
      expect(DEFAULT_COST_CONFIG.threshold).toBe(200);
    });

    it('should calculate correct total from default config', () => {
      const total = calculateTotalCosts(DEFAULT_COST_CONFIG);
      expect(total).toBe(177); // 127 + 50 + 0
    });
  });

  describe('shouldShowCostWarning', () => {
    it('should return true when costs exceed 90% of threshold', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 85,
        team_costs: 0,
        threshold: 200,
      };
      // Total: 185, Threshold: 200, 90% = 180
      expect(shouldShowCostWarning(config)).toBe(true);
    });

    it('should return false when costs are below 90% of threshold', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 0,
        threshold: 200,
      };
      // Total: 150, Threshold: 200, 90% = 180
      expect(shouldShowCostWarning(config)).toBe(false);
    });

    it('should support custom warning percentage', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 0,
        threshold: 200,
      };
      // Total: 150, Threshold: 200, 80% = 160
      expect(shouldShowCostWarning(config, 80)).toBe(false);
      // Total: 150, Threshold: 200, 70% = 140
      expect(shouldShowCostWarning(config, 70)).toBe(true);
    });

    it('should return false when threshold is zero', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 0,
        threshold: 0,
      };
      expect(shouldShowCostWarning(config)).toBe(false);
    });
  });

  describe('getCostBreakdown', () => {
    it('should return breakdown with correct percentages', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 50,
        threshold: 200,
      };
      const breakdown = getCostBreakdown(config);

      expect(breakdown).toHaveLength(3);
      expect(breakdown[0]).toEqual({
        category: 'API',
        amount: 100,
        percentage: 50,
      });
      expect(breakdown[1]).toEqual({
        category: 'Infrastructure',
        amount: 50,
        percentage: 25,
      });
      expect(breakdown[2]).toEqual({
        category: 'Team',
        amount: 50,
        percentage: 25,
      });
    });

    it('should handle zero total costs', () => {
      const config: CostConfig = {
        api_costs: 0,
        infrastructure_costs: 0,
        team_costs: 0,
        threshold: 200,
      };
      const breakdown = getCostBreakdown(config);

      expect(breakdown).toHaveLength(3);
      breakdown.forEach(item => {
        expect(item.amount).toBe(0);
        expect(item.percentage).toBe(0);
      });
    });
  });

  describe('getThresholdUsagePercentage', () => {
    it('should calculate correct usage percentage', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 0,
        threshold: 200,
      };
      // Total: 150, Threshold: 200, Usage: 75%
      expect(getThresholdUsagePercentage(config)).toBe(75);
    });

    it('should handle costs exceeding threshold', () => {
      const config: CostConfig = {
        api_costs: 150,
        infrastructure_costs: 100,
        team_costs: 0,
        threshold: 200,
      };
      // Total: 250, Threshold: 200, Usage: 125%
      expect(getThresholdUsagePercentage(config)).toBe(125);
    });

    it('should return 0 when threshold is zero', () => {
      const config: CostConfig = {
        api_costs: 100,
        infrastructure_costs: 50,
        team_costs: 0,
        threshold: 0,
      };
      expect(getThresholdUsagePercentage(config)).toBe(0);
    });
  });
});
