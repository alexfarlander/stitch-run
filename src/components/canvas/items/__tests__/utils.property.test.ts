/**
 * Property-based tests for production-side item utilities
 * Uses fast-check for property-based testing
 * Tests: Property 1 (Status indicator color consistency)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  getStatusColor, 
  type IntegrationStatus,
  type PersonStatus,
  type CodeStatus,
  type DataStatus,
  type ProductionItemStatus
} from '../utils';

// ============================================================================
// Test Configuration
// ============================================================================

const testConfig = { numRuns: 100 };

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid IntegrationStatus
 */
const integrationStatusArb = fc.constantFrom<IntegrationStatus>(
  'connected',
  'disconnected',
  'error'
);

/**
 * Generate a valid PersonStatus
 */
const personStatusArb = fc.constantFrom<PersonStatus>(
  'online',
  'offline',
  'busy'
);

/**
 * Generate a valid CodeStatus
 */
const codeStatusArb = fc.constantFrom<CodeStatus>(
  'deployed',
  'building',
  'failed'
);

/**
 * Generate a valid DataStatus
 */
const dataStatusArb = fc.constantFrom<DataStatus>(
  'operational',
  'error'
);

/**
 * Generate any valid ProductionItemStatus
 */
const productionItemStatusArb = fc.oneof(
  integrationStatusArb,
  personStatusArb,
  codeStatusArb,
  dataStatusArb
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Production-side Item Utilities Property Tests', () => {
  describe('Property 1: Status indicator color consistency', () => {
    it('**Feature: production-side-items, Property 1: Status indicator color consistency**', () => {
      fc.assert(
        fc.property(
          productionItemStatusArb,
          (status) => {
            // Get the color class for this status
            const colorClass = getStatusColor(status);
            
            // Verify it returns a valid Tailwind color class
            expect(colorClass).toMatch(/^bg-(green|red|gray|yellow|blue)-\d{3}$/);
            
            // Verify color mapping follows the defined conventions
            const successStates: ProductionItemStatus[] = [
              'connected', 'online', 'deployed', 'operational'
            ];
            const errorStates: ProductionItemStatus[] = [
              'error', 'failed'
            ];
            const inactiveStates: ProductionItemStatus[] = [
              'disconnected', 'offline'
            ];
            const intermediateStates: ProductionItemStatus[] = [
              'busy', 'building'
            ];
            
            if (successStates.includes(status)) {
              // Success states should be green
              expect(colorClass).toBe('bg-green-500');
            } else if (errorStates.includes(status)) {
              // Error states should be red
              expect(colorClass).toBe('bg-red-500');
            } else if (inactiveStates.includes(status)) {
              // Inactive states should be gray
              expect(colorClass).toBe('bg-gray-500');
            } else if (intermediateStates.includes(status)) {
              // Intermediate states should be yellow or blue
              expect(['bg-yellow-500', 'bg-blue-500']).toContain(colorClass);
            }
          }
        ),
        testConfig
      );
    });

    it('should map integration statuses correctly', () => {
      fc.assert(
        fc.property(
          integrationStatusArb,
          (status) => {
            const colorClass = getStatusColor(status);
            
            switch (status) {
              case 'connected':
                expect(colorClass).toBe('bg-green-500');
                break;
              case 'disconnected':
                expect(colorClass).toBe('bg-gray-500');
                break;
              case 'error':
                expect(colorClass).toBe('bg-red-500');
                break;
            }
          }
        ),
        testConfig
      );
    });

    it('should map person statuses correctly', () => {
      fc.assert(
        fc.property(
          personStatusArb,
          (status) => {
            const colorClass = getStatusColor(status);
            
            switch (status) {
              case 'online':
                expect(colorClass).toBe('bg-green-500');
                break;
              case 'offline':
                expect(colorClass).toBe('bg-gray-500');
                break;
              case 'busy':
                expect(colorClass).toBe('bg-yellow-500');
                break;
            }
          }
        ),
        testConfig
      );
    });

    it('should map code statuses correctly', () => {
      fc.assert(
        fc.property(
          codeStatusArb,
          (status) => {
            const colorClass = getStatusColor(status);
            
            switch (status) {
              case 'deployed':
                expect(colorClass).toBe('bg-green-500');
                break;
              case 'building':
                expect(colorClass).toBe('bg-blue-500');
                break;
              case 'failed':
                expect(colorClass).toBe('bg-red-500');
                break;
            }
          }
        ),
        testConfig
      );
    });

    it('should map data statuses correctly', () => {
      fc.assert(
        fc.property(
          dataStatusArb,
          (status) => {
            const colorClass = getStatusColor(status);
            
            switch (status) {
              case 'operational':
                expect(colorClass).toBe('bg-green-500');
                break;
              case 'error':
                expect(colorClass).toBe('bg-red-500');
                break;
            }
          }
        ),
        testConfig
      );
    });
  });
});
