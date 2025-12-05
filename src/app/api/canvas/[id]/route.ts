/**
 * Canvas Management API - Individual Canvas Route
 * 
 * Handles operations on individual canvases by ID
 * GET: Retrieve canvas, PUT: Update canvas, DELETE: Delete canvas
 * Requirements: 1.3, 1.4, 1.5, 9.2, 9.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFlow, updateFlow, deleteFlow } from '@/lib/db/flows';
import { createVersion } from '@/lib/canvas/version-manager';
import { VisualGraph } from '@/types/canvas-schema';
import {
  GetCanvasResponse,
  UpdateCanvasRequest,
  UpdateCanvasResponse,
  DeleteCanvasResponse
} from '@/types/canvas-api';
import {
  handleAPIError,
  validateRequestBody,
  validateCanvasId,
  APIError
} from '@/lib/api/error-handler';

/**
 * GET /api/canvas/[id]
 * Retrieve a canvas by ID
 * Requirements: 1.3, 9.2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    validateCanvasId(id);

    // Get flow with current version data
    const _flow = await getFlow(id, true);

    if (!flow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${id}`
      );
    }

    // Extract visual graph from current version or fallback to legacy graph
    let canvas: VisualGraph;
    
    // Check if flow has current version with visual_graph
    if (flow.current_version_id && (flow as unknown).current_version?.visual_graph) {
      canvas = (flow as unknown).current_version.visual_graph;
    } else {
      // Fallback to legacy graph format - convert StitchNode to VisualNode
      canvas = {
        nodes: (flow.graph?.nodes || []).map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: node.data.label || '',
            ...node.data
          },
          ...(node.parentId && { parentNode: node.parentId }),
          ...(node.extent && { extent: node.extent }),
          ...(node.style && { style: node.style }),
          ...(node.width && { width: node.width }),
          ...(node.height && { height: node.height })
        })),
        edges: (flow.graph?.edges || []).map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
          ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
          ...(edge.type && { type: edge.type }),
          ...(edge.animated !== undefined && { animated: edge.animated }),
          ...(edge.style && { style: edge.style }),
          ...(edge.data && { data: edge.data })
        }))
      };
    }

    const response: GetCanvasResponse = {
      id: flow.id,
      name: flow.name,
      canvas,
      created_at: flow.created_at,
      updated_at: flow.updated_at
    };

    return NextResponse.json(response);

  } catch (_error) {
    return handleAPIError(error);
  }
}

/**
 * PUT /api/canvas/[id]
 * Update a canvas by ID
 * Requirements: 1.4, 9.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    validateCanvasId(id);

    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });

    validateRequestBody(body);

    const { name, canvas } = body as UpdateCanvasRequest;

    // Validate canvas structure if provided
    if (canvas) {
      if (!canvas.nodes || !Array.isArray(canvas.nodes)) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          'Invalid canvas: missing or invalid nodes array'
        );
      }
      if (!canvas.edges || !Array.isArray(canvas.edges)) {
        throw new APIError(
          'VALIDATION_ERROR',
          400,
          'Invalid canvas: missing or invalid edges array'
        );
      }
    }

    // Check if canvas exists
    const existingFlow = await getFlow(id);
    if (!existingFlow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${id}`
      );
    }

    // Create new version if canvas is being updated
    // ✅ CORRECT: Using createVersion() to update canvas structure
    // This ensures versioning system and OEG compiler are properly invoked
    if (canvas) {
      await createVersion(
        id,
        canvas,
        'Updated via API'
      );
    }

    // Update flow metadata if name is provided
    // ✅ SAFE: Only updating metadata (name), NOT graph structure
    // updateFlow() is deprecated for graph updates but safe for metadata
    const updates: { name?: string } = {};
    if (name) {
      updates.name = name;
    }

    if (Object.keys(updates).length > 0) {
      await updateFlow(id, updates);
    }

    // Fetch updated flow
    const updatedFlow = await getFlow(id, true);
    if (!updatedFlow) {
      throw new APIError(
        'INTERNAL_ERROR',
        500,
        'Failed to retrieve updated canvas'
      );
    }

    // Extract visual graph from current version
    let updatedCanvas: VisualGraph;
    if (updatedFlow.current_version_id && (updatedFlow as unknown).current_version?.visual_graph) {
      updatedCanvas = (updatedFlow as unknown).current_version.visual_graph;
    } else if (canvas) {
      updatedCanvas = canvas;
    } else {
      // Convert StitchNode to VisualNode
      updatedCanvas = {
        nodes: (updatedFlow.graph?.nodes || []).map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: node.data.label || '',
            ...node.data
          },
          ...(node.parentId && { parentNode: node.parentId }),
          ...(node.extent && { extent: node.extent }),
          ...(node.style && { style: node.style }),
          ...(node.width && { width: node.width }),
          ...(node.height && { height: node.height })
        })),
        edges: (updatedFlow.graph?.edges || []).map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
          ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
          ...(edge.type && { type: edge.type }),
          ...(edge.animated !== undefined && { animated: edge.animated }),
          ...(edge.style && { style: edge.style }),
          ...(edge.data && { data: edge.data })
        }))
      };
    }

    const response: UpdateCanvasResponse = {
      id: updatedFlow.id,
      canvas: updatedCanvas,
      updated_at: updatedFlow.updated_at
    };

    return NextResponse.json(response);

  } catch (_error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/canvas/[id]
 * Delete a canvas by ID
 * Requirements: 1.5, 9.2
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    validateCanvasId(id);

    // Check if canvas exists
    const _flow = await getFlow(id);
    if (!flow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${id}`
      );
    }

    // Delete the canvas
    await deleteFlow(id);

    const response: DeleteCanvasResponse = {
      success: true,
      id
    };

    return NextResponse.json(response);

  } catch (_error) {
    return handleAPIError(error);
  }
}
