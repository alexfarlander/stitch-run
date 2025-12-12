/**
 * AI Manager API Endpoint
 * 
 * Accepts natural language requests and executes canvas operations via LLM.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleAPIError,
  validateRequestBody,
  validateRequiredFields,
  APIError
} from '@/lib/api/error-handler';
import type { ErrorCode } from '@/types/canvas-api';
import {
  createLLMClient,
  LLMError
} from '@/lib/ai/llm-client';
import {
  buildAIManagerContext,
  stripCanvasUIProperties
} from '@/lib/ai/context-builder';
import {
  buildAIManagerPrompt
} from '@/lib/ai/prompt-template';
import {
  parseAndValidateResponse,
  executeAction,
  handleCreateWorkflow,
  handleModifyWorkflow,
  handleRunWorkflow,
  handleGetStatus,
  ActionExecutorError,
  AIManagerResponse
} from '@/lib/ai/action-executor';
import { getFlow } from '@/lib/db/flows';
import { getVersion } from '@/lib/canvas/version-manager';

/**
 * Request body interface
 */
interface AIManagerRequest {
  request: string;
  canvasId?: string;
}

/**
 * POST /api/ai-manager
 * Process natural language requests and execute canvas operations
 * 
 * Requirements:
 * - 4.1: Generate valid canvas with appropriate nodes and edges
 * - 4.2: Select appropriate worker types based on task description
 * - 4.3: Include Splitter and Collector nodes with correct configuration
 * - 4.4: Configure entity movement rules for worker nodes
 * - 4.5: Return canvas in JSON format with all required node properties
 * - 5.1: Load current canvas state for modifications
 * - 5.2: Preserve existing node identifiers where possible
 * - 5.3: Generate unique node identifiers for new nodes
 * - 5.4: Remove associated edges when nodes are deleted
 * - 5.5: Validate resulting graph for cycles and disconnected nodes
 * - 6.1: Return run identifier for status tracking
 * - 6.2: Return current state of all nodes
 * - 6.3: Include node outputs for completed nodes
 * - 6.4: Return error details for failed workflows
 * - 6.5: Return final outputs from terminal nodes
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Step 1: Parse and validate request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });

    validateRequestBody(body);
    validateRequiredFields(body, ['request']);

    const { request: userRequest, canvasId } = body as AIManagerRequest;

    // Validate request is a non-empty string
    if (typeof userRequest !== 'string' || userRequest.trim().length === 0) {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Request must be a non-empty string'
      );
    }

    // Step 2: Load current canvas if canvasId provided (for modifications)
    let currentCanvas;
    if (canvasId) {
      // Validate canvasId is a string
      if (typeof canvasId !== 'string') {
        throw new APIError(
          'BAD_REQUEST',
          400,
          'canvasId must be a string'
        );
      }

      // Load canvas from database
      const flow = await getFlow(canvasId, true);
      
      if (!flow) {
        throw new APIError(
          'NOT_FOUND',
          404,
          `Canvas not found: ${canvasId}`
        );
      }

      // Get current version to access visual graph
      if (flow.current_version_id) {
        const version = await getVersion(flow.current_version_id);
        if (version && version.visual_graph) {
          currentCanvas = version.visual_graph;
        }
      }

      // If no visual graph found, throw error
      if (!currentCanvas) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          `Canvas ${canvasId} has no visual graph data`
        );
      }
    }

    // Step 3: Build AI Manager context
    // This loads worker definitions and strips UI properties from canvas
    const context = buildAIManagerContext(userRequest, currentCanvas);

    // Step 4: Generate prompt from template
    const prompt = buildAIManagerPrompt({
      workers: context.workers,
      currentCanvas: context.currentCanvas,
      userRequest: context.request
    });

    // Step 5: Call LLM client
    let llmClient;
    try {
      llmClient = createLLMClient();
    } catch (error) {
      // Handle LLM client creation errors (e.g., missing API key)
      if (error instanceof LLMError) {
        throw new APIError(
          'LLM_ERROR',
          error.code === 'INVALID_API_KEY' || error.code === 'MISSING_API_KEY' ? 401 : 500,
          error.message,
          [error.code]
        );
      }
      throw error;
    }
    
    let llmResponse: string;
    try {
      llmResponse = await llmClient.complete(prompt);
    } catch (error) {
      // Handle LLM-specific errors
      if (error instanceof LLMError) {
        throw new APIError(
          'LLM_ERROR',
          error.code === 'INVALID_API_KEY' ? 401 : 500,
          error.message,
          [error.code]
        );
      }
      throw error;
    }

    // Step 6: Parse and validate LLM response
    let parsedResponse: AIManagerResponse;
    try {
      parsedResponse = parseAndValidateResponse(llmResponse);
    } catch (error) {
      // Handle parsing/validation errors
      if (error instanceof ActionExecutorError) {
        const details: string[] = [error.code];
        if (error.details) {
          details.push(JSON.stringify(error.details));
        }
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          `Failed to parse LLM response: ${error.message}`,
          details
        );
      }
      throw error;
    }

    // Step 7: Execute action based on parsed response
    let result: unknown;
    try {
      result = await executeAction<unknown>(parsedResponse, {
        createWorkflow: handleCreateWorkflow,
        modifyWorkflow: handleModifyWorkflow,
        runWorkflow: handleRunWorkflow,
        getStatus: handleGetStatus
      });
    } catch (error) {
      // Handle action execution errors
      if (error instanceof ActionExecutorError) {
        // Map error codes to HTTP status codes
        let statusCode = 500;
        if (error.code === 'NOT_FOUND') {
          statusCode = 404;
        } else if (error.code === 'VALIDATION_ERROR') {
          statusCode = 400;
        } else if (error.code === 'DATABASE_ERROR') {
          statusCode = 500;
        }

        // Convert details object to array of strings if needed
        let detailsArray: string[] | undefined;
        if (error.details) {
          if (Array.isArray(error.details)) {
            detailsArray = error.details.map(d => typeof d === 'string' ? d : JSON.stringify(d));
          } else if (typeof error.details === 'object') {
            detailsArray = [JSON.stringify(error.details)];
          } else {
            detailsArray = [String(error.details)];
          }
        }

        const apiCode: ErrorCode =
          error.code === 'NOT_FOUND'
            ? 'NOT_FOUND'
            : error.code === 'VALIDATION_ERROR'
              ? 'VALIDATION_ERROR'
              : error.code === 'PARSE_ERROR'
                ? 'PARSE_ERROR'
                : error.code === 'DATABASE_ERROR'
                  ? 'INTERNAL_ERROR'
                  : 'INTERNAL_ERROR';

        throw new APIError(apiCode, statusCode, error.message, detailsArray);
      }
      throw error;
    }

    // Step 8: Return structured response
    // The response format depends on the action type
    return NextResponse.json({
      action: parsedResponse.action,
      result: result
    });

  } catch (error) {
    return handleAPIError(error);
  }
}
