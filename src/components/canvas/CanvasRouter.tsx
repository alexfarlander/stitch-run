/**
 * CanvasRouter - Orchestrates canvas view switching with smooth transitions
 * Handles navigation state, data fetching, and view rendering
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useFlow } from '@/hooks/useFlow';
import { BMCCanvas } from './BMCCanvas';
import { WorkflowCanvas } from './WorkflowCanvas';
import { CanvasBreadcrumbs } from './CanvasBreadcrumbs';

interface CanvasRouterProps {
  initialFlowId: string;
  runId?: string;
}

/**
 * Frankenstein Skeleton Loader
 * Electric-themed loading state with pulsing animations
 */
function FrankensteinLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        {/* Electric spark animation */}
        <div className="relative">
          <Zap className="w-16 h-16 text-cyan-400 animate-pulse" />
          <div className="absolute inset-0 animate-ping">
            <Zap className="w-16 h-16 text-cyan-400 opacity-20" />
          </div>
        </div>

        {/* Loading text */}
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <p className="text-lg font-medium text-slate-300">
            Charging the canvas...
          </p>
        </div>

        {/* Electric bars */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-12 bg-cyan-500/30 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error State
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
          <Zap className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-200">
          Circuit Overload
        </h2>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * DetailCanvas - Placeholder for detail canvas view
 * Includes back navigation button
 */
function DetailCanvas() {
  const { goBack, canGoBack } = useCanvasNavigation();
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 relative">
      {/* Back to Surface button */}
      {canGoBack && (
        <button
          onClick={goBack}
          className="
            absolute top-4 left-4 z-10
            flex items-center gap-2 px-4 py-2
            bg-slate-900/90 hover:bg-slate-800
            border border-slate-700 hover:border-cyan-500
            rounded-lg
            text-sm font-medium text-slate-300 hover:text-cyan-400
            transition-all duration-200
            backdrop-blur-sm
            shadow-lg
          "
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Surface
        </button>
      )}
      
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-300 mb-2">
          Detail Canvas
        </h2>
        <p className="text-slate-500">Coming soon...</p>
      </div>
    </div>
  );
}

/**
 * Canvas Router Component
 */
export function CanvasRouter({ initialFlowId, runId }: CanvasRouterProps) {
  const { currentCanvasId, direction, hydrateFromDatabase } = useCanvasNavigation();
  
  // Use currentCanvasId if available, otherwise use initialFlowId
  const activeCanvasId = currentCanvasId || initialFlowId;
  
  // Fetch flow data with caching
  const { flow, loading, error } = useFlow(activeCanvasId, false);

  // Hydrate navigation on mount
  useEffect(() => {
    hydrateFromDatabase(initialFlowId);
  }, [initialFlowId, hydrateFromDatabase]);

  // Loading state
  if (loading) {
    return <FrankensteinLoader />;
  }

  // Error state
  if (error || !flow) {
    return (
      <ErrorState 
        message={error || 'Canvas not found. The flow may have been deleted.'} 
      />
    );
  }

  // Determine which canvas to render
  const renderCanvas = () => {
    switch (flow.canvas_type) {
      case 'bmc':
        return <BMCCanvas key={flow.id} flow={flow} />;
      
      case 'workflow':
        return <WorkflowCanvas key={flow.id} flow={flow} runId={runId} />;
      
      case 'detail':
        return <DetailCanvas key={flow.id} />;
      
      default:
        return <WorkflowCanvas key={flow.id} flow={flow} runId={runId} />;
    }
  };

  // Get animation props based on navigation direction
  const getAnimationProps = () => {
    if (direction === 'in') {
      // Drilling in: zoom from large to normal (diving in effect)
      return {
        initial: { scale: 2, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.5, opacity: 0 }
      };
    } else if (direction === 'out') {
      // Going back: zoom from small to normal (surfacing effect)
      return {
        initial: { scale: 0.5, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 2, opacity: 0 }
      };
    } else {
      // Default/initial load: simple fade
      return {
        initial: { scale: 1, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1, opacity: 0 }
      };
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950">
      {/* Breadcrumbs */}
      <CanvasBreadcrumbs />
      
      {/* Canvas View with Transitions */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCanvasId}
            {...getAnimationProps()}
            transition={{
              duration: 0.3,
              ease: 'easeInOut',
            }}
            className="w-full h-full"
          >
            {renderCanvas()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
