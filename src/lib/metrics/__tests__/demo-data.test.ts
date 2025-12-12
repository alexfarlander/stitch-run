/**
 * Unit tests for demo data generation utilities
 */

import { describe, it, expect } from 'vitest';
import { generateTrendData, generateForecast } from '../calculations';

describe('Demo Data Generation', () => {
  describe('generateTrendData', () => {
    it('should generate the correct number of data points', () => {
      const data = generateTrendData(1000, 6, 0.10);
      expect(data).toHaveLength(6);
    });

    it('should generate data points with period and value', () => {
      const data = generateTrendData(1000, 6, 0.10);
      
      data.forEach(point => {
        expect(point).toHaveProperty('period');
        expect(point).toHaveProperty('value');
        expect(typeof point.period).toBe('string');
        expect(typeof point.value).toBe('number');
      });
    });

    it('should generate non-negative values', () => {
      const data = generateTrendData(1000, 12, 0.10);
      
      data.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show growth with positive growth rate', () => {
      const data = generateTrendData(1000, 12, 0.10);
      
      // First value should be around base value (with some randomness)
      expect(data[0].value).toBeGreaterThan(800);
      expect(data[0].value).toBeLessThan(1200);
      
      // Last value should be higher than first (on average)
      // With 10% growth over 12 periods, we expect roughly 3x growth
      // But with randomness, let's just check it's generally higher
      const avgFirstHalf = data.slice(0, 6).reduce((sum, p) => sum + p.value, 0) / 6;
      const avgSecondHalf = data.slice(6).reduce((sum, p) => sum + p.value, 0) / 6;
      
      expect(avgSecondHalf).toBeGreaterThan(avgFirstHalf);
    });

    it('should handle zero growth rate', () => {
      const data = generateTrendData(1000, 6, 0);
      
      // Values should stay relatively stable (within randomness range)
      data.forEach(point => {
        expect(point.value).toBeGreaterThan(900);
        expect(point.value).toBeLessThan(1100);
      });
    });

    it('should use month names for periods', () => {
      const data = generateTrendData(1000, 12, 0.10);
      const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      data.forEach(point => {
        expect(validMonths).toContain(point.period);
      });
    });
  });

  describe('generateForecast', () => {
    it('should generate the correct number of forecast points', () => {
      const historical = generateTrendData(1000, 6, 0.10);
      const forecast = generateForecast(historical, 3);
      
      expect(forecast).toHaveLength(3);
    });

    it('should return empty array for insufficient historical data', () => {
      const historical = [{ period: 'Jan', value: 1000 }];
      const forecast = generateForecast(historical, 3);
      
      expect(forecast).toHaveLength(0);
    });

    it('should generate forecast points with period and value', () => {
      const historical = generateTrendData(1000, 6, 0.10);
      const forecast = generateForecast(historical, 3);
      
      forecast.forEach(point => {
        expect(point).toHaveProperty('period');
        expect(point).toHaveProperty('value');
        expect(typeof point.period).toBe('string');
        expect(typeof point.value).toBe('number');
      });
    });

    it('should generate non-negative forecast values', () => {
      const historical = generateTrendData(1000, 6, 0.10);
      const forecast = generateForecast(historical, 3);
      
      forecast.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should continue growth trend from historical data', () => {
      const historical = generateTrendData(1000, 6, 0.15);
      const forecast = generateForecast(historical, 3);
      
      // Last historical value
      const lastHistorical = historical[historical.length - 1].value;
      
      // First forecast value should be higher (with positive growth)
      expect(forecast[0].value).toBeGreaterThan(lastHistorical * 0.9); // Allow some variance
    });

    it('should use month names for forecast periods', () => {
      const historical = generateTrendData(1000, 6, 0.10);
      const forecast = generateForecast(historical, 3);
      const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      forecast.forEach(point => {
        expect(validMonths).toContain(point.period);
      });
    });

    it('should handle declining trend', () => {
      const historical = generateTrendData(1000, 6, -0.05);
      const forecast = generateForecast(historical, 3);
      
      // Should generate forecast even with negative growth
      expect(forecast.length).toBe(3);
      
      // Values should be non-negative
      forecast.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Integration: Trend and Forecast', () => {
    it('should create a complete time series with historical and forecast', () => {
      const historical = generateTrendData(1000, 6, 0.10);
      const forecast = generateForecast(historical, 3);
      
      const complete = [...historical, ...forecast];
      
      expect(complete).toHaveLength(9);
      
      // All should have valid structure
      complete.forEach(point => {
        expect(point).toHaveProperty('period');
        expect(point).toHaveProperty('value');
        expect(point.value).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
