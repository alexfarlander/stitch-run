/**
 * Property-Based Tests for AI Manager Action Executor
 * 
 * Feature: ai-manager, Property 25: AI Manager responses are valid JSON
 * Validates: Requirements 8.1, 8.5
 * 
 * Tests that AI Manager responses are always valid, parseable JSON with
 * correct structure regardless of input variations.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseLLMResponse,
  parseAndValidateResponse,
  isValidAction,
  validateResponse,
  ActionExecutorError,
  AIManagerAction,
} from '../action-executor';
import { VisualGraph } from '@/types/canvas-schema';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid action types
 */
const actionArbitrary = fc.constantFrom<AIManagerAction>(
  'CREATE_WORKFLOW',
  'MODIFY_WORKFLOW',
  'RUN_WORKFLOW',
  'GET_STATUS'
);

/**
 * Generate valid canvas structure
 */
const canvasArbitrary: fc.Arbitrary<VisualGraph> = fc.record({
  nodes: fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.constantFrom('worker', 'ux', 'splitter', 'collector'),
      position: fc.record({
        x: fc.integer({ min: 0, max: 1000 }),
        y: fc.integer({ min: 0, max: 1000 }),
      }),
      data: fc.record({
        label: fc.string({ minLength: 1, maxLength: 50 }),
      }),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  edges: fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      source: fc.string({ minLength: 1, maxLength: 20 }),
      target: fc.string({ minLength: 1, maxLength: 20 }),
    }),
    { maxLength: 5 }
  ),
});

/**
 * Generate CREATE_WORKFLOW payload
 */
const createWorkflowPayloadArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  canvas: canvasArbitrary,
  mermaid: fc.option(fc.string(), { nil: undefined }),
});

/**
 * Generate MODIFY_WORKFLOW payload
 */
const modifyWorkflowPayloadArbitrary = fc.record({
  canvasId: fc.uuid(),
  canvas: canvasArbitrary,
  changes: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
});

/**
 * Generate RUN_WORKFLOW payload
 */
const runWorkflowPayloadArbitrary = fc.record({
  canvasId: fc.uuid(),
  input: fc.dictionary(fc.string(), fc.anything()),
});

/**
 * Generate GET_STATUS payload
 */
const getStatusPayloadArbitrary = fc.record({
  runId: fc.uuid(),
});

/**
 * Generate valid AI Manager response based on action type
 */
const aiManagerResponseArbitrary = fc
  .tuple(actionArbitrary, fc.nat(3))
  .chain(([action, payloadType]) => {
    let payloadArb;
    
    switch (action) {
      case 'CREATE_WORKFLOW':
        payloadArb = createWorkflowPayloadArbitrary;
        break;
      case 'MODIFY_WORKFLOW':
        payloadArb = modifyWorkflowPayloadArbitrary;
        break;
      case 'RUN_WORKFLOW':
        payloadArb = runWorkflowPayloadArbitrary;
        break;
      case 'GET_STATUS':
        payloadArb = getStatusPayloadArbitrary;
        break;
      default:
        payloadArb = fc.record({});
    }
    
    return fc.record({
      action: fc.constant(action),
      payload: payloadArb,
      error: fc.option(fc.string(), { nil: undefined }),
    });
  });

/**
 * Generate LLM response text in various formats
 * LLMs can return JSON in different ways:
 * - Plain JSON
 * - JSON wrapped in markdown code blocks
 * - JSON with extra text before/after
 */
const llmResponseTextArbitrary = aiManagerResponseArbitrary.chain((response) => {
  const jsonString = JSON.stringify(response, null, 2);
  
  return fc.constantFrom(
    // Plain JSON
    jsonString,
    
    // JSON in markdown code block
    `\`\`\`json\n${jsonString}\n\`\`\``,
    
    // JSON in code block without language
    `\`\`\`\n${jsonString}\n\`\`\``,
    
    // JSON with text before
    `Here's the response:\n\n${jsonString}`,
    
    // JSON with text after
    `${jsonString}\n\nLet me know if you need anything else!`,
    
    // JSON in code block with text around
    `Here's what I generated:\n\n\`\`\`json\n${jsonString}\n\`\`\`\n\nThis should work for your use case.`
  );
});

// ============================================================================
// Property Tests
// ============================================================================

