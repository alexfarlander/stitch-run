/**
 * CanvasRouter - Orchestrates canvas view switching with smooth transitions
 * Handles navigation state, data fetching, and view rendering
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';
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
 * Placeholder for detail canvas (future implementation)
 */
function DetailCanvas() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
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
  const { currentCanvasId, hydrateFromDatabase } = useCanvasNavigation();
  
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

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950">
      {/* Breadcrumbs */}
      <CanvasBreadcrumbs />
      
      {/* Canvas View with Transitions */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCanvasId}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
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
