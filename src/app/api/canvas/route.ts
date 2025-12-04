/**
 * Canvas Management API - Base Route
 * 
 * Handles listing all canvases (GET) and creating new canvases (POST)
 * Requirements: 1.1, 1.2, 9.1, 9.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllFlows, createFlowWithVersion } from '@/lib/db/flows';
import { VisualGraph } from '@/types/canvas-schema';
import {
  ListCanvasesResponse,
  CreateCanvasRequest,
  CreateCanvasResponse,
  CanvasMetadata
} from '@/types/canvas-api';
import {
  handleAPIError,
  validateRequestBody,
  validateRequiredFields,
  APIError
} from '@/lib/api/error-handler';
import { mermaidToCanvas } from '@/lib/canvas/mermaid-parser';

/**
 * GET /api/canvas
 * List all canvases with metadata
 * Requirements: 1.1, 9.3
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get all flows with version data to calculate accurate node/edge counts
    const flows = await getAllFlows(true);

    const canvases: CanvasMetadata[] = flows.map(flow => {
      // Try to get node/edge count from current version, fallback to legacy graph
      let nodeCount = 0;
      let edgeCount = 0;

      if (flow.current_version_id && (flow as any).current_version?.visual_graph) {
        const visualGraph = (flow as any).current_version.visual_graph;
        nodeCount = visualGraph.nodes?.length || 0;
        edgeCount = visualGraph.edges?.length || 0;
      } else {
        nodeCount = flow.graph?.nodes?.length || 0;
        edgeCount = flow.graph?.edges?.length || 0;
      }

      return {
        id: flow.id,
        name: flow.name,
        created_at: flow.created_at,
        updated_at: flow.updated_at,
        node_count: nodeCount,
        edge_count: edgeCount
      };
    });

    const response: ListCanvasesResponse = { canvases };
    return NextResponse.json(response);
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/canvas
 * Create a new canvas from JSON or Mermaid format
 * Requirements: 1.2, 9.1
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });

    validateRequestBody(body);
    validateRequiredFields(body, ['name', 'format', 'content']);

    const { name, format, content } = body as CreateCanvasRequest;

    // Validate format
    if (format !== 'json' && format !== 'mermaid') {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid format: must be "json" or "mermaid"'
      );
    }

    let visualGraph: VisualGraph;

    // Parse content based on format
    if (format === 'json') {
      // Validate JSON content
      if (typeof content === 'string') {
        try {
          visualGraph = JSON.parse(content);
        } catch (e) {
          throw new APIError(
            'BAD_REQUEST',
            400,
            'Invalid JSON content'
          );
        }
      } else if (typeof content === 'object') {
        visualGraph = content as VisualGraph;
      } else {
        throw new APIError(
          'BAD_REQUEST',
          400,
          'Content must be a JSON string or object'
        );
      }

      // Validate visual graph structure
      if (!visualGraph.nodes || !Array.isArray(visualGraph.nodes)) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          'Invalid canvas: missing or invalid nodes array'
        );
      }
      if (!visualGraph.edges || !Array.isArray(visualGraph.edges)) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          'Invalid canvas: missing or invalid edges array'
        );
      }
    } else {
      // Mermaid format
      if (typeof content !== 'string') {
        throw new APIError(
          'BAD_REQUEST',
          400,
          'Mermaid content must be a string'
        );
      }
      
      try {
        // Parse Mermaid to VisualGraph
        visualGraph = mermaidToCanvas(content);
      } catch (e) {
        // Check if it's a MermaidParseError with detailed information
        if (e instanceof Error && e.name === 'MermaidParseError') {
          const mermaidError = e as any;
          const details: string[] = [];
          
          if (mermaidError.hint) {
            details.push(`Hint: ${mermaidError.hint}`);
          }
          if (mermaidError.line) {
            details.push(`Line: ${mermaidError.line}`);
          }
          
          throw new APIError(
            'PARSE_ERROR',
            400,
            e.message,
            details.length > 0 ? details : undefined
          );
        }
        
        // Generic parsing error
        throw new APIError(
          'PARSE_ERROR',
          400,
          `Mermaid parsing failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // Create flow with initial version
    const { flow, versionId } = await createFlowWithVersion(
      name,
      visualGraph,
      'workflow',
      undefined,
      'Initial version via API'
    );

    // Return created canvas
    const response: CreateCanvasResponse = {
      id: flow.id,
      canvas: visualGraph
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleAPIError(error);
  }
}