describe('AI Manager Action Executor - Property Tests', () => {
  /**
   * Property 25: AI Manager responses are valid JSON
   * 
   * For any valid AI Manager response, when serialized to JSON and parsed back,
   * the result should be valid and parseable.
   * 
   * Validates: Requirements 8.1, 8.5
   */
  describe('Property 25: AI Manager responses are valid JSON', () => {
    it('should parse valid JSON responses in any format', () => {
      fc.assert(
        fc.property(llmResponseTextArbitrary, (llmText) => {
          // Should not throw
          const parsed = parseLLMResponse(llmText);
          
          // Should be an object
          expect(parsed).toBeDefined();
          expect(typeof parsed).toBe('object');
          expect(parsed).not.toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('should validate responses have required action field', () => {
      fc.assert(
        fc.property(aiManagerResponseArbitrary, (response) => {
          // Should not throw for valid responses
          expect(() => validateResponse(response)).not.toThrow();
          
          // Should have action field
          expect(response).toHaveProperty('action');
          expect(isValidAction(response.action)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate responses have required payload field', () => {
      fc.assert(
        fc.property(aiManagerResponseArbitrary, (response) => {
          // Should not throw for valid responses
          expect(() => validateResponse(response)).not.toThrow();
          
          // Should have payload field
          expect(response).toHaveProperty('payload');
          expect(response.payload).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject responses without action field', () => {
      fc.assert(
        fc.property(
          fc.record({
            payload: fc.anything(),
          }),
          (invalidResponse) => {
            // Should throw for responses without action
            expect(() => validateResponse(invalidResponse)).toThrow(ActionExecutorError);
            expect(() => validateResponse(invalidResponse)).toThrow(/missing required "action" field/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject responses without payload field', () => {
      fc.assert(
        fc.property(
          fc.record({
            action: actionArbitrary,
          }),
          (invalidResponse) => {
            // Should throw for responses without payload
            expect(() => validateResponse(invalidResponse)).toThrow(ActionExecutorError);
            expect(() => validateResponse(invalidResponse)).toThrow(/missing required "payload" field/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject responses with invalid action types', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !isValidAction(s)),
          fc.anything(),
          (invalidAction, payload) => {
            const invalidResponse = {
              action: invalidAction,
              payload,
            };
            
            // Should throw for invalid action types
            expect(() => validateResponse(invalidResponse)).toThrow(ActionExecutorError);
            expect(() => validateResponse(invalidResponse)).toThrow(/Invalid action type/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse and validate complete responses end-to-end', () => {
      fc.assert(
        fc.property(llmResponseTextArbitrary, (llmText) => {
          // Should successfully parse and validate
          const validated = parseAndValidateResponse(llmText);
          
          // Should have correct structure
          expect(validated).toHaveProperty('action');
          expect(validated).toHaveProperty('payload');
          expect(isValidAction(validated.action)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject non-JSON text', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            // Filter out strings that contain any valid JSON
            // Check direct parse
            try {
              JSON.parse(s);
              return false;
            } catch {
              // Check for JSON in code blocks
              const codeBlockMatch = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
              if (codeBlockMatch) {
                try {
                  JSON.parse(codeBlockMatch[1]);
                  return false;
                } catch {
                  // Continue checking
                }
              }
              
              // Check for JSON object anywhere in text
              const jsonMatch = s.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  JSON.parse(jsonMatch[0]);
                  return false;
                } catch {
                  // Continue checking
                }
              }
              
              // No valid JSON found, this is a good test case
              return true;
            }
          }),
          (nonJsonText) => {
            // Should throw for non-JSON text
            // Error message can vary depending on what was found
            expect(() => parseLLMResponse(nonJsonText)).toThrow(ActionExecutorError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate CREATE_WORKFLOW payloads have required fields', () => {
      fc.assert(
        fc.property(createWorkflowPayloadArbitrary, (payload) => {
          const response = {
            action: 'CREATE_WORKFLOW' as const,
            payload,
          };
          
          // Should not throw for valid CREATE_WORKFLOW payloads
          expect(() => parseAndValidateResponse(JSON.stringify(response))).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should validate MODIFY_WORKFLOW payloads have required fields', () => {
      fc.assert(
        fc.property(modifyWorkflowPayloadArbitrary, (payload) => {
          const response = {
            action: 'MODIFY_WORKFLOW' as const,
            payload,
          };
          
          // Should not throw for valid MODIFY_WORKFLOW payloads
          expect(() => parseAndValidateResponse(JSON.stringify(response))).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should validate RUN_WORKFLOW payloads have required fields', () => {
      fc.assert(
        fc.property(runWorkflowPayloadArbitrary, (payload) => {
          const response = {
            action: 'RUN_WORKFLOW' as const,
            payload,
          };
          
          // Should not throw for valid RUN_WORKFLOW payloads
          expect(() => parseAndValidateResponse(JSON.stringify(response))).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should validate GET_STATUS payloads have required fields', () => {
      fc.assert(
        fc.property(getStatusPayloadArbitrary, (payload) => {
          const response = {
            action: 'GET_STATUS' as const,
            payload,
          };
          
          // Should not throw for valid GET_STATUS payloads
          expect(() => parseAndValidateResponse(JSON.stringify(response))).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject CREATE_WORKFLOW payloads without canvas', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            // Missing canvas
          }),
          (invalidPayload) => {
            const response = {
              action: 'CREATE_WORKFLOW' as const,
              payload: invalidPayload,
            };
            
            // Should throw for missing canvas
            expect(() => parseAndValidateResponse(JSON.stringify(response))).toThrow(ActionExecutorError);
            expect(() => parseAndValidateResponse(JSON.stringify(response))).toThrow(/missing required "canvas" field/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject RUN_WORKFLOW payloads without input', () => {
      fc.assert(
        fc.property(
          fc.record({
            canvasId: fc.uuid(),
            // Missing input
          }),
          (invalidPayload) => {
            const response = {
              action: 'RUN_WORKFLOW' as const,
              payload: invalidPayload,
            };
            
            // Should throw for missing input
            expect(() => parseAndValidateResponse(JSON.stringify(response))).toThrow(ActionExecutorError);
            expect(() => parseAndValidateResponse(JSON.stringify(response))).toThrow(/missing required "input" field/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
