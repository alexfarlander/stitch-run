'use client';

import { useState, useEffect } from 'react';
import { Trash2, Play, Square, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasEvent } from '@/hooks/useCanvasEvents';
import { toast } from 'sonner';

interface EventsLogPanelProps {
  events: CanvasEvent[];
  onClear: () => void;
}

/**
 * EventsLogPanel Component
 * 
 * Displays a real-time log of canvas events with integrated demo controls.
 * Features a prominent Play/Stop button for the clockwork demo.
 */
export function EventsLogPanel({ events, onClear }: EventsLogPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  // Check demo status on mount and auto-reset if not running
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        const response = await fetch('/api/demo/stop', { method: 'GET' });
        if (response.ok) {
          const status = await response.json();
          setIsRunning(status.isRunning);
          setLoopCount(status.loopCount || 0);
          
          // Auto-reset entities to blank state on page load if demo isn't running
          if (!status.isRunning) {
            await fetch('/api/demo/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch {
        // Ignore errors
      }
    };
    initializeDemo();
  }, []);

  const handlePlayClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to start demo');
      
      setIsRunning(true);
      setLoopCount(1);
      toast.success('Demo started!');
    } catch (error) {
      console.error('Failed to start demo:', error);
      toast.error('Failed to start demo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/demo/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to stop demo');

      const result = await response.json();
      setIsRunning(false);
      setLoopCount(0);
      toast.info(`Demo stopped after ${result.loopsCompleted || 0} loops`);
    } catch (error) {
      console.error('Failed to stop demo:', error);
      toast.error('Failed to stop demo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetClick = async () => {
    setIsLoading(true);
    try {
      if (isRunning) {
        await fetch('/api/demo/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        setIsRunning(false);
      }
      
      await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setLoopCount(0);
      onClear(); // Clear events too
      toast.success('Demo reset');
    } catch (error) {
      console.error('Failed to reset demo:', error);
      toast.error('Failed to reset demo');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventColor = (type: CanvasEvent['type']) => {
    switch (type) {
      case 'node_activated':
        return 'border-l-green-500';
      case 'entity_moved':
        return 'border-l-cyan-500';
      case 'edge_fired':
        return 'border-l-purple-500';
      case 'webhook_received':
        return 'border-l-amber-500';
      case 'demo_started':
        return 'border-l-blue-500';
      case 'demo_stopped':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Demo Controls - Big Play Button */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* Big Play/Stop Button */}
          <Button
            onClick={isRunning ? handleStopClick : handlePlayClick}
            disabled={isLoading}
            className={`flex-1 h-14 text-lg font-semibold rounded-xl transition-all ${
              isRunning
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isRunning ? (
              <>
                <Square className="w-5 h-5 mr-2" fill="currentColor" />
                Stop Demo
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-2" fill="currentColor" />
                Play Demo
              </>
            )}
          </Button>
          
          {/* Reset Button */}
          <Button
            onClick={handleResetClick}
            disabled={isLoading}
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-xl border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
            title="Reset demo"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Status indicator */}
        {isRunning && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-cyan-400">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Running • Loop {loopCount}</span>
          </div>
        )}
      </div>

      {/* Events Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          Event Log ({events.length})
        </span>
        {events.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-xs">No events yet</p>
              <p className="text-xs mt-1 text-gray-600">
                Click Play to start the demo
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`
                  px-3 py-2 rounded-md bg-gray-800/50
                  border-l-2 ${getEventColor(event.type)}
                  transition-all duration-200
                  hover:bg-gray-800
                `}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{event.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 leading-tight">
                      {event.description}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {formatTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
