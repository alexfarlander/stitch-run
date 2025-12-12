/**
 * AI Manager Action Executor
 * 
 * Parses LLM JSON responses and routes to appropriate handlers.
 * Validates action types and handles parsing errors gracefully.
 * 
 * Requirements: 8.1, 8.5
 */

import { VisualGraph } from '@/types/canvas-schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * AI Manager action types
 * Requirement 8.1: AI Manager SHALL return JSON response with action type and payload
 */
export type AIManagerAction = 
  | 'CREATE_WORKFLOW' 
  | 'MODIFY_WORKFLOW' 
  | 'RUN_WORKFLOW' 
  | 'GET_STATUS';

/**
 * Valid action types for validation
 */
const VALID_ACTIONS: AIManagerAction[] = [
  'CREATE_WORKFLOW',
  'MODIFY_WORKFLOW',
  'RUN_WORKFLOW',
  'GET_STATUS',
];

// ============================================================================
// Response Types
// ============================================================================

/**
 * Base AI Manager response structure
 * Requirement 8.1: AI Manager SHALL return JSON response with action type and payload
 */
export interface AIManagerResponse {
  action: AIManagerAction;
  payload: unknown;
  error?: string;
}

/**
 * CREATE_WORKFLOW action payload
 * Requirement 8.2: CREATE_WORKFLOW response SHALL include complete canvas structure
 */
export interface CreateWorkflowPayload {
  name: string;
  canvas: VisualGraph;
  mermaid?: string;  // Optional Mermaid representation
}

/**
 * MODIFY_WORKFLOW action payload
 */
export interface ModifyWorkflowPayload {
  canvasId: string;
  canvas: VisualGraph;
  changes: string[];  // Description of changes made
}

/**
 * RUN_WORKFLOW action payload
 * Requirement 8.3: RUN_WORKFLOW response SHALL include run identifier
 */
export interface RunWorkflowPayload {
  canvasId: string;
  input: Record<string, unknown>;
}

/**
 * GET_STATUS action payload
 */
export interface GetStatusPayload {
  runId: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Action executor error
 */
export class ActionExecutorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ActionExecutorError';
  }
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse LLM response text to JSON
 * Handles common LLM response formats (markdown code blocks, plain JSON)
 * 
 * Requirement 8.5: AI Manager SHALL return valid, parseable JSON
 * 
 * @param responseText - Raw LLM response text
 * @returns Parsed JSON object
 * @throws ActionExecutorError if parsing fails
 */
export function parseLLMResponse(responseText: string): any {
  try {
    // Try direct JSON parse first
    return JSON.parse(responseText);
  } catch (directParseError) {
    // LLMs often wrap JSON in markdown code blocks
    // Try to extract JSON from code blocks
    const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (codeBlockError) {
        throw new ActionExecutorError(
          'Failed to parse JSON from code block',
          'PARSE_ERROR',
          { 
            originalError: codeBlockError,
            extractedText: codeBlockMatch[1].substring(0, 200)
          }
        );
      }
    }
    
    // Try to find JSON object in the text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (jsonMatchError) {
        throw new ActionExecutorError(
          'Failed to parse extracted JSON object',
          'PARSE_ERROR',
          { 
            originalError: jsonMatchError,
            extractedText: jsonMatch[0].substring(0, 200)
          }
        );
      }
    }
    
    // No valid JSON found
    throw new ActionExecutorError(
      'No valid JSON found in LLM response',
      'PARSE_ERROR',
      { 
        responsePreview: responseText.substring(0, 200)
      }
    );
  }
}

/**
 * Validate action type
 * 
 * Requirement 8.1: Validate action type against allowed values
 * 
 * @param action - Action string to validate
 * @returns True if valid action type
 */
export function isValidAction(action: string): action is AIManagerAction {
  return VALID_ACTIONS.includes(action as AIManagerAction);
}

/**
 * Validate AI Manager response structure
 * 
 * Requirements:
 * - 8.1: AI Manager SHALL return JSON response with action type and payload
 * - 8.5: JSON SHALL be valid and parseable
 * 
 * @param response - Parsed response object
 * @throws ActionExecutorError if validation fails
 */
export function validateResponse(response: unknown): asserts response is AIManagerResponse {
  // Check if response is an object
  if (!isRecord(response)) {
    throw new ActionExecutorError(
      'Response must be a JSON object',
      'VALIDATION_ERROR',
      { receivedType: typeof response }
    );
  }
  const r = response;
  
  // Check for action field
  if (!('action' in r)) {
    throw new ActionExecutorError(
      'Response missing required "action" field',
      'VALIDATION_ERROR',
      { receivedFields: Object.keys(r) }
    );
  }
  
  // Validate action type
  const action = r['action'];
  if (typeof action !== 'string' || !isValidAction(action)) {
    throw new ActionExecutorError(
      `Invalid action type: ${String(action)}`,
      'VALIDATION_ERROR',
      { 
        receivedAction: action,
        validActions: VALID_ACTIONS
      }
    );
  }
  
  // Check for payload field
  if (!('payload' in r)) {
    throw new ActionExecutorError(
      'Response missing required "payload" field',
      'VALIDATION_ERROR',
      { receivedFields: Object.keys(r) }
    );
  }
}

