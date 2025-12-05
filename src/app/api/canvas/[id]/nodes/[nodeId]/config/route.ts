/**
 * Node Configuration API
 * 
 * Handles updating individual node configurations within a canvas
 * PUT: Update node configuration (worker type, inputs, entity movement)
 * Requirements: 3.4, 12.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFlow } from '@/lib/db/flows';
import { createVersion } from '@/lib/canvas/version-manager';
import { VisualGraph, VisualNode } from '@/types/canvas-schema';
import { WORKER_DEFINITIONS, isValidWorkerType } from '@/lib/workers/registry';
import {
  handleAPIError,
  validateCanvasId,
  APIError
} from '@/lib/api/error-handler';

/**
 * Request body for updating node configuration
 */
interface UpdateNodeConfigRequest {
  workerType?: string;
  config?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  entityMovement?: {
    onSuccess?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
      setEntityType?: 'customer' | 'churned' | 'lead';
    };
    onFailure?: {
      targetSectionId: string;
      completeAs: 'success' | 'failure' | 'neutral';
      setEntityType?: 'customer' | 'churned' | 'lead';
    };
  };
}

/**
 * Response body for node configuration update
 */
interface UpdateNodeConfigResponse {
  success: boolean;
  nodeId: string;
  versionId: string;
  node: VisualNode;
}

/**
 * PUT /api/canvas/[id]/nodes/[nodeId]/config
 * Update a node's configuration
 * 
 * Requirements: 3.4, 12.5
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
): Promise<NextResponse> {
  try {
    const { id: canvasId, nodeId } = await params;
    
    // Validate canvas ID
    validateCanvasId(canvasId);
    
    // Validate node ID
    if (!nodeId || typeof nodeId !== 'string') {
      throw new APIError(
        'VALIDATION_ERROR',
        400,
        'Invalid node ID'
      );
    }
    
    // Parse request body
    const body = await request.json().catch(() => {
      throw new APIError(
        'BAD_REQUEST',
        400,
        'Invalid JSON in request body'
      );
    });
    
    const { workerType, config, inputs, entityMovement } = body as UpdateNodeConfigRequest;
    
    // Validate worker type if provided (Requirement 12.5)
    if (workerType && !isValidWorkerType(workerType)) {
      throw new APIError(
        'VALIDATION_ERROR',
        400,
        `Invalid worker type: ${workerType}. Must be one of: ${Object.keys(WORKER_DEFINITIONS).join(', ')}`
      );
    }
    
    // Validate inputs against worker schema if worker type is provided (Requirement 12.5)
    if (workerType && inputs) {
      const workerDef = WORKER_DEFINITIONS[workerType];
      
      // Check required fields
      for (const [fieldName, fieldDef] of Object.entries(workerDef.input)) {
        if (fieldDef.required && !(fieldName in inputs)) {
          throw new APIError(
            'VALIDATION_ERROR',
            400,
            `Missing required input field: ${fieldName}`
          );
        }
      }
      
      // Validate field types
      for (const [fieldName, value] of Object.entries(inputs)) {
        const fieldDef = workerDef.input[fieldName];
        if (!fieldDef) {
          // Allow extra fields for flexibility
          continue;
        }
        
        // Basic type validation
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (fieldDef.type === 'number' && actualType !== 'number') {
          throw new APIError(
            'VALIDATION_ERROR',
            400,
            `Invalid type for field ${fieldName}: expected number, got ${actualType}`
          );
        }
        if (fieldDef.type === 'boolean' && actualType !== 'boolean') {
          throw new APIError(
            'VALIDATION_ERROR',
            400,
            `Invalid type for field ${fieldName}: expected boolean, got ${actualType}`
          );
        }
        if (fieldDef.type === 'array' && !Array.isArray(value)) {
          throw new APIError(
            'VALIDATION_ERROR',
            400,
            `Invalid type for field ${fieldName}: expected array, got ${actualType}`
          );
        }
      }
    }
    
    // Get current flow with version data
    const _flow = await getFlow(canvasId, true);
    
    if (!flow) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Canvas not found: ${canvasId}`
      );
    }
    
    // Extract current visual graph
    let currentGraph: VisualGraph;
    if (flow.current_version_id && (flow as unknown).current_version?.visual_graph) {
      currentGraph = (flow as unknown).current_version.visual_graph;
    } else {
      // Fallback to legacy graph format
      currentGraph = {
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
    
    // Find the node to update
    const nodeIndex = currentGraph.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new APIError(
        'NOT_FOUND',
        404,
        `Node not found: ${nodeId}`
      );
    }
    
    // Create updated graph with modified node (Requirement 3.4)
    const updatedGraph: VisualGraph = {
      ...currentGraph,
      nodes: currentGraph.nodes.map((node, index) => {
        if (index !== nodeIndex) {
          return node;
        }
        
        // Update node data
        const updatedNode: VisualNode = {
          ...node,
          data: {
            ...node.data,
            ...(workerType && { worker_type: workerType }),
            ...(config && { config: { ...node.data.config, ...config } }),
            ...(inputs && { inputs }),
            ...(entityMovement && { entityMovement })
          }
        };
        
        return updatedNode;
      })
    };
    
    // Create new version with updated graph (Requirement 3.4)
    // This ensures proper versioning and OEG compilation
    const { versionId } = await createVersion(
      canvasId,
      updatedGraph,
      `Updated node ${nodeId} configuration`
    );
    
    // Get the updated node
    const updatedNode = updatedGraph.nodes[nodeIndex];
    
    const response: UpdateNodeConfigResponse = {
      success: true,
      nodeId,
      versionId,
      node: updatedNode
    };
    
    return NextResponse.json(response);
    
  } catch (_error) {
    return handleAPIError(error);
  }
}
