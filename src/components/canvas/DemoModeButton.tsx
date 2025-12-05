'use client';

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoManager } from '@/hooks/useDemoManager';

interface DemoModeButtonProps {
  canvasId: string;
  className?: string;
}

/**
 * DemoModeButton Component
 * 
 * Triggers automated demo mode that spawns entities and executes workflows.
 * Shows loading state while demo is initializing.
 * 
 * This component follows the Single Responsibility Principle by delegating
 * all demo orchestration logic to the DemoManager via the useDemoManager hook.
 * The button only handles UI rendering and user interactions.
 * 
 * Requirements: 6.1, 6.4, 6.5, 10.2, 10.4, 10.5, 13.4, 13.5
 * 
 * Visual Result: Click button to see automated demo with entities moving
 */
export function DemoModeButton({ canvasId, className = '' }: DemoModeButtonProps) {
  // Requirement 10.2: DemoModeButton delegates to DemoManager
  const { state, startDemo } = useDemoManager();

  // Requirement 10.4: Button only handles UI rendering and user interactions
  const handleClick = () => {
    // Requirement 6.1: User activates demo mode
    // Requirement 10.2: Delegate to DemoManager
    startDemo(canvasId, 2000);
  };

  // Requirement 10.4: Component only handles UI rendering
  return (
    <Button
      onClick={handleClick}
      disabled={state.isRunning}
      variant="default"
      size="sm"
      className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg ${className}`}
      title="Start automated demo with sample entities"
    >
      {state.isRunning ? (
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