/**
 * Validate CREATE_WORKFLOW payload
 * 
 * Requirement 8.2: CREATE_WORKFLOW response SHALL include complete canvas structure
 * 
 * @param payload - Payload to validate
 * @throws ActionExecutorError if validation fails
 */
export function validateCreateWorkflowPayload(payload: unknown): asserts payload is CreateWorkflowPayload {
  if (!isRecord(payload)) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW payload must be an object',
      'VALIDATION_ERROR'
    );
  }
  const p = payload;
  
  if (typeof p['name'] !== 'string' || p['name'].trim() === '') {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW payload missing required "name" field',
      'VALIDATION_ERROR'
    );
  }
  
  const canvas = p['canvas'];
  if (!isRecord(canvas)) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW payload missing required "canvas" field',
      'VALIDATION_ERROR'
    );
  }
  
  // Validate canvas structure
  if (!Array.isArray(canvas['nodes'])) {
    throw new ActionExecutorError(
      'Canvas must have "nodes" array',
      'VALIDATION_ERROR'
    );
  }
  
  if (!Array.isArray(canvas['edges'])) {
    throw new ActionExecutorError(
      'Canvas must have "edges" array',
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validate MODIFY_WORKFLOW payload
 * 
 * @param payload - Payload to validate
 * @throws ActionExecutorError if validation fails
 */
export function validateModifyWorkflowPayload(payload: unknown): asserts payload is ModifyWorkflowPayload {
  if (!isRecord(payload)) {
    throw new ActionExecutorError(
      'MODIFY_WORKFLOW payload must be an object',
      'VALIDATION_ERROR'
    );
  }
  const p = payload;
  
  if (typeof p['canvasId'] !== 'string' || p['canvasId'].trim() === '') {
    throw new ActionExecutorError(
      'MODIFY_WORKFLOW payload missing required "canvasId" field',
      'VALIDATION_ERROR'
    );
  }
  
  const canvas = p['canvas'];
  if (!isRecord(canvas)) {
    throw new ActionExecutorError(
      'MODIFY_WORKFLOW payload missing required "canvas" field',
      'VALIDATION_ERROR'
    );
  }
  
  // Validate canvas structure
  if (!Array.isArray(canvas['nodes'])) {
    throw new ActionExecutorError(
      'Canvas must have "nodes" array',
      'VALIDATION_ERROR'
    );
  }
  
  if (!Array.isArray(canvas['edges'])) {
    throw new ActionExecutorError(
      'Canvas must have "edges" array',
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validate RUN_WORKFLOW payload
 * 
 * Requirement 8.3: RUN_WORKFLOW response SHALL include run identifier
 * 
 * @param payload - Payload to validate
 * @throws ActionExecutorError if validation fails
 */
export function validateRunWorkflowPayload(payload: unknown): asserts payload is RunWorkflowPayload {
  if (!isRecord(payload)) {
    throw new ActionExecutorError(
      'RUN_WORKFLOW payload must be an object',
      'VALIDATION_ERROR'
    );
  }
  const p = payload;
  
  if (typeof p['canvasId'] !== 'string' || p['canvasId'].trim() === '') {
    throw new ActionExecutorError(
      'RUN_WORKFLOW payload missing required "canvasId" field',
      'VALIDATION_ERROR'
    );
  }
  
  const input = p['input'];
  if (!isRecord(input)) {
    throw new ActionExecutorError(
      'RUN_WORKFLOW payload missing required "input" field',
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validate GET_STATUS payload
 * 
 * @param payload - Payload to validate
 * @throws ActionExecutorError if validation fails
 */
export function validateGetStatusPayload(payload: unknown): asserts payload is GetStatusPayload {
  if (!isRecord(payload)) {
    throw new ActionExecutorError(
      'GET_STATUS payload must be an object',
      'VALIDATION_ERROR'
    );
  }
  const p = payload;
  
  if (typeof p['runId'] !== 'string' || p['runId'].trim() === '') {
    throw new ActionExecutorError(
      'GET_STATUS payload missing required "runId" field',
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validate payload based on action type
 * 
 * @param action - Action type
 * @param payload - Payload to validate
 * @throws ActionExecutorError if validation fails
 */
export function validatePayload(action: AIManagerAction, payload: unknown): void {
  switch (action) {
    case 'CREATE_WORKFLOW':
      validateCreateWorkflowPayload(payload);
      break;
    case 'MODIFY_WORKFLOW':
      validateModifyWorkflowPayload(payload);
      break;
    case 'RUN_WORKFLOW':
      validateRunWorkflowPayload(payload);
      break;
    case 'GET_STATUS':
      validateGetStatusPayload(payload);
      break;
    default:
      // TypeScript should prevent this, but handle it anyway
      throw new ActionExecutorError(
        `Unknown action type: ${action}`,
        'VALIDATION_ERROR'
      );
  }
}

// ============================================================================
// Main Executor Function
// ============================================================================

/**
 * Parse and validate LLM response
 * 
 * This is the main entry point for the action executor.
 * It handles all parsing and validation, returning a validated response
 * or throwing an error with details.
 * 
 * Requirements:
 * - 8.1: Parse LLM JSON response and validate action type
 * - 8.5: Handle parsing errors gracefully
 * 
 * @param llmResponseText - Raw LLM response text
 * @returns Validated AI Manager response
 * @throws ActionExecutorError if parsing or validation fails
 */
export function parseAndValidateResponse(llmResponseText: string): AIManagerResponse {
  // Step 1: Parse JSON from LLM response
  const parsed = parseLLMResponse(llmResponseText);
  
  // Step 2: Validate response structure
  validateResponse(parsed);
  
  // Step 3: Validate payload based on action type
  validatePayload(parsed.action, parsed.payload);
  
  // Return validated response
  return parsed as AIManagerResponse;
}

/**
 * Validate CREATE_WORKFLOW response format
 * 
 * Requirement 8.2: CREATE_WORKFLOW response SHALL include complete canvas structure
 * 
 * @param result - Result from CREATE_WORKFLOW handler
 * @throws ActionExecutorError if validation fails
 */
export function validateCreateWorkflowResponse(result: unknown): void {
  if (!isRecord(result)) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW response must be an object',
      'VALIDATION_ERROR'
    );
  }
  const r = result;
  
  const canvas = r['canvas'];
  if (!isRecord(canvas)) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW response missing required "canvas" field',
      'VALIDATION_ERROR',
      { receivedFields: Object.keys(r) }
    );
  }
  
  // Validate canvas structure
  if (!Array.isArray(canvas['nodes'])) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW response canvas must have "nodes" array',
      'VALIDATION_ERROR'
    );
  }
  
  if (!Array.isArray(canvas['edges'])) {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW response canvas must have "edges" array',
      'VALIDATION_ERROR'
    );
  }
  
  // Validate canvasId is present
  if (typeof r['canvasId'] !== 'string' || r['canvasId'].trim() === '') {
    throw new ActionExecutorError(
      'CREATE_WORKFLOW response missing required "canvasId" field',
      'VALIDATION_ERROR',
      { receivedFields: Object.keys(r) }
    );
  }
}

/**
 * Validate RUN_WORKFLOW response format
 * 
 * Requirement 8.3: RUN_WORKFLOW response SHALL include run identifier
 * 
 * @param result - Result from RUN_WORKFLOW handler
 * @throws ActionExecutorError if validation fails
 */
export function validateRunWorkflowResponse(result: unknown): void {
  if (!isRecord(result)) {
    throw new ActionExecutorError(
      'RUN_WORKFLOW response must be an object',
      'VALIDATION_ERROR'
    );
  }
  const r = result;
  
  if (typeof r['runId'] !== 'string' || r['runId'].trim() === '') {
    throw new ActionExecutorError(
      'RUN_WORKFLOW response missing required "runId" field',
      'VALIDATION_ERROR',
      { receivedFields: Object.keys(r) }
    );
  }
}

/**
 * Validate response format based on action type
 * 
 * Requirements:
 * - 8.2: CREATE_WORKFLOW response SHALL include complete canvas structure
 * - 8.3: RUN_WORKFLOW response SHALL include run identifier
 * - 8.5: All responses SHALL be valid JSON
 * 
 * @param action - Action type
 * @param result - Result from handler
 * @throws ActionExecutorError if validation fails
 */
export function validateResponseFormat(action: AIManagerAction, result: unknown): void {
  // Requirement 8.5: Validate result is valid JSON-serializable
  // Try to serialize and deserialize to ensure it's valid JSON
  try {
    JSON.parse(JSON.stringify(result));
  } catch (error) {
    throw new ActionExecutorError(
      'Response is not valid JSON-serializable',
      'VALIDATION_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
  
  // Validate specific response formats based on action type
  switch (action) {
    case 'CREATE_WORKFLOW':
      validateCreateWorkflowResponse(result);
      break;
    case 'RUN_WORKFLOW':
      validateRunWorkflowResponse(result);
      break;
    case 'MODIFY_WORKFLOW':
      // MODIFY_WORKFLOW should also include canvas
      validateCreateWorkflowResponse(result);
      break;
    case 'GET_STATUS':
      // GET_STATUS has flexible response format, just ensure it's an object
      if (!result || typeof result !== 'object') {
        throw new ActionExecutorError(
          'GET_STATUS response must be an object',
          'VALIDATION_ERROR'
        );
      }
      break;
    default:
      // TypeScript should prevent this, but handle it anyway
      throw new ActionExecutorError(
        `Unknown action type for response validation: ${action}`,
        'VALIDATION_ERROR'
      );
  }
}

/**
 * Execute AI Manager action
 * 
 * This function routes the validated response to the appropriate handler.
 * Handlers are provided by the caller (e.g., API route handlers).
 * 
 * @param response - Validated AI Manager response
 * @param handlers - Action handlers
 * @returns Result from the appropriate handler
 */
export async function executeAction<T>(
  response: AIManagerResponse,
  handlers: {
    createWorkflow: (payload: CreateWorkflowPayload) => Promise<T>;
    modifyWorkflow: (payload: ModifyWorkflowPayload) => Promise<T>;
    runWorkflow: (payload: RunWorkflowPayload) => Promise<T>;
    getStatus: (payload: GetStatusPayload) => Promise<T>;
  }
): Promise<T> {
  let result: T;
  
  switch (response.action) {
    case 'CREATE_WORKFLOW':
      result = await handlers.createWorkflow(response.payload as CreateWorkflowPayload);
      break;
    
    case 'MODIFY_WORKFLOW':
      result = await handlers.modifyWorkflow(response.payload as ModifyWorkflowPayload);
      break;
    
    case 'RUN_WORKFLOW':
      result = await handlers.runWorkflow(response.payload as RunWorkflowPayload);
      break;
    
    case 'GET_STATUS':
      result = await handlers.getStatus(response.payload as GetStatusPayload);
      break;
    
    default:
      // TypeScript should prevent this, but handle it anyway
      throw new ActionExecutorError(
        `Unknown action type: ${(response as any).action}`,
        'VALIDATION_ERROR'
      );
  }
  
  // Validate response format before returning
  validateResponseFormat(response.action, result);
  
  return result;
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * CREATE_WORKFLOW action handler
 * 
 * Validates and stores AI-generated workflows in the database.
 * 
 * Requirements:
 * - 4.1: Validate generated canvas structure
 * - 4.5: Check all nodes have required properties
 * - 7.3: Check for valid worker types
 * - 7.4: Verify worker configuration
 * - 10.1, 10.2, 10.3: Verify entity movement configuration on worker nodes
 * 
 * @param payload - CREATE_WORKFLOW payload with canvas
 * @returns Created canvas ID and full canvas
 * @throws ActionExecutorError if validation fails
 */
export async function handleCreateWorkflow(
  payload: CreateWorkflowPayload
): Promise<{ canvasId: string; canvas: VisualGraph }> {
  const { validateGraph } = await import('@/lib/canvas/validate-graph');
  const { isValidWorkerType } = await import('@/lib/workers/registry');
  const { createFlowWithVersion } = await import('@/lib/db/flows');
  
  // Step 1: Build node ID set for O(1) lookups (performance optimization)
  const nodeIds = new Set(payload.canvas.nodes.map(n => n.id));
  
  // Step 2: Validate all nodes have required properties FIRST (Requirement 4.5)
  // This must happen before validateGraph because validateGraph assumes valid structure
  for (const node of payload.canvas.nodes) {
    // Check required node properties
    if (!node.id || typeof node.id !== 'string') {
      throw new ActionExecutorError(
        `Node missing required "id" property`,
        'VALIDATION_ERROR',
        { node }
      );
    }
    
    if (!node.type || typeof node.type !== 'string') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "type" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    if (!node.data || typeof node.data !== 'object') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "data" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    if (!node.data.label || typeof node.data.label !== 'string') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "data.label" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    // Validate worker nodes specifically
    if (node.type === 'worker') {
      // Requirement 7.3: Check for valid worker types
      if (!node.data.worker_type) {
        throw new ActionExecutorError(
          `Worker node "${node.id}" missing required "worker_type" property`,
          'VALIDATION_ERROR',
          { nodeId: node.id }
        );
      }
      
      if (!isValidWorkerType(node.data.worker_type)) {
        throw new ActionExecutorError(
          `Worker node "${node.id}" has invalid worker type: "${node.data.worker_type}"`,
          'VALIDATION_ERROR',
          { nodeId: node.id, workerType: node.data.worker_type }
        );
      }
      
      // Requirement 7.4: Verify worker configuration exists
      // Note: We don't validate specific config fields here as they vary by worker
      // The worker registry and runtime will handle that
      if (node.data.config && typeof node.data.config !== 'object') {
        throw new ActionExecutorError(
          `Worker node "${node.id}" has invalid "config" property (must be object)`,
          'VALIDATION_ERROR',
          { nodeId: node.id }
        );
      }
      
      // Requirements 10.1, 10.2, 10.3: Verify entity movement configuration
      if (node.data.entityMovement) {
        const entityMovement = node.data.entityMovement;
        
        // Validate entityMovement structure
        if (typeof entityMovement !== 'object') {
          throw new ActionExecutorError(
            `Worker node "${node.id}" has invalid "entityMovement" property (must be object)`,
            'VALIDATION_ERROR',
            { nodeId: node.id }
          );
        }
        
        // Validate onSuccess if present
        if (entityMovement.onSuccess) {
          validateEntityMovementAction(node.id, 'onSuccess', entityMovement.onSuccess, nodeIds);
        }
        
        // Validate onFailure if present
        if (entityMovement.onFailure) {
          validateEntityMovementAction(node.id, 'onFailure', entityMovement.onFailure, nodeIds);
        }
      }
    }
  }
  
  // Step 3: Validate all edges reference existing nodes (Requirement 4.5)
  // Note: nodeIds Set was already created in Step 1 for performance
  
  for (const edge of payload.canvas.edges) {
    if (!edge.id || typeof edge.id !== 'string') {
      throw new ActionExecutorError(
        `Edge missing required "id" property`,
        'VALIDATION_ERROR',
        { edge }
      );
    }
    
    if (!edge.source || !nodeIds.has(edge.source)) {
      throw new ActionExecutorError(
        `Edge "${edge.id}" references non-existent source node: "${edge.source}"`,
        'VALIDATION_ERROR',
        { edgeId: edge.id, source: edge.source }
      );
    }
    
    if (!edge.target || !nodeIds.has(edge.target)) {
      throw new ActionExecutorError(
        `Edge "${edge.id}" references non-existent target node: "${edge.target}"`,
        'VALIDATION_ERROR',
        { edgeId: edge.id, target: edge.target }
      );
    }
  }
  
  // Step 4: Validate canvas structure with validateGraph (Requirement 4.1)
  // This checks for cycles, disconnected nodes, etc.
  const validationErrors = validateGraph(payload.canvas);
  
  if (validationErrors.length > 0) {
    throw new ActionExecutorError(
      'AI-generated canvas failed validation',
      'VALIDATION_ERROR',
      { errors: validationErrors }
    );
  }
  
  // Step 5: Store canvas in database
  try {
    const { flow, versionId } = await createFlowWithVersion(
      payload.name,
      payload.canvas,
      'workflow',
      undefined,
      'Created by AI Manager'
    );
    
    return {
      canvasId: flow.id,
      canvas: payload.canvas,
    };
  } catch (error) {
    throw new ActionExecutorError(
      'Failed to store canvas in database',
      'DATABASE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Validate entity movement action configuration
 * 
 * Requirements:
 * - 10.4: Validate targetSectionId references existing node
 * - 10.5: Validate completeAs has valid value
 * 
 * @param nodeId - Node ID for error reporting
 * @param actionType - 'onSuccess' or 'onFailure'
 * @param action - Entity movement action to validate
 * @param nodeIds - Set of valid node IDs for O(1) lookup
 * @throws ActionExecutorError if validation fails
 */
function validateEntityMovementAction(
  nodeId: string,
  actionType: string,
  action: any,
  nodeIds: Set<string>
): void {
  if (typeof action !== 'object' || action === null) {
    throw new ActionExecutorError(
      `Worker node "${nodeId}" has invalid entityMovement.${actionType} (must be object)`,
      'VALIDATION_ERROR',
      { nodeId, actionType }
    );
  }
  
  // Requirement 10.4: Validate targetSectionId references existing node
  if (!action.targetSectionId || typeof action.targetSectionId !== 'string') {
    throw new ActionExecutorError(
      `Worker node "${nodeId}" entityMovement.${actionType} missing required "targetSectionId"`,
      'VALIDATION_ERROR',
      { nodeId, actionType }
    );
  }
  
  // O(1) lookup using Set instead of O(N) array.some()
  if (!nodeIds.has(action.targetSectionId)) {
    throw new ActionExecutorError(
      `Worker node "${nodeId}" entityMovement.${actionType}.targetSectionId references non-existent node: "${action.targetSectionId}"`,
      'VALIDATION_ERROR',
      { nodeId, actionType, targetSectionId: action.targetSectionId }
    );
  }
  
  // Requirement 10.5: Validate completeAs has valid value
  if (!action.completeAs || typeof action.completeAs !== 'string') {
    throw new ActionExecutorError(
      `Worker node "${nodeId}" entityMovement.${actionType} missing required "completeAs"`,
      'VALIDATION_ERROR',
      { nodeId, actionType }
    );
  }
  
  const validCompleteAs = ['success', 'failure', 'neutral'];
  if (!validCompleteAs.includes(action.completeAs)) {
    throw new ActionExecutorError(
      `Worker node "${nodeId}" entityMovement.${actionType}.completeAs has invalid value: "${action.completeAs}" (must be one of: ${validCompleteAs.join(', ')})`,
      'VALIDATION_ERROR',
      { nodeId, actionType, completeAs: action.completeAs }
    );
  }
  
  // Validate setEntityType if present
  if (action.setEntityType !== undefined) {
    if (typeof action.setEntityType !== 'string') {
      throw new ActionExecutorError(
        `Worker node "${nodeId}" entityMovement.${actionType}.setEntityType must be a string`,
        'VALIDATION_ERROR',
        { nodeId, actionType }
      );
    }
    
    const validEntityTypes = ['customer', 'churned', 'lead'];
    if (!validEntityTypes.includes(action.setEntityType)) {
      throw new ActionExecutorError(
        `Worker node "${nodeId}" entityMovement.${actionType}.setEntityType has invalid value: "${action.setEntityType}" (must be one of: ${validEntityTypes.join(', ')})`,
        'VALIDATION_ERROR',
        { nodeId, actionType, setEntityType: action.setEntityType }
      );
    }
  }
}

/**
 * MODIFY_WORKFLOW action handler
 * 
 * Modifies an existing workflow by applying AI-generated changes.
 * Preserves unchanged node IDs, generates unique IDs for new nodes,
 * removes edges for deleted nodes, and validates the resulting canvas.
 * 
 * Requirements:
 * - 5.1: Load current canvas from database
 * - 5.2: Preserve existing node IDs where unchanged
 * - 5.3: Generate unique IDs for new nodes
 * - 5.4: Remove edges for deleted nodes
 * - 5.5: Validate resulting canvas
 * - 5.7: Validate edge integrity
 * 
 * @param payload - MODIFY_WORKFLOW payload with canvas ID and modifications
 * @returns Updated canvas ID and full canvas
 * @throws ActionExecutorError if validation fails
 */
export async function handleModifyWorkflow(
  payload: ModifyWorkflowPayload
): Promise<{ canvasId: string; canvas: VisualGraph }> {
  const { getFlow } = await import('@/lib/db/flows');
  const { getVersion } = await import('@/lib/canvas/version-manager');
  const { createVersion } = await import('@/lib/canvas/version-manager');
  const { validateGraph } = await import('@/lib/canvas/validate-graph');
  const { isValidWorkerType } = await import('@/lib/workers/registry');
  
  // Step 1: Load current canvas from database (Requirement 5.1)
  const flow = await getFlow(payload.canvasId, true);
  
  if (!flow) {
    throw new ActionExecutorError(
      `Canvas not found: ${payload.canvasId}`,
      'NOT_FOUND',
      { canvasId: payload.canvasId }
    );
  }
  
  // Get current version to access visual graph
  if (!flow.current_version_id) {
    throw new ActionExecutorError(
      `Canvas has no current version: ${payload.canvasId}`,
      'VALIDATION_ERROR',
      { canvasId: payload.canvasId }
    );
  }
  
  const currentVersion = await getVersion(flow.current_version_id);
  
  if (!currentVersion) {
    throw new ActionExecutorError(
      `Current version not found: ${flow.current_version_id}`,
      'NOT_FOUND',
      { versionId: flow.current_version_id }
    );
  }
  
  const currentCanvas = currentVersion.visual_graph;
  
  // Step 2: Build node ID mapping (Requirement 5.2)
  // Map old node IDs to new node IDs to preserve unchanged nodes
  const currentNodeMap = new Map(currentCanvas.nodes.map(n => [n.id, n]));
  const newNodeIds = new Set(payload.canvas.nodes.map(n => n.id));
  const usedIds = new Set<string>();
  
  // Step 3: Process nodes - preserve IDs where possible, generate unique IDs for new nodes
  const processedNodes = payload.canvas.nodes.map(newNode => {
    // Check if this node exists in current canvas
    const currentNode = currentNodeMap.get(newNode.id);
    
    if (currentNode) {
      // Node exists - check if it's unchanged (Requirement 5.2)
      // We consider a node "unchanged" if the core properties match
      const isUnchanged = 
        currentNode.type === newNode.type &&
        currentNode.data.label === newNode.data.label &&
        currentNode.data.worker_type === newNode.data.worker_type;
      
      if (isUnchanged) {
        // Preserve the existing node ID (Requirement 5.2)
        usedIds.add(newNode.id);
        return newNode;
      }
    }
    
    // New node or changed node - ensure unique ID (Requirement 5.3)
    let finalId = newNode.id;
    
    // If ID conflicts with existing nodes, generate a unique one
    if (usedIds.has(finalId)) {
      let counter = 1;
      while (usedIds.has(`${finalId}-${counter}`)) {
        counter++;
      }
      finalId = `${finalId}-${counter}`;
    }
    
    usedIds.add(finalId);
    
    return {
      ...newNode,
      id: finalId,
    };
  });
  
  // Step 4: Remove edges for deleted nodes (Requirement 5.4)
  const processedNodeIds = new Set(processedNodes.map(n => n.id));
  const processedEdges = payload.canvas.edges.filter(edge => {
    // Keep edge only if both source and target nodes exist
    return processedNodeIds.has(edge.source) && processedNodeIds.has(edge.target);
  });
  
  // Build the modified canvas
  const modifiedCanvas: VisualGraph = {
    nodes: processedNodes,
    edges: processedEdges,
  };
  
  // Build node ID set for validation (used in entity movement validation)
  const nodeIds = new Set(modifiedCanvas.nodes.map(n => n.id));
  
  // Step 5: Validate all nodes have required properties (same as CREATE_WORKFLOW)
  for (const node of modifiedCanvas.nodes) {
    // Check required node properties
    if (!node.id || typeof node.id !== 'string') {
      throw new ActionExecutorError(
        `Node missing required "id" property`,
        'VALIDATION_ERROR',
        { node }
      );
    }
    
    if (!node.type || typeof node.type !== 'string') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "type" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    if (!node.data || typeof node.data !== 'object') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "data" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    if (!node.data.label || typeof node.data.label !== 'string') {
      throw new ActionExecutorError(
        `Node "${node.id}" missing required "data.label" property`,
        'VALIDATION_ERROR',
        { nodeId: node.id }
      );
    }
    
    // Validate worker nodes specifically
    if (node.type === 'worker') {
      if (!node.data.worker_type) {
        throw new ActionExecutorError(
          `Worker node "${node.id}" missing required "worker_type" property`,
          'VALIDATION_ERROR',
          { nodeId: node.id }
        );
      }
      
      if (!isValidWorkerType(node.data.worker_type)) {
        throw new ActionExecutorError(
          `Worker node "${node.id}" has invalid worker type: "${node.data.worker_type}"`,
          'VALIDATION_ERROR',
          { nodeId: node.id, workerType: node.data.worker_type }
        );
      }
      
      if (node.data.config && typeof node.data.config !== 'object') {
        throw new ActionExecutorError(
          `Worker node "${node.id}" has invalid "config" property (must be object)`,
          'VALIDATION_ERROR',
          { nodeId: node.id }
        );
      }
      
      // Validate entity movement configuration
      if (node.data.entityMovement) {
        const entityMovement = node.data.entityMovement;
        
        if (typeof entityMovement !== 'object') {
          throw new ActionExecutorError(
            `Worker node "${node.id}" has invalid "entityMovement" property (must be object)`,
            'VALIDATION_ERROR',
            { nodeId: node.id }
          );
        }
        
        if (entityMovement.onSuccess) {
          validateEntityMovementAction(node.id, 'onSuccess', entityMovement.onSuccess, nodeIds);
        }
        
        if (entityMovement.onFailure) {
          validateEntityMovementAction(node.id, 'onFailure', entityMovement.onFailure, nodeIds);
        }
      }
    }
  }
  
  // Step 6: Validate all edges reference existing nodes (Requirement 5.7)
  // Note: nodeIds Set was already created earlier for entity movement validation
  
  for (const edge of modifiedCanvas.edges) {
    if (!edge.id || typeof edge.id !== 'string') {
      throw new ActionExecutorError(
        `Edge missing required "id" property`,
        'VALIDATION_ERROR',
        { edge }
      );
    }
    
    if (!edge.source || !nodeIds.has(edge.source)) {
      throw new ActionExecutorError(
        `Edge "${edge.id}" references non-existent source node: "${edge.source}"`,
        'VALIDATION_ERROR',
        { edgeId: edge.id, source: edge.source }
      );
    }
    
    if (!edge.target || !nodeIds.has(edge.target)) {
      throw new ActionExecutorError(
        `Edge "${edge.id}" references non-existent target node: "${edge.target}"`,
        'VALIDATION_ERROR',
        { edgeId: edge.id, target: edge.target }
      );
    }
  }
  
  // Step 7: Validate canvas structure with validateGraph (Requirement 5.5)
  const validationErrors = validateGraph(modifiedCanvas);
  
  if (validationErrors.length > 0) {
    throw new ActionExecutorError(
      'Modified canvas failed validation',
      'VALIDATION_ERROR',
      { errors: validationErrors }
    );
  }
  
  // Step 8: Create new version with modified canvas
  try {
    const commitMessage = payload.changes?.length > 0
      ? `AI modifications: ${payload.changes.join(', ')}`
      : 'AI modifications applied';
    
    await createVersion(payload.canvasId, modifiedCanvas, commitMessage);
    
    return {
      canvasId: payload.canvasId,
      canvas: modifiedCanvas,
    };
  } catch (error) {
    throw new ActionExecutorError(
      'Failed to store modified canvas in database',
      'DATABASE_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * RUN_WORKFLOW action handler
 * 
 * Starts workflow execution for a canvas.
 * 
 * Requirements:
 * - 6.1: Return run identifier for status tracking
 * 
 * @param payload - RUN_WORKFLOW payload with canvas ID and input
 * @returns Run ID and status information
 * @throws ActionExecutorError if execution fails
 */
export async function handleRunWorkflow(
  payload: RunWorkflowPayload
): Promise<{ runId: string; status: string; statusUrl: string }> {
  // Step 1: Load canvas by ID
  const { getFlow } = await import('@/lib/db/flows');
  
  let flow;
  try {
    flow = await getFlow(payload.canvasId, true);
  } catch (error) {
    throw new ActionExecutorError(
      `Failed to load canvas: ${payload.canvasId}`,
      'NOT_FOUND',
      { 
        canvasId: payload.canvasId,
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
  
  if (!flow) {
    throw new ActionExecutorError(
      `Canvas not found: ${payload.canvasId}`,
      'NOT_FOUND',
      { canvasId: payload.canvasId }
    );
  }

  // Step 2: Get current version to extract visual graph
  const { getVersion } = await import('@/lib/canvas/version-manager');
  const { createVersion } = await import('@/lib/canvas/version-manager');
  
  let visualGraph;
  if (flow.current_version_id) {
    const currentVersion = await getVersion(flow.current_version_id);
    if (currentVersion) {
      visualGraph = currentVersion.visual_graph;
    }
  }
  
  // If no current version exists, we need to handle this case
  if (!visualGraph) {
    throw new ActionExecutorError(
      'Canvas has no visual graph data. Please update the canvas first.',
      'VALIDATION_ERROR',
      { canvasId: payload.canvasId }
    );
  }
  
  // Step 3: Create version snapshot automatically (Requirement 2.3)
  // This also compiles to execution graph
  const { versionId } = await createVersion(
    payload.canvasId,
    visualGraph,
    'Auto-versioned on run by AI Manager'
  );

  // Step 4: Start workflow execution (creates run record and fires entry nodes)
  try {
    const { startRun } = await import('@/lib/engine/edge-walker');
    const run = await startRun(payload.canvasId, {
      entityId: null,
      input: payload.input || {},
      flow_version_id: versionId,
      trigger: {
        type: 'manual',
        source: 'ai-manager',
        event_id: null,
        timestamp: new Date().toISOString(),
      }
    });

    // Step 5: Return run ID and status (Requirement 6.1)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const statusUrl = `${baseUrl}/api/canvas/${payload.canvasId}/status?runId=${run.id}`;

    return {
      runId: run.id,
      status: 'running',
      statusUrl: statusUrl
    };
  } catch (error) {
    throw new ActionExecutorError(
      'Failed to start workflow execution',
      'EXECUTION_ERROR',
      { 
        canvasId: payload.canvasId,
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * GET_STATUS action handler
 * 
 * Retrieves the current status of a workflow execution.
 * 
 * Requirements:
 * - 6.2: Return current state of all nodes
 * - 6.3: Include node outputs for completed nodes
 * - 6.4: Return error details for failed workflows
 * - 6.5: Return final outputs from terminal nodes for completed workflows
 * 
 * @param payload - GET_STATUS payload with run ID
 * @returns Status information with node states and outputs
 * @throws ActionExecutorError if status retrieval fails
 */
export async function handleGetStatus(
  payload: GetStatusPayload
): Promise<{
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  nodes: Record<string, { status: string; output?: unknown; error?: string }>;
  finalOutputs?: Record<string, unknown>;
  statusUrl: string;
}> {
  // Step 1: Extract run ID from payload
  const { runId } = payload;
  
  // Step 2: Query run status from stitch_runs table
  const { getRun } = await import('@/lib/db/runs');
  
  let run;
  try {
    run = await getRun(runId);
  } catch (error) {
    throw new ActionExecutorError(
      `Failed to retrieve run: ${runId}`,
      'DATABASE_ERROR',
      { 
        runId,
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
  
  if (!run) {
    throw new ActionExecutorError(
      `Run not found: ${runId}`,
      'NOT_FOUND',
      { runId }
    );
  }
  
  // Step 3: Extract node states from run record (Requirement 6.2)
  const nodeStates = run.node_states;
  
  // Step 4: Aggregate node outputs for completed nodes (Requirement 6.3)
  const nodes: Record<string, { status: string; output?: unknown; error?: string }> = {};
  
  for (const [nodeId, state] of Object.entries(nodeStates)) {
    nodes[nodeId] = {
      status: state.status,
      ...(state.output !== undefined && { output: state.output }),
      ...(state.error !== undefined && { error: state.error })
    };
  }
  
  // Step 5: Determine overall status based on node states
  let overallStatus: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
  
  const statuses = Object.values(nodeStates).map(s => s.status);
  const hasRunning = statuses.some(s => s === 'running');
  const hasFailed = statuses.some(s => s === 'failed');
  const allCompleted = statuses.every(s => s === 'completed');
  const hasWaitingForUser = statuses.some(s => s === 'waiting_for_user');
  
  // Requirement 6.4: Failed workflows report error details
  if (hasFailed) {
    overallStatus = 'failed';
  } else if (allCompleted) {
    overallStatus = 'completed';
  } else if (hasRunning || hasWaitingForUser) {
    overallStatus = 'running';
  }
  
  // Step 6: Extract final outputs from terminal nodes (Requirement 6.5)
  let finalOutputs: Record<string, unknown> | undefined;
  
  if (overallStatus === 'completed') {
    // Load the execution graph to identify terminal nodes
    const { getVersion } = await import('@/lib/canvas/version-manager');
    
    if (run.flow_version_id) {
      try {
        const version = await getVersion(run.flow_version_id);
        
        if (version && version.execution_graph) {
          const terminalNodes = version.execution_graph.terminalNodes || [];
          
          // Extract outputs from terminal nodes
          finalOutputs = {};
          for (const terminalNodeId of terminalNodes) {
            const nodeState = nodeStates[terminalNodeId];
            if (nodeState && nodeState.status === 'completed' && nodeState.output !== undefined) {
              finalOutputs[terminalNodeId] = nodeState.output;
            }
          }
          
          // Only include finalOutputs if there are any
          if (Object.keys(finalOutputs).length === 0) {
            finalOutputs = undefined;
          }
        }
      } catch (error) {
        // If we can't load the version, just skip finalOutputs
        // This is not critical to the status response
        console.warn(`Failed to load version for terminal outputs: ${error}`);
      }
    }
  }
  
  // Step 7: Return status with statusUrl for polling
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const statusUrl = `${baseUrl}/api/canvas/${run.flow_id}/status?runId=${runId}`;
  
  return {
    runId: runId,
    status: overallStatus,
    nodes: nodes,
    ...(finalOutputs !== undefined && { finalOutputs }),
    statusUrl: statusUrl
  };
}
