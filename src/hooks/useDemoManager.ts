/**
 * useDemoManager Hook
 * 
 * React hook that provides demo management functionality.
 * Handles API calls, state management, and error handling for demo mode.
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface DemoManagerState {
  isRunning: boolean;
  error: string | null;
}

export interface StartDemoResponse {
  sessionId: string;
  status: 'running';
  entityIds: string[];
  runIds: string[];
}

export interface UseDemoManagerReturn {
  state: DemoManagerState;
  startDemo: (canvasId: string, staggerDelay?: number) => Promise<void>;
  cleanupDemo: (sessionId: string) => Promise<void>;
}

/**
 * Hook for managing demo sessions
 * 
 * Provides:
 * - State management for demo operations
 * - API call handling
 * - Error handling with user notifications
 * - Success notifications
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
export function useDemoManager(): UseDemoManagerReturn {
  const [state, setState] = useState<DemoManagerState>({
    isRunning: false,
    error: null,
  });

  /**
   * Start a demo session
   * 
   * Requirement 10.3: DemoManager handles API calls and state management
   * 
   * @param canvasId - Canvas ID to start demo on
   * @param staggerDelay - Delay between entity spawns (default: 2000ms)
   */
  const startDemo = useCallback(async (canvasId: string, staggerDelay: number = 2000) => {
    setState({ isRunning: true, error: null });

    try {
      // Call demo API
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasId,
          staggerDelay,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start demo');
      }

      const data: StartDemoResponse = await response.json();

      // Show success notification
      toast.success('Demo Started!', {
        description: `Spawned ${data.entityIds.length} demo entities. Watch them move through the canvas!`,
      });

      // Keep running state for a moment to show demo is active
      setTimeout(() => {
        setState({ isRunning: false, error: null });
      }, 3000);
    } catch (_error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start demo mode';
      
      console.error('Failed to start demo:', error);
      
      // Show error notification
      toast.error('Demo Failed', {
        description: errorMessage,
      });
      
      setState({ isRunning: false, error: errorMessage });
    }
  }, []);

  /**
   * Clean up a demo session
   * 
   * Requirement 10.3: DemoManager handles API calls and error handling
   * 
   * @param sessionId - Demo session ID to clean up
   */
  const cleanupDemo = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch('/api/demo/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cleanup demo');
      }

      const _data = await response.json();

      toast.success('Demo Cleaned Up', {
        description: `Removed ${data.deletedCount} demo entities`,
      });
    } catch (_error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cleanup demo';
      
      console.error('Failed to cleanup demo:', error);
      
      toast.error('Cleanup Failed', {
        description: errorMessage,
      });
    }
  }, []);

  return {
    state,
    startDemo,
    cleanupDemo,
  };
}
