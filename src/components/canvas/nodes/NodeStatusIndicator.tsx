/**
 * Node Status Indicator Component
 * Displays visual feedback for node execution status
 * Requirements: 1.5, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */

'use client';

import { useMemo, useEffect } from 'react';
import { NodeStatus } from '@/types/stitch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface NodeStatusIndicatorProps {
  nodeId: string;
  status: NodeStatus;
  error?: string;
}

/**
 * Visual indicator that overlays on nodes to show execution status
 * - Idle: No indicator (default styling)
 * - Running: Pulsing blue animation
 * - Completed: Green glow effect
 * - Failed: Red indicator with error icon
 */
export function NodeStatusIndicator({ nodeId, status, error }: NodeStatusIndicatorProps) {
  // Log errors for debugging (Requirement 6.4)
  useEffect(() => {
    if (status === 'failed' && error) {
      console.error('[NodeStatusIndicator] Node execution failed:', {
        nodeId,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }, [status, error, nodeId]);

  const statusStyles = useMemo(() => {
    switch (status) {
      case 'running':
        return {
          className: 'animate-pulse',
          borderColor: '#3b82f6', // Blue
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        };
      case 'completed':
        return {
          className: '',
          borderColor: '#10b981', // Green
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
        };
      case 'failed':
        return {
          className: '',
          borderColor: '#ef4444', // Red
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
        };
      case 'waiting_for_user':
        return {
          className: 'animate-pulse',
          borderColor: '#f59e0b', // Amber
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
        };
      case 'pending':
      default:
        return null; // No indicator for pending/idle state
    }
  }, [status]);

  // Don't render anything for pending status
  if (!statusStyles) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-lg border-2 ${statusStyles.className}`}
      role="status"
      aria-label={`Node status: ${status}`}
      aria-live="polite"
      style={{
        borderColor: statusStyles.borderColor,
        backgroundColor: statusStyles.backgroundColor,
        boxShadow: statusStyles.boxShadow,
      }}
    >
      {/* Error icon with tooltip for failed nodes (Requirements 6.2, 6.3) */}
      {status === 'failed' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center pointer-events-auto cursor-help hover:bg-red-600 transition-colors"
              aria-label="Error details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-white"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="max-w-xs bg-red-600 text-white border-red-700"
            sideOffset={5}
          >
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">Node Execution Failed</div>
                <div className="text-xs opacity-90">
                  {error || 'An error occurred during node execution. Please check the logs for more details.'}
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
