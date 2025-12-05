'use client';

import { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DemoControlPanelProps {
  className?: string;
  showAllEdges?: boolean;
  onToggleEdges?: () => void;
}

/**
 * DemoControlPanel Component
 * 
 * Provides Play/Stop, Reset, and Edge visibility controls for the Clockwork Canvas.
 * Demo runs in continuous loop until stopped.
 * Positioned at top-left of canvas in a vertical, stylish layout.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5, 14.1, 14.2, 14.3, 14.4
 */
export function DemoControlPanel({ 
  className = '', 
  showAllEdges = false, 
  onToggleEdges 
}: DemoControlPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  // Check demo status on mount only (no polling)
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Check if demo is already running
        const response = await fetch('/api/demo/stop', { method: 'GET' });
        if (response.ok) {
          const status = await response.json();
          setIsRunning(status.isRunning);
          setLoopCount(status.loopCount || 0);
          
          // If demo is NOT running, reset entities to blank state on page load
          if (!status.isRunning) {
            await fetch('/api/demo/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch {
        // Ignore errors on status check
      }
    };
    
    initializeDemo();
  }, []); // Run once on mount

  const handlePlayClick = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to start demo');
      }

      await response.json();
      setIsRunning(true);
      setLoopCount(1);
      
      toast.success('Demo started!', {
        description: 'Running in continuous loop. Click Stop to end.',
      });
      
    } catch (_error) {
      console.error('Failed to start demo:', error);
      toast.error('Failed to start demo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopClick = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/demo/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to stop demo');
      }

      const result = await response.json();
      setIsRunning(false);
      setLoopCount(0);
      
      toast.info('Demo stopped', {
        description: `Completed ${result.loopsCompleted || 0} loops`,
      });
      
    } catch (_error) {
      console.error('Failed to stop demo:', error);
      toast.error('Failed to stop demo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetClick = async () => {
    try {
      setIsLoading(true);
      
      // Stop demo first if running
      if (isRunning) {
        await fetch('/api/demo/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        setIsRunning(false);
      }
      
      const response = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reset demo');
      }

      setLoopCount(0);
      toast.success('Demo reset successfully');
      
    } catch (_error) {
      console.error('Failed to reset demo:', error);
      toast.error('Failed to reset demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`fixed top-20 left-4 z-50 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 shadow-2xl ${className}`}
    >
      {/* Status indicator - shows when running */}
      {isRunning && (
        <div className="flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-cyan-400 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-medium">Loop {loopCount || 1}</span>
        </div>
      )}
      
      {/* Play/Stop Button */}
      <Button
        onClick={isRunning ? handleStopClick : handlePlayClick}
        disabled={isLoading}
        variant="ghost"
        size="icon"
        className={`w-10 h-10 rounded-lg transition-all duration-200 ${
          isRunning
            ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30 border border-red-500/30 text-red-400 hover:text-red-300'
            : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300'
        }`}
        title={isRunning ? 'Stop demo' : 'Start demo'}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : isRunning ? (
          <Square size={16} fill="currentColor" />
        ) : (
          <Play size={18} />
        )}
      </Button>

      {/* Reset Button */}
      <Button
        onClick={handleResetClick}
        disabled={isLoading}
        variant="ghost"
        size="icon"
        className="w-10 h-10 hover:bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-slate-300 rounded-lg transition-all duration-200"
        title="Reset demo"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <RotateCcw size={18} />
        )}
      </Button>

      {/* Divider */}
      <div className="h-px bg-slate-700/50 mx-1" />

      {/* Edges Toggle Button */}
      {onToggleEdges && (
        <Button
          onClick={onToggleEdges}
          variant="ghost"
          size="icon"
          className={`w-10 h-10 rounded-lg transition-all duration-200 ${
            showAllEdges 
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300' 
              : 'hover:bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-slate-300'
          }`}
          title={showAllEdges ? 'Hide edges' : 'Show all edges'}
        >
          {showAllEdges ? <Eye size={18} /> : <EyeOff size={18} />}
        </Button>
      )}
    </div>
  );
}
