/**
 * Node Creation API Route
 * 
 * Handles creation of nodes on a canvas via MCP server
 * POST: Create a new node on the specified canvas
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { NextResponse } from 'next/server';
import { requireMCPAuth } from '@/lib/api/mcp-auth';
import { getFlow } from '@/lib/db/flows';
import { createVersion } from '@/lib/canvas/version-manager';
import { VisualNode, VisualGraph } from '@/types/canvas-schema';
import {
  handleAPIError,
  validateRequestBody,
  validateCanvasId,
  APIError
} from '@/lib/api/error-handler';
import { randomUUID } from 'crypto';

/**
 * Node creation request body
 */
interface CreateNodeRequest {
  label: string;
  type: 'asset' | 'worker' | 'integration';
  data?: {
    icon?: string;
    url?: string;
    uptime?: {
      enabled: boolean;
    };
    [key: string]: any;
  };
  position?: { x: number; y: number };
}

/**
 * Node creation response
 */
interface CreateNodeResponse {
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  webhookUrl: string;
  uptimeUrl: string;
}

/**
 * POST /api/canvas/[canvasId]/nodes
 * Create a new node on the specified canvas
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
async function createNodeHandler(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id: canvasId } = params;

    // Validate canvas ID (Requirement 1.1)
    validateCanvasId(canvasId);

    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });

    validateRequestBody(body);

    const { label, type, data = {}, position } = body as CreateNodeRequest;

    // Validate required fields
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      throw new APIError(
        'VALIDATION_ERROR',
        400,
        'Missing or invalid required field: label'
      );
    }

    // Validate node type (Requirement 1.5)
    const allowedTypes = ['asset', 'worker', 'integration'];
    if (!type || !allowedTypes.includes(type)) {
      throw new APIError(
        'VALIDATION_ERROR',
        400,
        `Invalid node type. Must be one of: ${allowedTypes.join(', ')}`
      );
    }

    // Validate position if provided
    if (position !== undefined) {
      if (
        typeof position !== 'object' ||
        typeof position.x !== 'number' ||
        typeof position.y !== 'number'
      ) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          'Invalid position: must be an object with numeric x and y properties'
        );
      }
    }

    // Check if canvas exists (Requirement 1.1)
    const flow = await getFlow(canvasId, true);
    if (!flow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${canvasId}`
      );
    }

    // Get current visual graph
    let currentGraph: VisualGraph;

    if (flow.current_version_id && (flow as any).current_version?.visual_graph) {
      currentGraph = (flow as any).current_version.visual_graph;
    } else {
      // Fallback to legacy graph format - convert to VisualGraph
      currentGraph = {
        nodes: (flow.graph?.nodes || []).map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: node.data.label || '',
            ...node.data
          }
        })),
        edges: flow.graph?.edges || []
      };
    }

    // Generate unique node ID (Requirement 1.2)
    const nodeId = `node-${randomUUID()}`;

    // Apply default position if not provided (Requirement 1.4)
    const nodePosition = position || { x: 100, y: 100 };

    // Create new node (Requirement 1.3)
    const newNode: VisualNode = {
      id: nodeId,
      type,
      position: nodePosition,
      data: {
        label,
        ...data,
        mcp: {
          createdBy: 'mcp',
          createdAt: new Date().toISOString()
        }
      }
    };

    // Add node to canvas graph
    const updatedGraph: VisualGraph = {
      nodes: [...currentGraph.nodes, newNode],
      edges: currentGraph.edges
    };

    // Update canvas in database using version manager (Requirement 1.1)
    await createVersion(
      canvasId,
      updatedGraph,
      `Created node via MCP: ${label}`
    );

    // Generate webhook and uptime URLs (Requirement 1.2)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/node/${nodeId}`;
    const uptimeUrl = `${baseUrl}/api/uptime/ping/${nodeId}`;

    // Return created node with metadata (Requirement 1.2)
    const response: CreateNodeResponse = {
      id: nodeId,
      label: newNode.data.label,
      type: newNode.type,
      position: newNode.position,
      data: newNode.data,
      webhookUrl,
      uptimeUrl
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleAPIError(error);
  }
}

// Wrap handler with MCP authentication (Requirement 6.1, 6.3)
export const POST = requireMCPAuth(createNodeHandler);
