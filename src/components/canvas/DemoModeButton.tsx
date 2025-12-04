'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DemoModeButtonProps {
  canvasId: string;
  className?: string;
}

interface StartDemoResponse {
  sessionId: string;
  status: 'running';
  entities: Array<{
    id: string;
    name: string;
    nodeId: string;
  }>;
  runs: Array<{
    entityId: string;
    runId: string;
  }>;
}

/**
 * DemoModeButton Component
 * 
 * Triggers automated demo mode that spawns entities and executes workflows.
 * Shows loading state while demo is initializing.
 * 
 * Requirements: 6.1, 6.4, 6.5, 13.4, 13.5
 * 
 * Visual Result: Click button to see automated demo with entities moving
 */
export function DemoModeButton({ canvasId, className = '' }: DemoModeButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const startDemo = async () => {
    // Requirement 6.1: User activates demo mode
    setIsRunning(true);

    try {
      // Call demo API (Requirement 13.4)
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasId,
          // Use default entities (Monica, Ross, Rachel)
          // with staggered delays
          staggerDelay: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start demo');
      }

      const data: StartDemoResponse = await response.json();

      // Show success message (Requirement 13.5)
      toast.success('Demo Started!', {
        description: `Spawned ${data.entities.length} demo entities. Watch them move through the canvas!`,
      });

      // Keep button in loading state for a moment to show demo is running
      // Then reset after entities are spawned (Requirement 6.5)
      setTimeout(() => {
        setIsRunning(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to start demo:', error);
      
      // Show error message
      toast.error('Demo Failed', {
        description: error instanceof Error ? error.message : 'Failed to start demo mode',
      });
      
      setIsRunning(false);
    }
  };

  return (
    <Button
      onClick={startDemo}
      disabled={isRunning}
      variant="default"
      size="sm"
      className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg ${className}`}
      title="Start automated demo with sample entities"
    >
      {isRunning ? (
        <>
          <Loader2 className="animate-spin" />
          Demo Running...
        </>
      ) : (
        <>
          <Play />
          Start Demo
        </>
      )}
    </Button>
  );
}
