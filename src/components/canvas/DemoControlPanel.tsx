'use client';

import { useState } from 'react';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DemoControlPanelProps {
  className?: string;
}

/**
 * DemoControlPanel Component
 * 
 * Provides Play and Reset controls for the Clockwork Canvas demo orchestrator.
 * Positioned at bottom-left of canvas to control demo flow without obscuring content.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5, 14.1, 14.2, 14.3, 14.4
 * 
 * Visual Result: Fixed control panel with Play/Reset buttons for demo orchestration
 */
export function DemoControlPanel({ className = '' }: DemoControlPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Requirement 6.1: Play button executes scripted sequence of webhook calls
  // Requirement 14.2: Disable Play button while demo is running
  const handlePlayClick = async () => {
    try {
      setIsRunning(true);
      
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to start demo');
      }

      const result = await response.json();
      
      toast.success('Demo started!', {
        description: `Running ${result.events} events over ${Math.round(result.duration / 1000)}s`,
      });

      // Keep running state for the duration of the demo
      setTimeout(() => {
        setIsRunning(false);
        toast.info('Demo completed');
      }, result.duration);
      
    } catch (error) {
      console.error('Failed to start demo:', error);
      toast.error('Failed to start demo');
      setIsRunning(false);
    }
  };

  // Requirement 6.3: Reset button restores all entities to initial positions
  // Requirement 14.3: Reset button calls the reset API endpoint
  const handleResetClick = async () => {
    try {
      setIsResetting(true);
      
      const response = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reset demo');
      }

      toast.success('Demo reset successfully');
      
    } catch (error) {
      console.error('Failed to reset demo:', error);
      toast.error('Failed to reset demo');
    } finally {
      setIsResetting(false);
    }
  };

  // Requirement 14.5: Position panel in fixed location that doesn't obscure canvas
  return (
    <div 
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl ${className}`}
    >
      {/* Requirement 6.2: Show "Demo running..." status when active */}
      {isRunning && (
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Loader2 className="animate-spin" size={16} />
          <span className="font-medium">Demo running...</span>
        </div>
      )}
      
      {/* Requirement 14.1: Display Demo Control Panel with Play and Reset buttons */}
      {/* Requirement 14.2: Disable Play button while demo is running */}
      <Button
        onClick={handlePlayClick}
        disabled={isRunning || isResetting}
        variant="default"
        size="sm"
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
        title="Start automated demo sequence"
      >
        {isRunning ? (
          <>
            <Loader2 className="animate-spin" />
            Playing
          </>
        ) : (
          <>
            <Play />
            Play Demo
          </>
        )}
      </Button>

      <Button
        onClick={handleResetClick}
        disabled={isRunning || isResetting}
        variant="outline"
        size="sm"
        className="border-slate-600 hover:bg-slate-800 text-white"
        title="Reset all entities to initial positions"
      >
        {isResetting ? (
          <>
            <Loader2 className="animate-spin" />
            Resetting
          </>
        ) : (
          <>
            <RotateCcw />
            Reset
          </>
        )}
      </Button>
    </div>
  );
}
